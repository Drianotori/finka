/** Ekspor CSV untuk bendahara/auditor. Pemisah ';' (Excel Indonesia), UTF-8 + BOM, anti-injeksi rumus. */
import { Router } from 'express'
import { db, saldoSiswa } from '../../db.js'
import { wajibLogin } from '../../middleware/auth.js'
import { hanyaAdmin } from '../../middleware/role.js'
import { audit } from '../../audit.js'
import { ringkas, tanggalValid } from '../laporan.js'

export const adminEksporRouter = Router()

const netralkan = (v) => (/^[=+\-@\t\r]/.test(v) ? "'" + v : v)
const esc = (v) => { const s = netralkan(String(v ?? '')); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
export const buatCsv = (baris) => '﻿' + baris.map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n'
function kirim(res, nama, baris) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${nama}"`)
  res.send(buatCsv(baris))
}
const hariIni = async () => (await db.prepare("SELECT date('now','+7 hours') AS d").get()).d
async function rentang(req, res, maksHari) {
  const sampai = tanggalValid(String(req.query.sampai || '')) ? String(req.query.sampai) : await hariIni()
  const dari = tanggalValid(String(req.query.dari || '')) ? String(req.query.dari) : sampai
  const selisih = (await db.prepare('SELECT (?::date - ?::date) AS n').get(sampai, dari)).n
  if (Number(selisih) < 0) { res.status(400).json({ error: 'Tanggal "dari" harus sebelum atau sama dengan "sampai"' }); return null }
  if (Number(selisih) > maksHari) { res.status(400).json({ error: `Rentang maksimal ${maksHari} hari` }); return null }
  return { dari, sampai }
}
const TIPE = { topup: 'Isi saldo', pembelian: 'Belanja', tarik_tunai: 'Tarik tunai', bayar_tagihan: 'Bayar tagihan', penyesuaian: 'Penyesuaian' }

adminEksporRouter.get('/ekspor/transaksi.csv', wajibLogin, hanyaAdmin, async (req, res) => {
  const r = await rentang(req, res, 366); if (!r) return
  const rows = await db.prepare(`
    SELECT to_char(l.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS waktu,
           s.nama AS siswa, sp.nis, sp.kelas, l.tipe, l.nominal, l.keterangan, o.nama AS oleh, o.outlet,
           (p.id IS NOT NULL) AS dibatalkan
    FROM ledger l
    JOIN users s ON s.id = l.siswa_id
    LEFT JOIN siswa_profil sp ON sp.user_id = l.siswa_id
    LEFT JOIN users o ON o.id = l.dibuat_oleh
    LEFT JOIN pembatalan p ON p.ledger_id = l.id
    WHERE (l.created_at::timestamptz + INTERVAL '7 hours')::date BETWEEN ?::date AND ?::date
    ORDER BY l.id`).all(r.dari, r.sampai)
  await audit(req, 'EKSPOR_CSV', `transaksi ${r.dari}..${r.sampai} · ${rows.length} baris`)
  kirim(res, `finka-transaksi-${r.dari}_${r.sampai}.csv`, [
    ['Waktu (WIB)', 'Siswa', 'NIS', 'Kelas', 'Jenis', 'Nominal', 'Keterangan', 'Diproses oleh', 'Outlet', 'Dibatalkan'],
    ...rows.map((x) => [x.waktu, x.siswa, x.nis, x.kelas, TIPE[x.tipe] || x.tipe, x.nominal, x.keterangan, x.oleh, x.outlet, x.dibatalkan ? 'Ya' : ''])
  ])
})

adminEksporRouter.get('/ekspor/tagihan.csv', wajibLogin, hanyaAdmin, async (req, res) => {
  const bulan = /^\d{4}-\d{2}$/.test(String(req.query.bulan || '')) ? String(req.query.bulan) : null
  const rows = await db.prepare(`
    SELECT t.id, s.nama AS siswa, sp.nis, sp.kelas, t.nama, t.nominal, t.status, t.jatuh_tempo, t.batal_alasan,
           to_char(t.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS terbit
    FROM tagihan t JOIN users s ON s.id = t.siswa_id LEFT JOIN siswa_profil sp ON sp.user_id = t.siswa_id
    ${bulan ? "WHERE strftime('%Y-%m', t.created_at) = ?" : ''} ORDER BY t.id`).all(...(bulan ? [bulan] : []))
  const ST = { belum_bayar: 'Belum bayar', lunas: 'Lunas', batal: 'Dibatalkan' }
  await audit(req, 'EKSPOR_CSV', `tagihan ${bulan || 'semua'} · ${rows.length} baris`)
  kirim(res, `finka-tagihan-${bulan || 'semua'}.csv`, [
    ['ID', 'Siswa', 'NIS', 'Kelas', 'Tagihan', 'Nominal', 'Status', 'Jatuh tempo', 'Tanggal terbit', 'Alasan batal'],
    ...rows.map((x) => [x.id, x.siswa, x.nis, x.kelas, x.nama, x.nominal, ST[x.status] || x.status, x.jatuh_tempo ? String(x.jatuh_tempo).slice(0, 10) : '', x.terbit, x.batal_alasan])
  ])
})

adminEksporRouter.get('/ekspor/rekap-harian.csv', wajibLogin, hanyaAdmin, async (req, res) => {
  const r = await rentang(req, res, 93); if (!r) return
  const hari = (await db.prepare("SELECT to_char(g::date, 'YYYY-MM-DD') AS d FROM generate_series(?::date, ?::date, interval '1 day') g").all(r.dari, r.sampai)).map((x) => x.d)
  const baris = [['Tanggal', 'Uang masuk', 'Uang keluar', 'Perubahan saldo', 'Koreksi saldo (+)', 'Koreksi saldo (-)', 'Selisih rekonsiliasi', 'Jumlah transaksi']]
  for (const d of hari) {
    const x = await ringkas(d)
    baris.push([d, x.uang_masuk, x.uang_keluar, x.perubahan_saldo_agregat, x.koreksi_tambah, x.koreksi_kurang, x.selisih, x.transaksi_ledger + x.transaksi_tagihan])
  }
  await audit(req, 'EKSPOR_CSV', `rekap harian ${r.dari}..${r.sampai}`)
  kirim(res, `finka-rekap-harian-${r.dari}_${r.sampai}.csv`, baris)
})

adminEksporRouter.get('/ekspor/saldo-siswa.csv', wajibLogin, hanyaAdmin, async (req, res) => {
  const siswa = await db.prepare("SELECT u.id, u.nama, u.active, sp.nis, sp.kelas FROM users u LEFT JOIN siswa_profil sp ON sp.user_id = u.id WHERE u.role = 'siswa' ORDER BY sp.kelas, u.nama").all()
  const baris = [['Siswa', 'NIS', 'Kelas', 'Status akun', 'Saldo']]
  let total = 0
  for (const s of siswa) { const v = await saldoSiswa(s.id); total += v; baris.push([s.nama, s.nis, s.kelas, Number(s.active) === 1 ? 'Aktif' : 'Nonaktif', v]) }
  baris.push(['TOTAL SALDO MENGENDAP', '', '', '', total])
  await audit(req, 'EKSPOR_CSV', `saldo siswa · ${siswa.length} siswa`)
  kirim(res, `finka-saldo-siswa-${await hariIni()}.csv`, baris)
})
