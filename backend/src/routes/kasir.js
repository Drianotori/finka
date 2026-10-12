/**
 * Alat kasir (PIC): riwayat transaksi hari ini, pembatalan transaksi, dan tutup kas.
 * Ledger tidak pernah diubah/dihapus: pembatalan menulis baris pembalik
 * (tipe 'penyesuaian', nominal berlawanan) dan mencatatnya di tabel pembatalan.
 */
import { Router } from 'express'
import { db, saldoSiswa } from '../db.js'
import { wajibLogin, wajibRole } from '../middleware/auth.js'
import { audit } from '../audit.js'
import { VOID_MENIT } from '../config.js'
import { ambilKas } from '../kas.js'

export const kasirRouter = Router()

const HARI_INI = "(CURRENT_TIMESTAMP + INTERVAL '7 hours')::date"
const NAMA_OUTLET = { kantin_utama: 'Kantin Utama', kantin_b: 'Kantin Blok B', koperasi: 'Koperasi Sekolah' }

function outletDari(req) {
  return req.user.role === 'pic' ? req.user.outlet : String(req.query.outlet || '')
}

kasirRouter.get('/riwayat-hari-ini', wajibLogin, wajibRole('pic', 'admin'), async (req, res) => {
  const outlet = outletDari(req)
  if (!NAMA_OUTLET[outlet]) return res.status(400).json({ error: 'Outlet tidak valid atau akun belum terhubung ke outlet' })
  const rows = await db.prepare(`
    SELECT l.id, l.tipe, -l.nominal AS nilai, l.keterangan, l.created_at,
           s.nama AS siswa, sp.kelas, u.nama AS kasir,
           (p.id IS NOT NULL) AS dibatalkan, p.alasan AS alasan_batal,
           (l.created_at > CURRENT_TIMESTAMP - INTERVAL '${VOID_MENIT} minutes') AS dalam_jendela
    FROM ledger l
    JOIN users u ON u.id = l.dibuat_oleh
    JOIN users s ON s.id = l.siswa_id
    LEFT JOIN siswa_profil sp ON sp.user_id = l.siswa_id
    LEFT JOIN pembatalan p ON p.ledger_id = l.id
    WHERE l.tipe IN ('pembelian', 'tarik_tunai') AND u.outlet = ?
      AND (l.created_at::timestamptz + INTERVAL '7 hours')::date = ${HARI_INI}
    ORDER BY l.id DESC LIMIT 300
  `).all(outlet)
  const transaksi = rows.map((r) => ({
    id: r.id, tipe: r.tipe, nilai: Number(r.nilai), keterangan: r.keterangan, waktu: r.created_at,
    siswa: r.siswa, kelas: r.kelas, kasir: r.kasir, dibatalkan: !!r.dibatalkan, alasan_batal: r.alasan_batal || null,
    bisa_dibatalkan: !r.dibatalkan && (req.user.role === 'admin' || !!r.dalam_jendela)
  }))
  const aktif = transaksi.filter((t) => !t.dibatalkan)
  res.json({
    outlet, nama_outlet: NAMA_OUTLET[outlet], jendela_batal_menit: VOID_MENIT,
    ringkasan: {
      jumlah: aktif.length,
      penjualan: aktif.filter((t) => t.tipe === 'pembelian').reduce((a, t) => a + t.nilai, 0),
      tarik_tunai: aktif.filter((t) => t.tipe === 'tarik_tunai').reduce((a, t) => a + t.nilai, 0),
      dibatalkan: transaksi.length - aktif.length
    },
    transaksi
  })
})

kasirRouter.post('/transaksi/:id/batal', wajibLogin, wajibRole('pic', 'admin'), async (req, res) => {
  const id = Number(req.params.id)
  const alasan = String((req.body && req.body.alasan) || '').trim()
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  if (alasan.length < 3 || alasan.length > 200) return res.status(400).json({ error: 'Alasan pembatalan wajib diisi (3-200 karakter)' })
  const trx = db.transaction(async () => {
    const l = await db.prepare(`
      SELECT l.*, u.outlet AS outlet_kasir,
             (l.created_at > CURRENT_TIMESTAMP - INTERVAL '${VOID_MENIT} minutes') AS dalam_jendela
      FROM ledger l LEFT JOIN users u ON u.id = l.dibuat_oleh
      WHERE l.id = ? FOR UPDATE OF l`).get(id)
    if (!l || !['pembelian', 'tarik_tunai'].includes(l.tipe) || Number(l.nominal) >= 0) throw { code: 404, msg: 'Transaksi belanja/tarik tunai tidak ditemukan' }
    if (req.user.role === 'pic') {
      if (!req.user.outlet || l.outlet_kasir !== req.user.outlet) throw { code: 403, msg: 'Transaksi ini bukan milik outlet Anda' }
      if (!l.dalam_jendela) throw { code: 403, msg: `Batas waktu pembatalan ${VOID_MENIT} menit sudah lewat. Hubungi admin.` }
    }
    const sudah = await db.prepare('SELECT 1 AS x FROM pembatalan WHERE ledger_id = ?').get(id)
    if (sudah) throw { code: 409, msg: 'Transaksi ini sudah dibatalkan' }
    await db.prepare('SELECT id FROM users WHERE id = ? FOR UPDATE').get(l.siswa_id)
    const balik = await db.prepare(
      "INSERT INTO ledger (siswa_id, tipe, nominal, keterangan, ref_tabel, ref_id, dibuat_oleh) VALUES (?, 'penyesuaian', ?, ?, 'ledger', ?, ?)"
    ).run(l.siswa_id, -Number(l.nominal), `Pembatalan transaksi #${id}: ${alasan}`, id, req.user.id)
    await db.prepare('INSERT INTO pembatalan (ledger_id, ledger_balik_id, alasan, dibatalkan_oleh) VALUES (?, ?, ?, ?)').run(id, balik.lastInsertRowid, alasan, req.user.id)
    return l
  })
  try {
    const l = await trx()
    await audit(req, 'BATAL_TRANSAKSI', `Transaksi #${id} · siswa #${l.siswa_id} · ${l.tipe} Rp ${(-Number(l.nominal)).toLocaleString('id-ID')} · ${alasan}`, 'ledger', id)
    res.json({ ok: true, id, saldo_baru: await saldoSiswa(l.siswa_id) })
  } catch (e) {
    if (e.code) return res.status(e.code).json({ error: e.msg })
    throw e
  }
})

