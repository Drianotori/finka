import { Router } from 'express'
import { db, OUTLET } from '../../db.js'
import { wajibLogin } from '../../middleware/auth.js'
import { hanyaAdmin } from '../../middleware/role.js'
import { audit } from '../../audit.js'
import { TAGIHAN_MAKS } from '../../config.js'
import { ringkasTutupKas } from '../kasir.js'
import { tanggalValid, ringkas, chart14Hari } from '../laporan.js'

export const adminReportsRouter = Router()
adminReportsRouter.get('/dashboard', wajibLogin, hanyaAdmin, async (req, res) => {
  try {
    const qTanggal = String(req.query.tanggal || '')
    const tanggal = tanggalValid(qTanggal)
      ? qTanggal
      : (await db.prepare("SELECT date('now','+7 hours') AS d").get()).d

    const ringkasan = await ringkas(tanggal)

    const saldo = await db.prepare(`
      SELECT COALESCE(SUM(saldo),0) AS saldo FROM (
        SELECT u.id, COALESCE(SUM(l.nominal),0) AS saldo
        FROM users u
        LEFT JOIN ledger l ON l.siswa_id=u.id
        WHERE u.role='siswa'
        GROUP BY u.id
      )
    `).get().saldo

    const outletRows = await db.prepare(`
      SELECT u.outlet,
             COALESCE(SUM(-l.nominal),0) AS nilai,
             COUNT(*) AS transaksi
      FROM ledger l
      JOIN users u ON u.id=l.dibuat_oleh
      WHERE l.tipe='pembelian'
        AND NOT EXISTS (SELECT 1 FROM pembatalan p WHERE p.ledger_id=l.id)
        AND l.nominal<0
        AND u.role='pic'
        AND date(l.created_at,'+7 hours')=?
      GROUP BY u.outlet
    `).all(tanggal)
    const outletMap = new Map(outletRows.map(r => [r.outlet, r]))
    const outletKeys = [OUTLET.KANTIN_UTAMA, OUTLET.KANTIN_B, OUTLET.KOPERASI]
    const outlets = outletKeys.map((key) => {
      const r = outletMap.get(key)
      return { outlet:key, nilai:Number(r?.nilai || 0), transaksi:Number(r?.transaksi || 0) }
    })

    const waiting = (await db.prepare(
      "SELECT COUNT(*) AS n FROM topup_request WHERE status='menunggu'"
    ).get()).n

    res.json({
      tanggal,
      uang_masuk: ringkasan.uang_masuk,
      uang_keluar: ringkasan.uang_keluar,
      perubahan_saldo_agregat: ringkasan.perubahan_saldo_agregat,
      selisih: ringkasan.selisih,
      topup_disetujui: ringkasan.topup_disetujui,
      pembayaran_tagihan: ringkasan.pembayaran_tagihan,
      kredit_ledger: ringkasan.kredit_ledger,
      debit_ledger: ringkasan.uang_keluar - ringkasan.pembayaran_tagihan,
      selisih_topup_ledger: ringkasan.selisih_topup_ledger,
      saldo_mengendap:Number(saldo),
      transaksi_hari_ini:ringkasan.transaksi_ledger + ringkasan.transaksi_tagihan,
      transaksi_ledger:ringkasan.transaksi_ledger,
      transaksi_tagihan:ringkasan.transaksi_tagihan,
      antrean_verifikasi:Number(waiting),
      outlets,
      chart:await chart14Hari(tanggal)
    })
  } catch (e) {
    console.error('Dashboard gagal:', e)
    res.status(500).json({ error: 'Gagal mengambil dashboard' })
  }
})

