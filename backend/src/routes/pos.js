/**
 * Route transaksi POS untuk PIC/outlet.
 * Semua transaksi tetap divalidasi di server. Frontend hanya mengirim
 * pilihan produk, jumlah, dan PIN sesuai alur UI.
 */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db, saldoSiswa, OUTLET, namaOutlet } from '../db.js'
import { wajibLogin, wajibRole } from '../middleware/auth.js'
import { audit } from '../audit.js'
import { QR_SECRET } from '../config.js'
import { periksaKontrol, ambilKontrol } from '../kontrol.js'
import { periksaKunciPin, catatHasilPin } from '../pin.js'
import { ambilKas, simpanKasAwal, periksaKas } from '../kas.js'

export const posRouter = Router()

const QR_TTL_SECONDS = 30

function qrHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function buatQrToken(siswaId) {
  return jwt.sign({ type: 'finka_student_qr', siswa_id: Number(siswaId) }, QR_SECRET, { expiresIn: QR_TTL_SECONDS, algorithm: 'HS256', jwtid: crypto.randomUUID() })
}

function verifikasiQrToken(token) {
  try {
    const payload = jwt.verify(String(token || ''), QR_SECRET, { algorithms: ['HS256'] })
    if (payload.type !== 'finka_student_qr' || !payload.siswa_id) return null
    return payload
  } catch { return null }
}

async function cekQrBelumDipakai(token) {
  return !await db.prepare('SELECT token_hash FROM qr_used WHERE token_hash = ?').get(qrHash(token))
}

// QR dinamis siswa: token server-side berlaku 30 detik.
posRouter.get('/qr', wajibLogin, wajibRole('siswa'), async (req, res) => {
  const siswa = await db.prepare(`SELECT u.id, u.nama, sp.kelas, sp.nis FROM users u LEFT JOIN siswa_profil sp ON sp.user_id = u.id WHERE u.id = ? AND u.role = 'siswa'`).get(req.user.id)
  if (!siswa) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
  const token = buatQrToken(siswa.id)
  const payload = jwt.decode(token)
  res.json({ token, expires_at: new Date(Number(payload.exp) * 1000).toISOString(), expires_in: QR_TTL_SECONDS, siswa: { id: siswa.id, nama: siswa.nama, kelas: siswa.kelas, nis: siswa.nis } })
})

posRouter.post('/qr/resolve', wajibLogin, wajibRole('pic'), async (req, res) => {
  const token = req.body && req.body.token
  const payload = verifikasiQrToken(token)
  if (!payload) return res.status(401).json({ error: 'QR kedaluwarsa atau tidak valid' })
  if (!await cekQrBelumDipakai(token)) return res.status(409).json({ error: 'QR sudah digunakan. Minta siswa menampilkan QR baru.' })
  const siswa = await db.prepare(`SELECT u.id, u.nama, sp.kelas, sp.nis FROM users u LEFT JOIN siswa_profil sp ON sp.user_id = u.id WHERE u.id = ? AND u.role = 'siswa' AND u.active = 1`).get(Number(payload.siswa_id))
  if (!siswa) return res.status(404).json({ error: 'Siswa tidak ditemukan atau tidak aktif' })
  const kontrol = await ambilKontrol(siswa.id)
  if (kontrol && kontrol.kartu_diblokir) return res.status(403).json({ error: 'Kartu siswa sedang diblokir oleh orang tua' })
  res.json({ ok: true, token, siswa })
})

async function validasiQrUntukTransaksi(token, siswaId) {
  const payload = verifikasiQrToken(token)
  if (!payload || Number(payload.siswa_id) !== Number(siswaId)) throw { code: 401, msg: 'QR kedaluwarsa, tidak valid, atau bukan milik siswa ini' }
  if (!await cekQrBelumDipakai(token)) throw { code: 409, msg: 'QR sudah digunakan. Minta siswa menampilkan QR baru.' }
  return qrHash(token)
}


function outletPic(req) {
  return req.user && req.user.role === 'pic' ? req.user.outlet : null
}

posRouter.get('/produk', wajibLogin, async (req, res) => {
  if (!['admin', 'pic'].includes(req.user.role)) return res.status(403).json({ error: 'Tidak punya akses' })
  const outlet = outletPic(req)
  const rows = outlet
    ? await db.prepare('SELECT id, nama, harga, outlet FROM produk WHERE outlet = ? ORDER BY id ASC').all(outlet)
    : await db.prepare('SELECT id, nama, harga, outlet FROM produk ORDER BY id ASC').all()
  const produk = rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    ket: namaOutlet(r.outlet) || r.outlet || '',
    harga: r.harga,
    outlet: r.outlet,
    tile: (r.nama || '?').trim().charAt(0).toUpperCase(),
    kategori: namaOutlet(r.outlet) || r.outlet || '',
    stok: null
  }))
  res.json({ produk, outlet: outlet || null })
})

