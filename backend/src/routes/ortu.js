/**
 * Route khusus akun Orang Tua.
 *
 * File ini menangani data yang boleh dilihat orang tua:
 * - daftar anak dan saldo;
 * - riwayat top-up/pembayaran;
 * - notifikasi status pembayaran.
 *
 * Validasi kepemilikan tetap dilakukan berdasarkan req.user.id dari JWT.
 */
import { Router } from 'express'
import { db, saldoSiswa } from '../db.js'
import { wajibLogin, wajibRole } from '../middleware/auth.js'
import bcrypt from 'bcryptjs'
import { audit } from '../audit.js'
import { bukaKunciPin } from '../pin.js'
import { buatPinAwal } from './admin/helpers.js'
import { ambilKontrol, LIMIT_MIN, LIMIT_MAKS } from '../kontrol.js'

export const ortuRouter = Router()

ortuRouter.get('/anak-anak', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const rows = await db.prepare(
    `SELECT s.id, s.nama, p.kelas, p.nis
     FROM siswa_profil p JOIN users s ON s.id = p.user_id
     WHERE p.ortu_id = ?
     ORDER BY s.id ASC`
  ).all(req.user.id)

  const anak = await Promise.all(rows.map(async (r) => ({ ...r, saldo: await saldoSiswa(r.id) })))
  res.json({ anak })
})


async function anakMilikOrtu(siswaId, ortuId) {
  return !!(await db.prepare('SELECT 1 AS ok FROM siswa_profil WHERE user_id = ? AND ortu_id = ?').get(siswaId, ortuId))
}

// Kontrol dompet anak: limit harian & blokir kartu.
ortuRouter.get('/anak/:id/kontrol', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const siswaId = Number(req.params.id)
  if (!Number.isInteger(siswaId) || !(await anakMilikOrtu(siswaId, req.user.id))) return res.status(403).json({ error: 'Bukan anak dari akun ini' })
  res.json(await ambilKontrol(siswaId))
})

ortuRouter.put('/anak/:id/kontrol', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const siswaId = Number(req.params.id)
  if (!Number.isInteger(siswaId) || !(await anakMilikOrtu(siswaId, req.user.id))) return res.status(403).json({ error: 'Bukan anak dari akun ini' })
  const { limit_aktif, limit, kartu_diblokir } = req.body || {}
  const set = []; const val = []
  if (limit_aktif !== undefined) { if (typeof limit_aktif !== 'boolean') return res.status(400).json({ error: 'limit_aktif harus true/false' }); set.push('limit_harian_aktif = ?'); val.push(limit_aktif) }
  if (kartu_diblokir !== undefined) { if (typeof kartu_diblokir !== 'boolean') return res.status(400).json({ error: 'kartu_diblokir harus true/false' }); set.push('kartu_diblokir = ?'); val.push(kartu_diblokir) }
  if (limit !== undefined) {
    const n = Number(limit)
    if (!Number.isInteger(n) || n < LIMIT_MIN || n > LIMIT_MAKS) return res.status(400).json({ error: `Limit harian harus antara Rp ${LIMIT_MIN.toLocaleString('id-ID')} dan Rp ${LIMIT_MAKS.toLocaleString('id-ID')}` })
    set.push('limit_harian = ?'); val.push(n)
  }
  if (!set.length) return res.status(400).json({ error: 'Tidak ada perubahan' })
  await db.prepare(`UPDATE siswa_profil SET ${set.join(', ')} WHERE user_id = ?`).run(...val, siswaId)
  await audit(req, 'UBAH_KONTROL_ORTU', `Siswa #${siswaId} · ${JSON.stringify({ limit_aktif, limit, kartu_diblokir })}`, 'siswa_profil', siswaId)
  res.json(await ambilKontrol(siswaId))
})

