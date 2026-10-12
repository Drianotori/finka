/**
 * Route top-up dan pembayaran melalui transfer.
 *
 * Walaupun nama historisnya masih "topup", request dengan tagihan_id
 * juga dipakai untuk pembayaran tagihan. Status tetap diproses di backend
 * supaya frontend tidak bisa memalsukan pembayaran yang sudah diterima.
 */
import { TOPUP_MIN, TOPUP_MAKS } from '../config.js'
import { Router } from 'express'
import crypto from 'crypto'
import { db } from '../db.js'
import { wajibLogin, wajibRole } from '../middleware/auth.js'
import { audit } from '../audit.js'

export const topupRouter = Router()

async function milikOrtu(siswaId, ortuId) {
  const profil = await db.prepare('SELECT ortu_id FROM siswa_profil WHERE user_id = ?').get(siswaId)
  return profil && profil.ortu_id === ortuId
}

// Ortu mengajukan top-up — untuk saldo saku (tagihan_id kosong) ATAU untuk
// membayar satu tagihan spesifik (tagihan_id diisi, misalnya SPP). Kode
// unik digenerate server supaya nanti bisa dicocokkan otomatis dengan
// mutasi bank asli (nominal + kode_unik = jumlah transfer yang harus
// persis sama).
topupRouter.post('/', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const { siswa_id, nominal, tagihan_id } = req.body || {}
  const siswaId = Number(siswa_id)
  const nilaiNominal = Number(nominal)

  if (!Number.isInteger(siswaId) || siswaId <= 0 || !Number.isInteger(nilaiNominal) || nilaiNominal <= 0) {
    return res.status(400).json({ error: 'siswa_id dan nominal (>0) wajib diisi' })
  }
  if (!tagihan_id && (nilaiNominal < TOPUP_MIN || nilaiNominal > TOPUP_MAKS)) {
    return res.status(400).json({ error: `Nominal isi saldo minimal Rp ${TOPUP_MIN.toLocaleString('id-ID')} dan maksimal Rp ${TOPUP_MAKS.toLocaleString('id-ID')}` })
  }
  if (!(await milikOrtu(siswaId, req.user.id))) {
    return res.status(403).json({ error: 'Bukan anak dari akun ini' })
  }

  const trx = db.transaction(async () => {
    let tagihan = null

    if (tagihan_id) {
      tagihan = await db.prepare('SELECT * FROM tagihan WHERE id = ? AND siswa_id = ? FOR UPDATE').get(tagihan_id, siswaId)
      if (!tagihan) throw { code: 404, msg: 'Tagihan tidak ditemukan untuk siswa ini' }
      if (tagihan.status === 'lunas') throw { code: 409, msg: 'Tagihan sudah lunas' }
      if (tagihan.status === 'batal') throw { code: 409, msg: 'Tagihan ini sudah dibatalkan' }
      if (nilaiNominal !== Number(tagihan.nominal)) {
        throw { code: 400, msg: 'Nominal pembayaran harus sama dengan nominal tagihan' }
      }

      const pending = await db.prepare(
        `SELECT id FROM topup_request
         WHERE tagihan_id = ? AND status = 'menunggu'
         LIMIT 1`
      ).get(tagihan.id)

      if (pending) {
        throw { code: 409, msg: 'Pembayaran tagihan ini sedang menunggu verifikasi admin' }
      }
    }

    // Kode unik 100–999 dibuat dengan crypto dan dijamin tidak bentrok dengan
    // permintaan lain yang masih menunggu pada nominal yang sama, supaya
    // pencocokan transfer bank tidak ambigu.
    let kodeUnik = 0
    for (let i = 0; i < 50 && !kodeUnik; i++) {
      const calon = crypto.randomInt(100, 1000)
      const bentrok = await db.prepare(
        `SELECT 1 AS ada FROM topup_request WHERE status = 'menunggu' AND nominal = ? AND kode_unik = ? LIMIT 1`
      ).get(nilaiNominal, calon)
      if (!bentrok) kodeUnik = calon
    }
    if (!kodeUnik) throw { code: 503, msg: 'Terlalu banyak permintaan dengan nominal sama. Coba lagi sebentar lagi.' }
    const info = await db.prepare(
      `INSERT INTO topup_request (siswa_id, ortu_id, nominal, kode_unik, tagihan_id, status)
       VALUES (?, ?, ?, ?, ?, 'menunggu')`
    ).run(siswaId, req.user.id, nilaiNominal, kodeUnik, tagihan_id || null)

    await audit(
      req,
      'AJUKAN_TOPUP',
      `${siswaId} · Rp ${nilaiNominal.toLocaleString('id-ID')} · total transfer Rp ${(nilaiNominal + kodeUnik).toLocaleString('id-ID')}`,
      'topup_request',
      Number(info.lastInsertRowid)
    )

    return {
      id: info.lastInsertRowid,
      siswa_id: siswaId,
      nominal: nilaiNominal,
      kode_unik: kodeUnik,
      tagihan_id: tagihan_id || null,
      total_transfer: nilaiNominal + kodeUnik,
      status: 'menunggu'
    }
  })

  try {
    res.status(201).json(await trx())
  } catch (e) {
    res.status(e.code || 500).json({ error: e.msg || 'Gagal membuat permintaan pembayaran' })
  }
})