posRouter.post('/produk', wajibLogin, wajibRole('admin', 'pic'), async (req, res) => {
  const { nama, harga, outlet } = req.body || {}
  const nominal = Number(harga)
  const validOutlets = Object.values(OUTLET)
  const targetOutlet = req.user.role === 'pic' ? req.user.outlet : outlet
  if (!nama || !Number.isInteger(nominal) || nominal <= 0) {
    return res.status(400).json({ error: 'Nama produk dan harga (>0) wajib diisi' })
  }
  if (!validOutlets.includes(targetOutlet)) {
    return res.status(400).json({ error: 'Outlet produk tidak valid' })
  }
  const info = await db.prepare('INSERT INTO produk (nama, harga, outlet) VALUES (?, ?, ?)').run(String(nama).trim(), nominal, targetOutlet)
  const produk = await db.prepare('SELECT id, nama, harga, outlet FROM produk WHERE id = ?').get(info.lastInsertRowid)
  await audit(req, 'BUAT_PRODUK', `${produk.nama} · Rp ${produk.harga.toLocaleString('id-ID')} · ${namaOutlet(produk.outlet)}`, 'produk', Number(produk.id))
  res.status(201).json({ message: 'Produk berhasil ditambahkan', produk })
})

// Ubah nama/harga produk. Riwayat transaksi menyimpan rincian sebagai teks,
// jadi mengubah harga tidak mengubah transaksi lama.
posRouter.put('/produk/:id', wajibLogin, wajibRole('admin', 'pic'), async (req, res) => {
  const id = Number(req.params.id)
  const { nama, harga } = req.body || {}
  const nominal = Number(harga)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  if (!nama || !String(nama).trim() || String(nama).length > 80 || !Number.isInteger(nominal) || nominal <= 0 || nominal > 10000000) {
    return res.status(400).json({ error: 'Nama produk dan harga (bilangan bulat > 0) wajib diisi' })
  }
  const lama = await db.prepare('SELECT * FROM produk WHERE id = ?').get(id)
  if (!lama) return res.status(404).json({ error: 'Produk tidak ditemukan' })
  if (req.user.role === 'pic' && req.user.outlet && lama.outlet !== req.user.outlet) return res.status(403).json({ error: 'Produk bukan milik outlet akun ini' })
  await db.prepare('UPDATE produk SET nama = ?, harga = ? WHERE id = ?').run(String(nama).trim(), nominal, id)
  const produk = await db.prepare('SELECT id, nama, harga, outlet FROM produk WHERE id = ?').get(id)
  await audit(req, 'UBAH_PRODUK', `${lama.nama} Rp ${Number(lama.harga).toLocaleString('id-ID')} → ${produk.nama} Rp ${Number(produk.harga).toLocaleString('id-ID')} · ${namaOutlet(produk.outlet)}`, 'produk', id)
  res.json({ message: 'Produk diperbarui', produk })
})

posRouter.delete('/produk/:id', wajibLogin, wajibRole('admin', 'pic'), async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  const lama = await db.prepare('SELECT * FROM produk WHERE id = ?').get(id)
  if (!lama) return res.status(404).json({ error: 'Produk tidak ditemukan' })
  if (req.user.role === 'pic' && req.user.outlet && lama.outlet !== req.user.outlet) return res.status(403).json({ error: 'Produk bukan milik outlet akun ini' })
  await db.prepare('DELETE FROM produk WHERE id = ?').run(id)
  await audit(req, 'HAPUS_PRODUK', `${lama.nama} · Rp ${Number(lama.harga).toLocaleString('id-ID')} · ${namaOutlet(lama.outlet)}`, 'produk', id)
  res.json({ message: 'Produk dihapus' })
})


async function pinCocok(siswaId, pin) {
  await periksaKunciPin(siswaId)
  const user = await db.prepare("SELECT pin_hash FROM users WHERE id = ? AND role = 'siswa'").get(siswaId)
  const cocok = !!(user && user.pin_hash && bcrypt.compareSync(String(pin), user.pin_hash))
  await catatHasilPin(siswaId, cocok)
  return cocok
}

// Dipakai layar PIN di app PIC untuk feedback cepat "PIN salah" — TIDAK
// memindahkan uang. Endpoint transaksi/tarik-tunai di bawah selalu cek
// ulang PIN sendiri sebelum benar-benar menulis ledger, jadi klien tidak
// bisa melewati pengecekan hanya dengan tidak memanggil endpoint ini.
posRouter.get('/kas', wajibLogin, wajibRole('pic'), async (req, res) => {
  res.json(await ambilKas(req.user.outlet))
})

posRouter.put('/kas', wajibLogin, wajibRole('pic'), async (req, res) => {
  const n = Number(req.body && req.body.kas_awal)
  if (!req.user.outlet) return res.status(400).json({ error: 'Akun PIC belum terhubung ke outlet' })
  if (!Number.isInteger(n) || n < 0 || n > 100000000) return res.status(400).json({ error: 'Kas awal harus bilangan bulat 0 – 100.000.000' })
  await simpanKasAwal(req.user.outlet, n)
  await audit(req, 'ATUR_KAS_AWAL', `${namaOutlet(req.user.outlet)} · Rp ${n.toLocaleString('id-ID')}`)
  res.json(await ambilKas(req.user.outlet))
})