adminReportsRouter.get('/tagihan-ringkasan', wajibLogin, hanyaAdmin, async (req, res) => {
  try {
    const bulan = /^\d{4}-\d{2}$/.test(String(req.query.bulan || '')) ? String(req.query.bulan) : (await db.prepare("SELECT strftime('%Y-%m','now','+7 hours') AS b").get()).b
    const total = await db.prepare(`
      SELECT COALESCE(SUM(nominal),0) AS terbit,
             COALESCE(SUM(CASE WHEN status='lunas' THEN nominal ELSE 0 END),0) AS lunas,
             COALESCE(SUM(CASE WHEN status='belum_bayar' THEN nominal ELSE 0 END),0) AS tunggakan,
             COUNT(*) AS invoice,
             SUM(CASE WHEN status='lunas' THEN 1 ELSE 0 END) AS invoice_lunas
      FROM tagihan WHERE status<>'batal' AND strftime('%Y-%m',created_at)=?
    `).get(bulan)
    const waiting = await db.prepare(`
      SELECT COALESCE(SUM(nominal),0) AS nominal, COUNT(*) AS jumlah
      FROM topup_request WHERE status='menunggu' AND tagihan_id IS NOT NULL
    `).get()
    const kelas = await db.prepare(`
      SELECT COALESCE(sp.kelas,'Tanpa kelas') AS kelas,
        COUNT(*) AS siswa,
        SUM(CASE WHEN t.status='lunas' THEN 1 ELSE 0 END) AS sudah_lunas,
        COALESCE(SUM(CASE WHEN t.status='belum_bayar' THEN t.nominal ELSE 0 END),0) AS tunggakan
      FROM tagihan t JOIN users s ON s.id=t.siswa_id
      LEFT JOIN siswa_profil sp ON sp.user_id=s.id
      WHERE t.status<>'batal' AND strftime('%Y-%m',t.created_at)=?
      GROUP BY COALESCE(sp.kelas,'Tanpa kelas') ORDER BY kelas
    `).all(bulan)
    res.json({ bulan, total: {
      terbit: Number(total.terbit || 0), lunas: Number(total.lunas || 0), tunggakan: Number(total.tunggakan || 0),
      invoice: Number(total.invoice || 0), invoice_lunas: Number(total.invoice_lunas || 0),
      menunggu_verifikasi: Number(waiting.nominal || 0), permintaan_menunggu: Number(waiting.jumlah || 0)
    }, kelas: kelas.map((r) => ({ kelas:r.kelas, siswa:Number(r.siswa), sudah_lunas:Number(r.sudah_lunas), tunggakan:Number(r.tunggakan), persen_lunas:r.siswa ? Math.round(Number(r.sudah_lunas)/Number(r.siswa)*100) : 0 })) })
  } catch (e) {
    console.error('Ringkasan tagihan gagal:', e)
    res.status(500).json({ error: 'Gagal mengambil ringkasan tagihan' })
  }
})

// Daftar invoice untuk admin (cari per siswa/nama tagihan, filter status/bulan).
adminReportsRouter.get('/tagihan', wajibLogin, hanyaAdmin, async (req, res) => {
  const bulan = /^\d{4}-\d{2}$/.test(String(req.query.bulan || '')) ? String(req.query.bulan) : null
  const status = ['belum_bayar', 'lunas', 'batal'].includes(String(req.query.status || '')) ? String(req.query.status) : null
  const q = String(req.query.q || '').trim().slice(0, 60)
  const cond = []
  const params = []
  if (bulan) { cond.push("strftime('%Y-%m',t.created_at)=?"); params.push(bulan) }
  if (status) { cond.push('t.status=?'); params.push(status) }
  if (q) { cond.push('(lower(s.nama) LIKE ? OR lower(t.nama) LIKE ?)'); params.push('%' + q.toLowerCase() + '%', '%' + q.toLowerCase() + '%') }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : ''
  const rows = await db.prepare(`
    SELECT t.id, t.nama, t.nominal, t.status, t.jatuh_tempo, t.created_at, t.batal_alasan,
           s.id AS siswa_id, s.nama AS siswa, sp.kelas,
           EXISTS (SELECT 1 FROM topup_request r WHERE r.tagihan_id=t.id AND r.status='menunggu') AS menunggu_verifikasi
    FROM tagihan t JOIN users s ON s.id=t.siswa_id
    LEFT JOIN siswa_profil sp ON sp.user_id=s.id
    ${where}
    ORDER BY t.id DESC LIMIT 200
  `).all(...params)
  res.json({ tagihan: rows.map((r) => ({ ...r, nominal: Number(r.nominal), menunggu_verifikasi: !!r.menunggu_verifikasi })) })
})