function baris(row) {
  if (!row) return null
  return {
    id: row.id,
    siswa_id: row.siswa_id,
    siswa: row.siswa_nama,
    kelas: row.kelas,
    ortu: row.ortu_nama,
    nominal: row.nominal,
    dasar: row.nominal,
    kode: row.kode_unik,
    kode_unik: row.kode_unik,
    tagihan_id: row.tagihan_id,
    tagihan_nama: row.tagihan_nama,
    tujuan: row.tagihan_nama ? ('Tagihan: ' + row.tagihan_nama) : 'Saldo saku',
    status: row.status,
    alasan_tolak: row.alasan_tolak,
    pernah_ditolak: Number(row.pernah_ditolak || 0) === 1,
    bukti_tersedia: !!row.bukti_data,
    bukti_nama: row.bukti_nama || null,
    bukti_mime: row.bukti_mime || null,
    bukti_ukuran: Number(row.bukti_ukuran || 0),
    waktu: row.created_at,
    diproses_at: row.diproses_at,
    cocok: true // pencocokan otomatis dgn mutasi bank asli: Fase 2, belum ada
  }
}

const SELECT_JOIN = `
  SELECT t.*, s.nama AS siswa_nama, p.kelas AS kelas, o.nama AS ortu_nama, b.nama AS tagihan_nama
  FROM topup_request t
  JOIN users s ON s.id = t.siswa_id
  LEFT JOIN siswa_profil p ON p.user_id = s.id
  JOIN users o ON o.id = t.ortu_id
  LEFT JOIN tagihan b ON b.id = t.tagihan_id
`

// Ambil bukti transfer hanya untuk pemilik pembayaran atau Admin.
topupRouter.get('/:id/proof', wajibLogin, async (req, res) => {
  const row = await db.prepare(
    `SELECT id, ortu_id, bukti_data, bukti_mime, bukti_nama, bukti_ukuran
     FROM topup_request WHERE id = ?`
  ).get(req.params.id)

  if (!row) return res.status(404).json({ error: 'Permintaan tidak ditemukan' })
  if (req.user.role !== 'admin' && Number(row.ortu_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'Tidak punya akses' })
  }
  if (!row.bukti_data) return res.status(404).json({ error: 'Bukti transfer belum diunggah' })

  res.json({
    id: row.id,
    data_url: `data:${row.bukti_mime || 'image/jpeg'};base64,${row.bukti_data}`,
    nama: row.bukti_nama || 'bukti-transfer',
    mime: row.bukti_mime || 'image/jpeg',
    ukuran: Number(row.bukti_ukuran || 0)
  })
})