posRouter.post('/verifikasi-pin', wajibLogin, wajibRole('pic'), async (req, res) => {
  const { siswa_id, pin } = req.body || {}
  res.json({ cocok: await pinCocok(siswa_id, pin) })
})

posRouter.post('/transaksi', wajibLogin, wajibRole('pic'), async (req, res) => {
  const { siswa_id, pin, items, qr_token } = req.body || {}
  if (!siswa_id || !pin || !qr_token || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'siswa_id, pin, dan items wajib diisi' })
  }
  if (!await pinCocok(siswa_id, pin)) { await audit(req, 'PIN_GAGAL', `Siswa #${siswa_id}`); return res.status(401).json({ error: 'PIN salah' }) }

  const trx = db.transaction(async () => {
    const tokenHash = await validasiQrUntukTransaksi(qr_token, siswa_id)
    let total = 0
    const rincian = []
    for (const item of items) {
      const produk = await db.prepare('SELECT * FROM produk WHERE id = ?').get(item.produk_id)
      if (!produk) throw { code: 400, msg: 'Produk tidak ditemukan: ' + item.produk_id }
      if (req.user.outlet && produk.outlet !== req.user.outlet) throw { code: 403, msg: 'Produk bukan milik outlet akun PIC ini' }
      const qty = Number(item.qty)
      if (!Number.isInteger(qty) || qty <= 0) throw { code: 400, msg: 'Jumlah produk harus bilangan bulat lebih dari 0' }
      total += produk.harga * qty
      rincian.push(produk.nama + ' x' + qty)
    }

    await db.prepare('SELECT id FROM users WHERE id = ? FOR UPDATE').get(siswa_id)
    await periksaKontrol(siswa_id, total)
    const saldo = await saldoSiswa(siswa_id)
    if (saldo < total) throw { code: 402, msg: 'Saldo tidak mencukupi' }

    const info = await db.prepare(
      `INSERT INTO ledger (siswa_id, tipe, nominal, keterangan, dibuat_oleh)
       VALUES (?, 'pembelian', ?, ?, ?)`
    ).run(siswa_id, -total, rincian.join(', '), req.user.id)

    await db.prepare('INSERT INTO qr_used (token_hash, siswa_id) VALUES (?, ?)').run(tokenHash, siswa_id)
    await audit(req, 'TRANSAKSI_POS', `Siswa #${siswa_id} · ${rincian.join(', ')} · Rp ${total.toLocaleString('id-ID')}`, 'ledger', Number(info.lastInsertRowid))
    return { total, ledger_id: info.lastInsertRowid }
  })

  try {
    const hasil = await trx()
    res.json({ ok: true, total: hasil.total, ledger_id: hasil.ledger_id, saldo_baru: await saldoSiswa(siswa_id) })
  } catch (e) {
    res.status(e.code || 500).json({ error: e.msg || 'Transaksi gagal' })
  }
})

posRouter.post('/tarik-tunai', wajibLogin, wajibRole('pic'), async (req, res) => {
  const { siswa_id, pin, nominal, qr_token } = req.body || {}
  const nilaiNominal = Number(nominal)
  if (!siswa_id || !pin || !qr_token || !Number.isInteger(nilaiNominal) || nilaiNominal <= 0) {
    return res.status(400).json({ error: 'siswa_id, pin, dan nominal (>0) wajib diisi' })
  }
  if (!await pinCocok(siswa_id, pin)) { await audit(req, 'PIN_GAGAL', `Siswa #${siswa_id}`); return res.status(401).json({ error: 'PIN salah' }) }

  const trx = db.transaction(async () => {
    const tokenHash = await validasiQrUntukTransaksi(qr_token, siswa_id)
    await db.prepare('SELECT id FROM users WHERE id = ? FOR UPDATE').get(siswa_id)
    await periksaKontrol(siswa_id, nilaiNominal)
    await periksaKas(req.user.outlet, nilaiNominal)
    const saldo = await saldoSiswa(siswa_id)
    if (saldo < nilaiNominal) throw { code: 402, msg: 'Saldo tidak mencukupi' }

    const info = await db.prepare(
      `INSERT INTO ledger (siswa_id, tipe, nominal, keterangan, dibuat_oleh)
       VALUES (?, 'tarik_tunai', ?, 'Penarikan tunai di outlet', ?)`
    ).run(siswa_id, -nilaiNominal, req.user.id)
    await db.prepare('INSERT INTO qr_used (token_hash, siswa_id) VALUES (?, ?)').run(tokenHash, siswa_id)
    await audit(req, 'AMBIL_TUNAI', `Siswa #${siswa_id} · Rp ${nilaiNominal.toLocaleString('id-ID')}`, 'ledger', Number(info.lastInsertRowid))
    return info.lastInsertRowid
  })

  try {
    const ledgerId = await trx()
    res.json({ ok: true, ledger_id: ledgerId, saldo_baru: await saldoSiswa(siswa_id) })
  } catch (e) {
    res.status(e.code || 500).json({ error: e.msg || 'Penarikan gagal' })
  }
})