// Batalkan invoice yang salah terbit. Hanya yang belum dibayar dan tidak sedang
// menunggu verifikasi transfer. Datanya tidak dihapus (tetap tercatat, status 'batal').
adminReportsRouter.post('/tagihan/:id/batal', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const alasan = String((req.body && req.body.alasan) || '').trim()
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  if (alasan.length < 5 || alasan.length > 200) return res.status(400).json({ error: 'Alasan pembatalan wajib diisi (5-200 karakter)' })
  const trx = db.transaction(async () => {
    const t = await db.prepare('SELECT t.*, s.nama AS siswa FROM tagihan t JOIN users s ON s.id=t.siswa_id WHERE t.id=? FOR UPDATE OF t').get(id)
    if (!t) throw { code: 404, msg: 'Tagihan tidak ditemukan' }
    if (t.status === 'batal') throw { code: 409, msg: 'Tagihan sudah dibatalkan' }
    if (t.status === 'lunas') throw { code: 409, msg: 'Tagihan sudah lunas, tidak bisa dibatalkan. Gunakan koreksi saldo bila perlu mengembalikan uang.' }
    const pending = await db.prepare("SELECT 1 AS x FROM topup_request WHERE tagihan_id=? AND status='menunggu' LIMIT 1").get(id)
    if (pending) throw { code: 409, msg: 'Ada pembayaran tagihan ini yang menunggu verifikasi. Proses (terima/tolak) dulu.' }
    await db.prepare("UPDATE tagihan SET status='batal', batal_alasan=?, batal_at=now() WHERE id=?").run(alasan, id)
    return t
  })
  try {
    const t = await trx()
    await audit(req, 'BATAL_TAGIHAN', `Tagihan #${id} · ${t.siswa} · ${t.nama} · Rp ${Number(t.nominal).toLocaleString('id-ID')} · ${alasan}`, 'tagihan', id)
    res.json({ ok: true, id })
  } catch (e) {
    if (e.code) return res.status(e.code).json({ error: e.msg })
    throw e
  }
})

// Ubah invoice yang belum dibayar (nama, nominal, jatuh tempo). Yang sudah lunas/batal/sedang
// menunggu verifikasi transfer tidak boleh diubah supaya nominal transfer tetap cocok.
adminReportsRouter.put('/tagihan/:id', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const { nama, nominal, jatuh_tempo } = req.body || {}
  const nilai = Number(nominal)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  if (!String(nama || '').trim() || String(nama).length > 120 || !Number.isInteger(nilai) || nilai <= 0 || nilai > TAGIHAN_MAKS || !/^\d{4}-\d{2}-\d{2}$/.test(String(jatuh_tempo || ''))) {
    return res.status(400).json({ error: 'nama, nominal (maks Rp ' + TAGIHAN_MAKS.toLocaleString('id-ID') + '), dan jatuh_tempo (YYYY-MM-DD) wajib valid' })
  }
  const trx = db.transaction(async () => {
    const t = await db.prepare('SELECT t.*, s.nama AS siswa FROM tagihan t JOIN users s ON s.id=t.siswa_id WHERE t.id=? FOR UPDATE OF t').get(id)
    if (!t) throw { code: 404, msg: 'Tagihan tidak ditemukan' }
    if (t.status !== 'belum_bayar') throw { code: 409, msg: t.status === 'lunas' ? 'Tagihan sudah lunas, tidak bisa diubah' : 'Tagihan sudah dibatalkan, tidak bisa diubah' }
    const pending = await db.prepare("SELECT 1 AS x FROM topup_request WHERE tagihan_id=? AND status='menunggu' LIMIT 1").get(id)
    if (pending) throw { code: 409, msg: 'Ada pembayaran tagihan ini yang menunggu verifikasi. Proses (terima/tolak) dulu.' }
    await db.prepare('UPDATE tagihan SET nama=?, nominal=?, jatuh_tempo=? WHERE id=?').run(String(nama).trim(), nilai, jatuh_tempo, id)
    return t
  })
  try {
    const t = await trx()
    await audit(req, 'UBAH_TAGIHAN', `Tagihan #${id} · ${t.siswa} · ${t.nama} Rp ${Number(t.nominal).toLocaleString('id-ID')} → ${String(nama).trim()} Rp ${nilai.toLocaleString('id-ID')} · jatuh tempo ${jatuh_tempo}`, 'tagihan', id)
    res.json({ ok: true, id })
  } catch (e) {
    if (e.code) return res.status(e.code).json({ error: e.msg })
    throw e
  }
})