// Orang tua mengunggah bukti transfer untuk request miliknya.
topupRouter.post('/:id/proof', wajibLogin, wajibRole('ortu'), async (req, res) => {
  const { data_url, nama, mime, ukuran } = req.body || {}
  const row = await db.prepare(
    `SELECT id, ortu_id, status FROM topup_request WHERE id = ?`
  ).get(req.params.id)

  if (!row) return res.status(404).json({ error: 'Permintaan tidak ditemukan' })
  if (Number(row.ortu_id) !== Number(req.user.id)) return res.status(403).json({ error: 'Tidak punya akses' })
  if (row.status !== 'menunggu') return res.status(409).json({ error: 'Pembayaran ini sudah diproses dan tidak dapat diubah' })

  if (typeof data_url !== 'string') return res.status(400).json({ error: 'Bukti transfer wajib dipilih' })
  const match = data_url.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i)
  if (!match) return res.status(400).json({ error: 'Bukti harus berupa JPG, PNG, atau WEBP' })

  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase()
  const base64 = match[2]
  const decodedSize = Buffer.from(base64, 'base64').length
  if (decodedSize <= 0 || decodedSize > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Ukuran bukti maksimal 5 MB' })
  }

  await db.prepare(
    `UPDATE topup_request
     SET bukti_data = ?, bukti_mime = ?, bukti_nama = ?, bukti_ukuran = ?
     WHERE id = ? AND ortu_id = ? AND status = 'menunggu'`
  ).run(base64, mimeType, String(nama || 'bukti-transfer').slice(0, 180), decodedSize, req.params.id, req.user.id)

  await audit(req, 'UNGGAH_BUKTI_TRANSFER', `Request #${req.params.id}`, 'topup_request', Number(req.params.id))
  res.json({ ok: true, id: Number(req.params.id), nama: String(nama || 'bukti-transfer'), mime: mimeType, ukuran: decodedSize })
})

// Antrean untuk admin — pengganti array dummy di store Vuex prototipe.
topupRouter.get('/', wajibLogin, wajibRole('admin'), async (req, res) => {
  const status = req.query.status
  const rows = status
    ? await db.prepare(SELECT_JOIN + ' WHERE t.status = ? ORDER BY t.id DESC').all(status)
    : await db.prepare(SELECT_JOIN + ' ORDER BY t.id DESC').all()
  res.json({ topup: rows.map(baris) })
})

topupRouter.get('/:id', wajibLogin, async (req, res) => {
  const row = await db.prepare(SELECT_JOIN + ' WHERE t.id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Tidak ditemukan' })
  if (req.user.role !== 'admin' && row.ortu_id !== req.user.id) {
    return res.status(403).json({ error: 'Tidak punya akses' })
  }
  res.json({ topup: baris(row) })
})

topupRouter.post('/:id/approve', wajibLogin, wajibRole('admin'), async (req, res) => {
  const id = req.params.id
  const trx = db.transaction(async () => {
    const permintaan = await db.prepare('SELECT * FROM topup_request WHERE id = ? FOR UPDATE').get(id)
    if (!permintaan) throw { code: 404, msg: 'Permintaan tidak ditemukan' }
    if (permintaan.status !== 'menunggu') throw { code: 409, msg: 'Sudah diproses sebelumnya' }
    if (permintaan.tagihan_id) {
      const tagihan = await db.prepare('SELECT * FROM tagihan WHERE id = ? FOR UPDATE').get(permintaan.tagihan_id)
      if (!tagihan || Number(tagihan.siswa_id) !== Number(permintaan.siswa_id)) throw { code: 409, msg: 'Tagihan tidak cocok dengan siswa pada permintaan' }
      if (tagihan.status === 'lunas') throw { code: 409, msg: 'Tagihan sudah lunas' }
      if (tagihan.status === 'batal') throw { code: 409, msg: 'Tagihan ini sudah dibatalkan' }
      if (Number(tagihan.nominal) !== Number(permintaan.nominal)) throw { code: 409, msg: 'Nominal transfer tidak sama dengan nominal tagihan' }
    }

    await db.prepare(
      `UPDATE topup_request SET status = 'disetujui', diproses_oleh = ?, diproses_at = datetime('now')
       WHERE id = ?`
    ).run(req.user.id, id)

    if (permintaan.tagihan_id) {
      // Transfer ini earmark utk satu tagihan spesifik — lunaskan tagihan,
      // JANGAN kredit saldo saku (uangnya tidak pernah masuk dompet jajan).
      await db.prepare(`UPDATE tagihan SET status = 'lunas' WHERE id = ?`).run(permintaan.tagihan_id)
    } else {
      const info = await db.prepare(
        `INSERT INTO ledger (siswa_id, tipe, nominal, keterangan, ref_tabel, ref_id, dibuat_oleh)
         VALUES (?, 'topup', ?, ?, 'topup_request', ?, ?)`
      ).run(permintaan.siswa_id, permintaan.nominal, 'Top-up disetujui admin', id, req.user.id)
      permintaan.ledger_id = info.lastInsertRowid
    }

    await audit(req, 'SETUJUI_TOPUP', `Request #${id} · siswa #${permintaan.siswa_id} · Rp ${Number(permintaan.nominal).toLocaleString('id-ID')}${permintaan.tagihan_id ? ' · tagihan #' + permintaan.tagihan_id : ''}`, 'topup_request', Number(id))
    return permintaan
  })

  try {
    const permintaan = await trx()
    res.json({ ok: true, siswa_id: permintaan.siswa_id, nominal: permintaan.nominal, tagihan_id: permintaan.tagihan_id, ledger_id: permintaan.ledger_id || null })
  } catch (e) {
    res.status(e.code || 500).json({ error: e.msg || 'Gagal memproses' })
  }
})