// --- Tutup kas
async function ambilTutup(outlet, tanggalSql) {
  return db.prepare(`SELECT * FROM tutup_kas WHERE outlet = ? AND tanggal = ${tanggalSql}`).get(outlet)
}
const bentukTutup = (r) => r && ({
  outlet: r.outlet, nama_outlet: NAMA_OUTLET[r.outlet] || r.outlet, tanggal: r.tanggal, kas_awal: Number(r.kas_awal), sudah_ditarik: Number(r.sudah_ditarik),
  diharapkan: Number(r.diharapkan), kas_fisik: Number(r.kas_fisik), selisih: Number(r.selisih), waktu: r.created_at
})

kasirRouter.get('/tutup-kas', wajibLogin, wajibRole('pic'), async (req, res) => {
  if (!req.user.outlet) return res.status(400).json({ error: 'Akun PIC belum terhubung ke outlet' })
  const kas = await ambilKas(req.user.outlet)
  res.json({ kas, ditutup: bentukTutup(await ambilTutup(req.user.outlet, HARI_INI)) || null })
})

kasirRouter.post('/tutup-kas', wajibLogin, wajibRole('pic'), async (req, res) => {
  if (!req.user.outlet) return res.status(400).json({ error: 'Akun PIC belum terhubung ke outlet' })
  const fisik = Number(req.body && req.body.kas_fisik)
  if (!Number.isInteger(fisik) || fisik < 0 || fisik > 100000000) return res.status(400).json({ error: 'Kas fisik harus bilangan bulat 0 – 100.000.000' })
  const kas = await ambilKas(req.user.outlet)
  if (kas.kas_awal === null) return res.status(409).json({ error: 'Kas awal hari ini belum diisi, jadi kas belum bisa ditutup.' })
  const diharapkan = kas.kas_awal - kas.sudah_ditarik
  const selisih = fisik - diharapkan
  await db.prepare(`
    INSERT INTO tutup_kas (outlet, tanggal, kas_awal, sudah_ditarik, diharapkan, kas_fisik, selisih, ditutup_oleh)
    VALUES (?, ${HARI_INI}, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (outlet, tanggal) DO UPDATE SET kas_awal = EXCLUDED.kas_awal, sudah_ditarik = EXCLUDED.sudah_ditarik,
      diharapkan = EXCLUDED.diharapkan, kas_fisik = EXCLUDED.kas_fisik, selisih = EXCLUDED.selisih,
      ditutup_oleh = EXCLUDED.ditutup_oleh, created_at = CURRENT_TIMESTAMP
  `).run(req.user.outlet, kas.kas_awal, kas.sudah_ditarik, diharapkan, fisik, selisih, req.user.id)
  await audit(req, 'TUTUP_KAS', `${NAMA_OUTLET[req.user.outlet]} · diharapkan Rp ${diharapkan.toLocaleString('id-ID')} · fisik Rp ${fisik.toLocaleString('id-ID')} · selisih ${selisih >= 0 ? '+' : '-'}Rp ${Math.abs(selisih).toLocaleString('id-ID')}`)
  res.json({ ok: true, ditutup: bentukTutup(await ambilTutup(req.user.outlet, HARI_INI)) })
})

// Admin: lihat penutupan kas semua outlet pada satu tanggal (default hari ini).
export async function ringkasTutupKas(tanggal) {
  const rows = await db.prepare('SELECT * FROM tutup_kas WHERE tanggal = ?').all(tanggal)
  return Object.keys(NAMA_OUTLET).map((o) => bentukTutup(rows.find((r) => r.outlet === o)) || { outlet: o, nama_outlet: NAMA_OUTLET[o], ditutup: false })
    .map((x) => (x.ditutup === false ? x : { ...x, ditutup: true }))
}