adminReportsRouter.post('/tagihan/bulk', wajibLogin, hanyaAdmin, async (req, res) => {
  const { nama, nominal, jatuh_tempo, siswa_ids } = req.body || {}
  const nilai = Number(nominal)
  if (!nama || !Number.isInteger(nilai) || nilai <= 0 || nilai > TAGIHAN_MAKS || !/^\d{4}-\d{2}-\d{2}$/.test(String(jatuh_tempo || '')) || !Array.isArray(siswa_ids) || !siswa_ids.length) {
    return res.status(400).json({ error: 'nama, nominal (maks Rp ' + TAGIHAN_MAKS.toLocaleString('id-ID') + '), jatuh_tempo (YYYY-MM-DD), dan siswa_ids wajib valid' })
  }
  const ids = [...new Set(siswa_ids.map(Number).filter(Number.isInteger))]
  const placeholders = ids.map(() => '?').join(',')
  const valid = await db.prepare(`SELECT id FROM users WHERE role='siswa' AND id IN (${placeholders})`).all(...ids)
  if (valid.length !== ids.length) return res.status(400).json({ error: 'Ada siswa yang tidak ditemukan' })
  try {
    const tx = db.transaction(async () => {
      const stmt = await db.prepare('INSERT INTO tagihan (siswa_id,nama,nominal,jatuh_tempo) VALUES (?,?,?,?)')
      let total = 0
      for (const id of ids) { await stmt.run(id, String(nama).trim(), nilai, jatuh_tempo); total += nilai }
      return total
    })
    const total = await tx()
    await audit(req, 'TERBIT_TAGIHAN', `${ids.length} invoice · ${String(nama).trim()} · Rp ${total.toLocaleString('id-ID')}`, 'tagihan', null)
    res.status(201).json({ ok:true, jumlah:ids.length, total, nama:String(nama).trim(), jatuh_tempo })
  } catch (e) {
    console.error('Terbit tagihan gagal:', e)
    res.status(500).json({ error: 'Gagal menerbitkan tagihan' })
  }
})

adminReportsRouter.get('/tutup-kas', wajibLogin, hanyaAdmin, async (req, res) => {
  const tanggal = tanggalValid(String(req.query.tanggal || '')) ? String(req.query.tanggal) : (await db.prepare("SELECT date('now','+7 hours') AS d").get()).d
  res.json({ tanggal, outlets: await ringkasTutupKas(tanggal) })
})

adminReportsRouter.get('/audit', wajibLogin, hanyaAdmin, async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
  const aksi = req.query.aksi ? String(req.query.aksi) : null
  const beforeId = Number(req.query.before_id) > 0 ? Number(req.query.before_id) : null
  const conditions = []
  const params = []
  if (aksi) { conditions.push('a.aksi = ?'); params.push(aksi) }
  if (beforeId) { conditions.push('a.id < ?'); params.push(beforeId) }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  params.push(limit)
  const rows = await db.prepare(`
    SELECT a.id, a.created_at, a.aksi, a.perubahan, a.ip, a.ref_tabel, a.ref_id,
           u.nama AS aktor, u.role AS peran
    FROM audit_log a LEFT JOIN users u ON u.id=a.aktor_id
    ${where} ORDER BY a.id DESC LIMIT ?
  `).all(...params)
  res.json({
    audit: rows.map((r) => ({
      id:r.id, waktu:r.created_at, aktor:r.aktor || 'Sistem', peran:r.peran || 'system',
      aksi:r.aksi, perubahan:r.perubahan, ip:r.ip || '-', ref_tabel:r.ref_tabel || '-', ref_id:r.ref_id || null
    })),
    has_more: rows.length === limit,
    next_before_id: rows.length ? rows[rows.length - 1].id : null
  })
})

adminReportsRouter.get('/audit.csv', wajibLogin, hanyaAdmin, async (req, res) => {
  const rows = await db.prepare(`SELECT a.created_at,u.nama AS aktor,u.role AS peran,a.aksi,a.perubahan,a.ip FROM audit_log a LEFT JOIN users u ON u.id=a.aktor_id ORDER BY a.id DESC`).all()
  const esc = (v) => '"' + String(v ?? '').replace(/"/g,'""') + '"'
  const csv = ['WAKTU,AKTOR,PERAN,AKSI,PERUBAHAN,IP', ...rows.map(r => [r.created_at,r.aktor || 'Sistem',r.peran || 'system',r.aksi,r.perubahan,r.ip || '-'].map(esc).join(','))].join('\n')
  res.setHeader('Content-Type','text/csv; charset=utf-8')
  res.setHeader('Content-Disposition','attachment; filename="finka-audit-log.csv"')
  res.send('﻿' + csv)
})