// Orang tua membuatkan PIN POS baru untuk anaknya (lupa/terkunci). PIN acak 6 digit
// hanya dikembalikan SEKALI; PIN lama tidak berlaku dan kunci percobaan dibuka.
// Dibatasi 5x per anak per 24 jam supaya tidak dipakai menebak/merusak.
const RESET_PIN_MAKS_24J = 5
ortuRouter.post('/anak/:id/reset-pin', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const siswaId = Number(req.params.id)
  if (!Number.isInteger(siswaId) || !(await anakMilikOrtu(siswaId, req.user.id))) return res.status(403).json({ error: 'Bukan anak dari akun ini' })
  const siswa = await db.prepare("SELECT id, nama, active FROM users WHERE id = ? AND role = 'siswa'").get(siswaId)
  if (!siswa || Number(siswa.active) !== 1) return res.status(404).json({ error: 'Akun siswa tidak aktif atau tidak ditemukan' })
  const n = Number((await db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE aksi = 'RESET_PIN_ORTU' AND ref_id = ? AND created_at > NOW() - INTERVAL '24 hours'").get(siswaId)).n)
  if (n >= RESET_PIN_MAKS_24J) return res.status(429).json({ error: `PIN anak sudah direset ${RESET_PIN_MAKS_24J} kali dalam 24 jam. Hubungi admin sekolah bila masih bermasalah.` })
  const pin = buatPinAwal()
  await db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(bcrypt.hashSync(pin, 10), siswaId)
  await bukaKunciPin(siswaId)
  await audit(req, 'RESET_PIN_ORTU', `Siswa #${siswaId} · ${siswa.nama}`, 'users', siswaId)
  res.json({ ok: true, siswa_id: siswaId, nama: siswa.nama, pin })
})

function statusLabel(status) {
  return status === 'menunggu' ? 'Menunggu verifikasi' : status === 'disetujui' ? 'Diterima' : 'Ditolak'
}

// Riwayat transfer orang tua: mencakup isi saldo dan pembayaran tagihan.
ortuRouter.get('/riwayat-pembayaran', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const rows = await db.prepare(`
    SELECT t.*, s.nama AS siswa_nama, b.nama AS tagihan_nama
    FROM topup_request t
    JOIN users s ON s.id = t.siswa_id
    LEFT JOIN tagihan b ON b.id = t.tagihan_id
    WHERE t.ortu_id = ?
    ORDER BY t.id DESC
    LIMIT 100
  `).all(req.user.id)

  const directRows = await db.prepare(`
    SELECT l.id, l.siswa_id, s.nama AS siswa_nama, l.nominal, l.created_at, b.nama AS tagihan_nama
    FROM ledger l
    JOIN users s ON s.id = l.siswa_id
    JOIN siswa_profil sp ON sp.user_id = l.siswa_id
    JOIN tagihan b ON b.id = l.ref_id
    WHERE sp.ortu_id = ? AND l.tipe = 'bayar_tagihan'
    ORDER BY l.id DESC
    LIMIT 100
  `).all(req.user.id)

  const mapped = rows.map(r => ({
    id: r.id,
    siswa_id: r.siswa_id,
    siswa: r.siswa_nama,
    jenis: r.tagihan_id ? 'bayar_tagihan' : 'topup',
    judul: r.tagihan_id ? 'Bayar ' + r.tagihan_nama : 'Top-up saldo',
    nominal: r.nominal,
    total_transfer: Number(r.nominal) + Number(r.kode_unik),
    kode_unik: r.kode_unik,
    tagihan_id: r.tagihan_id,
    status: r.status,
    status_label: statusLabel(r.status),
    alasan_tolak: r.alasan_tolak,
    pernah_ditolak: Number(r.pernah_ditolak || 0) === 1,
    waktu: r.created_at,
    diproses_at: r.diproses_at
  })).concat(directRows.map(r => ({
    id: 'ledger-' + r.id,
    siswa_id: r.siswa_id,
    siswa: r.siswa_nama,
    jenis: 'bayar_tagihan',
    judul: 'Bayar ' + r.tagihan_nama,
    nominal: Math.abs(Number(r.nominal)),
    total_transfer: Math.abs(Number(r.nominal)),
    kode_unik: null,
    tagihan_id: r.ref_id,
    status: 'disetujui',
    status_label: 'Diterima',
    alasan_tolak: null,
    pernah_ditolak: false,
    waktu: r.created_at,
    diproses_at: r.created_at
  }))).sort((a,b) => String(b.waktu).localeCompare(String(a.waktu))).slice(0, 100)
  res.json({ riwayat: mapped })
})

// Notifikasi status pembayaran orang tua. Data diturunkan dari request
// pembayaran agar tidak ada status UI yang berbeda dari database.
ortuRouter.get('/notifikasi', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const rows = await db.prepare(`
    SELECT t.*, s.nama AS siswa_nama, b.nama AS tagihan_nama
    FROM topup_request t
    JOIN users s ON s.id = t.siswa_id
    LEFT JOIN tagihan b ON b.id = t.tagihan_id
    WHERE t.ortu_id = ?
    ORDER BY t.id DESC
    LIMIT 50
  `).all(req.user.id)

  const directRows = await db.prepare(`
    SELECT l.id, l.siswa_id, s.nama AS siswa_nama, l.nominal, l.created_at, b.nama AS tagihan_nama, l.ref_id
    FROM ledger l
    JOIN users s ON s.id = l.siswa_id
    JOIN siswa_profil sp ON sp.user_id = l.siswa_id
    JOIN tagihan b ON b.id = l.ref_id
    WHERE sp.ortu_id = ? AND l.tipe = 'bayar_tagihan'
    ORDER BY l.id DESC
    LIMIT 50
  `).all(req.user.id)

  const notifikasi = rows.map(r => {
    const tujuan = r.tagihan_id ? ('Pembayaran ' + (r.tagihan_nama || 'tagihan')) : 'Top-up saldo'
    let judul = tujuan + ' menunggu verifikasi'
    let isi = `${r.siswa_nama}: ${Number(r.nominal).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })} masih menunggu verifikasi admin.`
    let tipe = 'pembayaran_menunggu'
    if (r.status === 'ditolak') {
      judul = tujuan + ' ditolak'
      isi = `${r.siswa_nama}: pembayaran ditolak${r.alasan_tolak ? ' — ' + r.alasan_tolak : ''}.`
      tipe = 'pembayaran_ditolak'
    } else if (r.status === 'disetujui') {
      judul = r.pernah_ditolak ? tujuan + ' diterima setelah penolakan' : tujuan + ' diterima'
      isi = `${r.siswa_nama}: ${r.pernah_ditolak ? 'pembayaran yang sebelumnya ditolak kini sudah diterima.' : 'pembayaran sudah diterima dan diproses.'}`
      tipe = r.pernah_ditolak ? 'pembayaran_diterima_kembali' : 'pembayaran_diterima'
    }
    return { id: r.id, tipe, judul, isi, waktu: r.diproses_at || r.created_at, baru: true, status: r.status, siswa_id: r.siswa_id, tagihan_id: r.tagihan_id }
  }).concat(directRows.map(r => ({
    id: 'ledger-' + r.id,
    tipe: 'pembayaran_diterima',
    judul: 'Pembayaran ' + r.tagihan_nama + ' diterima',
    isi: `${r.siswa_nama}: pembayaran tagihan sudah diproses dari saldo anak.`,
    waktu: r.created_at,
    baru: true,
    status: 'disetujui',
    siswa_id: r.siswa_id,
    tagihan_id: r.ref_id
  })))
  res.json({ notifikasi })
})