topupRouter.post('/:id/tolak', wajibLogin, wajibRole('admin'), async (req, res) => {
  const { alasan } = req.body || {}
  const info = await db.prepare(
    `UPDATE topup_request SET status = 'ditolak', alasan_tolak = ?, pernah_ditolak = 1, diproses_oleh = ?, diproses_at = datetime('now')
     WHERE id = ? AND status = 'menunggu'`
  ).run(alasan || null, req.user.id, req.params.id)

  if (info.changes === 0) return res.status(409).json({ error: 'Tidak ditemukan atau sudah diproses' })
  await audit(req, 'TOLAK_TOPUP', `Request #${req.params.id}${alasan ? ' · ' + alasan : ''}`, 'topup_request', Number(req.params.id))
  res.json({ ok: true })
})

// Admin dapat menerima kembali pembayaran yang sebelumnya ditolak, misalnya
// saat transfer baru masuk/terdeteksi belakangan. Endpoint ini sengaja hanya
// menerima status `ditolak` agar tidak ada kredit/lunas ganda.
topupRouter.post('/:id/terima-kembali', wajibLogin, wajibRole('admin'), async (req, res) => {
  const id = req.params.id
  const trx = db.transaction(async () => {
    const permintaan = await db.prepare('SELECT * FROM topup_request WHERE id = ? FOR UPDATE').get(id)
    if (!permintaan) throw { code: 404, msg: 'Permintaan tidak ditemukan' }
    if (permintaan.status !== 'ditolak') throw { code: 409, msg: 'Hanya pembayaran yang ditolak yang dapat diterima kembali' }

    if (permintaan.tagihan_id) {
      const tagihan = await db.prepare('SELECT * FROM tagihan WHERE id = ? FOR UPDATE').get(permintaan.tagihan_id)
      if (!tagihan || Number(tagihan.siswa_id) !== Number(permintaan.siswa_id)) throw { code: 409, msg: 'Tagihan tidak cocok dengan siswa pada permintaan' }
      if (tagihan.status === 'lunas') throw { code: 409, msg: 'Tagihan sudah lunas' }
      if (tagihan.status === 'batal') throw { code: 409, msg: 'Tagihan ini sudah dibatalkan' }
      if (Number(tagihan.nominal) !== Number(permintaan.nominal)) throw { code: 409, msg: 'Nominal pembayaran tidak sama dengan tagihan' }
    }

    await db.prepare(`UPDATE topup_request SET status='disetujui', diproses_oleh=?, diproses_at=datetime('now') WHERE id=?`).run(req.user.id, id)

    if (permintaan.tagihan_id) {
      await db.prepare(`UPDATE tagihan SET status='lunas' WHERE id=?`).run(permintaan.tagihan_id)
    } else {
      const info = await db.prepare(`INSERT INTO ledger (siswa_id, tipe, nominal, keterangan, ref_tabel, ref_id, dibuat_oleh) VALUES (?, 'topup', ?, ?, 'topup_request', ?, ?)`).run(
        permintaan.siswa_id, permintaan.nominal, 'Top-up diterima kembali setelah penolakan', id, req.user.id
      )
    }

    await audit(req, 'TERIMA_KEMBALI_TOPUP', `Request #${id} · pembayaran sebelumnya ditolak lalu diterima`, 'topup_request', Number(id))
    return permintaan
  })

  try {
    const permintaan = await trx()
    res.json({ ok: true, siswa_id: permintaan.siswa_id, nominal: permintaan.nominal, tagihan_id: permintaan.tagihan_id })
  } catch (e) {
    res.status(e.code || 500).json({ error: e.msg || 'Gagal menerima kembali pembayaran' })
  }
})

