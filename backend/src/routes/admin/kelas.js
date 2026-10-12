/**
 * Kenaikan kelas massal dan pengarsipan siswa lulus. Keduanya punya mode
 * pratinjau (simpan=false, tidak mengubah apa pun) dan mode simpan.
 */
import { Router } from 'express'
import { db, saldoSiswa } from '../../db.js'
import { wajibLogin } from '../../middleware/auth.js'
import { hanyaAdmin } from '../../middleware/role.js'
import { audit } from '../../audit.js'

export const adminKelasRouter = Router()
const rapikan = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

// Semua pemetaan dijalankan serentak (7A->8A dan 8A->9A tidak saling menimpa).
adminKelasRouter.post('/kelas/naik', wajibLogin, hanyaAdmin, async (req, res) => {
  const simpan = req.body && req.body.simpan === true
  const pemetaan = Array.isArray(req.body && req.body.pemetaan) ? req.body.pemetaan.map((p) => ({ dari: rapikan(p && p.dari), ke: rapikan(p && p.ke) })) : []
  if (!pemetaan.length || pemetaan.length > 100) return res.status(400).json({ error: 'Isi 1-100 pasang kelas (dari -> ke)' })
  const galat = []
  const dariSet = new Set()
  pemetaan.forEach((p, i) => {
    if (!p.dari || !p.ke) galat.push(`Pasangan ${i + 1}: kelas asal dan tujuan wajib diisi`)
    else if (p.dari.length > 20 || p.ke.length > 20) galat.push(`Pasangan ${i + 1}: nama kelas maksimal 20 karakter`)
    else if (p.dari === p.ke) galat.push(`Pasangan ${i + 1}: kelas tujuan sama dengan asal`)
    if (dariSet.has(p.dari)) galat.push(`Kelas asal "${p.dari}" muncul lebih dari sekali`)
    dariSet.add(p.dari)
  })
  const hitung = []
  for (const p of pemetaan) {
    const n = p.dari ? (await db.prepare('SELECT COUNT(*) AS n FROM siswa_profil WHERE kelas = ?').get(p.dari)).n : 0
    hitung.push({ ...p, siswa: Number(n) })
  }
  const kosong = hitung.filter((h) => h.siswa === 0).map((h) => h.dari)
  if (galat.length) return res.status(400).json({ error: galat[0], galat, pemetaan: hitung })
  const total = hitung.reduce((a, h) => a + h.siswa, 0)
  if (!simpan) return res.json({ ok: true, simpan: false, total_siswa: total, kelas_kosong: kosong, pemetaan: hitung })
  if (total === 0) return res.status(400).json({ error: 'Tidak ada siswa di kelas asal yang dipilih', pemetaan: hitung })

  const kasus = pemetaan.map(() => 'WHEN ? THEN ?').join(' ')
  const params = pemetaan.flatMap((p) => [p.dari, p.ke])
  const dalam = pemetaan.map(() => '?').join(',')
  const info = await db.prepare(`UPDATE siswa_profil SET kelas = CASE kelas ${kasus} END WHERE kelas IN (${dalam})`).run(...params, ...pemetaan.map((p) => p.dari))
  await audit(req, 'KENAIKAN_KELAS', hitung.map((h) => `${h.dari}→${h.ke} (${h.siswa})`).join(', ').slice(0, 480), 'siswa_profil', null)
  res.json({ ok: true, simpan: true, total_siswa: total, diubah: info.changes, pemetaan: hitung })
})

// Arsip lulusan: nonaktifkan semua siswa di satu kelas (riwayat tetap utuh).
// Akun orang tua yang semua anaknya nonaktif ikut dinonaktifkan.
adminKelasRouter.post('/kelas/arsip', wajibLogin, hanyaAdmin, async (req, res) => {
  const simpan = req.body && req.body.simpan === true
  const kelas = rapikan(req.body && req.body.kelas)
  const akuiSaldo = req.body && req.body.akui_saldo === true
  if (!kelas) return res.status(400).json({ error: 'Kelas wajib diisi' })
  const siswa = await db.prepare(`
    SELECT u.id, u.nama, u.active, sp.ortu_id
    FROM users u JOIN siswa_profil sp ON sp.user_id = u.id
    WHERE u.role = 'siswa' AND sp.kelas = ? ORDER BY u.nama`).all(kelas)
  if (!siswa.length) return res.status(404).json({ error: `Tidak ada siswa di kelas "${kelas}"` })
  let saldoTotal = 0
  let denganSaldo = 0
  for (const s of siswa) { const v = await saldoSiswa(s.id); s.saldo = v; if (v > 0) { denganSaldo++; saldoTotal += v } }
  const ids = siswa.map((s) => s.id)
  const ph = ids.map(() => '?').join(',')
  const tagihanBelum = Number((await db.prepare(`SELECT COUNT(*) AS n FROM tagihan WHERE status = 'belum_bayar' AND siswa_id IN (${ph})`).get(...ids)).n)
  const ortuIds = [...new Set(siswa.map((s) => s.ortu_id).filter(Boolean))]
  const ortuAkanNonaktif = []
  for (const oid of ortuIds) {
    const masihAktif = await db.prepare(
      `SELECT 1 AS x FROM siswa_profil sp JOIN users u ON u.id = sp.user_id
       WHERE sp.ortu_id = ? AND u.active = 1 AND u.id NOT IN (${ph}) LIMIT 1`).get(oid, ...ids)
    if (!masihAktif) ortuAkanNonaktif.push(oid)
  }
  const ringkas = {
    kelas, jumlah_siswa: siswa.length, sudah_nonaktif: siswa.filter((s) => Number(s.active) !== 1).length,
    siswa_bersaldo: denganSaldo, total_saldo: saldoTotal, tagihan_belum_dibayar: tagihanBelum, akun_ortu_ikut_nonaktif: ortuAkanNonaktif.length,
    daftar_bersaldo: siswa.filter((s) => s.saldo > 0).slice(0, 50).map((s) => ({ id: s.id, nama: s.nama, saldo: s.saldo }))
  }
  if (!simpan) return res.json({ ok: true, simpan: false, ...ringkas })
  if (denganSaldo > 0 && !akuiSaldo) {
    return res.status(409).json({ error: `${denganSaldo} siswa masih punya saldo (total Rp ${saldoTotal.toLocaleString('id-ID')}). Kembalikan/koreksi saldonya dulu, atau konfirmasi bahwa saldo tetap tercatat.`, perlu_konfirmasi_saldo: true, ...ringkas })
  }
  const trx = db.transaction(async () => {
    await db.prepare(`UPDATE users SET active = 0 WHERE id IN (${ph})`).run(...ids)
    if (ortuAkanNonaktif.length) {
      await db.prepare(`UPDATE users SET active = 0 WHERE role = 'ortu' AND id IN (${ortuAkanNonaktif.map(() => '?').join(',')})`).run(...ortuAkanNonaktif)
    }
  })
  await trx()
  await audit(req, 'ARSIP_KELAS', `${kelas} · ${siswa.length} siswa · ${ortuAkanNonaktif.length} akun orang tua · saldo tersisa Rp ${saldoTotal.toLocaleString('id-ID')}`, 'siswa_profil', null)
  res.json({ ok: true, simpan: true, ...ringkas })
})
