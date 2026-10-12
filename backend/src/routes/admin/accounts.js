import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db, OUTLET } from '../../db.js'
import { wajibLogin } from '../../middleware/auth.js'
import { hanyaAdmin } from '../../middleware/role.js'
import { audit } from '../../audit.js'
import { PASSWORD_AWAL } from '../../config.js'
import crypto from 'crypto'
import { buatPinAwal, simpanProfilSiswa, simpanAnakOrtu, semuaIdValid, pesanErrorSql } from './helpers.js'

export const adminAccountsRouter = Router()

const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const sandiAcak = (n = 10) => Array.from({ length: n }, () => HURUF[crypto.randomInt(HURUF.length)]).join('')
const HUBUNGAN_VALID = ['ayah', 'ibu', 'wali']

// Username otomatis dari nama + awalan jenis akun; tambah angka bila sudah dipakai.
async function usernameOtomatis(role, nama) {
  const dasar = String(nama).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 18) || 'akun'
  const awalan = role === 'ortu' ? 'ortu' : role === 'pic' ? 'pic' : role === 'admin' ? 'admin' : 'siswa'
  for (let i = 0; i < 50; i++) {
    const kandidat = `${awalan}.${dasar}${i ? i + 1 : ''}`
    if (!(await db.prepare('SELECT 1 FROM users WHERE lower(username) = ?').get(kandidat))) return kandidat
  }
  return `${awalan}.${dasar}.${crypto.randomInt(1000, 9999)}`
}

// Nomor HP orang tua tidak boleh sama dengan akun orang tua lain.
export async function hpDipakaiOrtuLain(no_hp, selfId = 0) {
  if (!no_hp) return null
  return db.prepare("SELECT id, nama FROM users WHERE role = 'ortu' AND no_hp = ? AND id != ? LIMIT 1").get(no_hp, selfId) || null
}

// Rapikan nomor HP Indonesia ke format 08xxxxxxxxxx; kembalikan null bila tidak valid.
export function rapikanHp(v) {
  let s = String(v || '').replace(/[\s().-]/g, '')
  if (s.startsWith('+62')) s = '0' + s.slice(3)
  else if (s.startsWith('62')) s = '0' + s.slice(2)
  return /^08\d{8,12}$/.test(s) ? s : null
}

adminAccountsRouter.post('/users', wajibLogin, hanyaAdmin, async (req, res) => {
  const { kelas, nis, ortu_id, anak_ids, outlet } = req.body || {}
  const { role } = req.body || {}
  const nama = String((req.body || {}).nama || '').replace(/\s+/g, ' ').trim()
  let username = String((req.body || {}).username || '').trim()
  let password = (req.body || {}).password
  const hubungan = String((req.body || {}).hubungan || '').toLowerCase().trim() || null
  const hpMasuk = String((req.body || {}).no_hp || '').trim()
  const email = String((req.body || {}).email || '').trim().toLowerCase() || null

  // Validasi input wajib
  if (!nama || !role) {
    return res.status(400).json({ error: 'Nama dan jenis akun wajib diisi' })
  }
  if (nama.length > 80) return res.status(400).json({ error: 'Nama lebih dari 80 karakter' })
  if (password && String(password).length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })
  if (username && !/^[A-Za-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username 3-30 karakter: huruf, angka, titik, strip, garis bawah' })
  if (hubungan && !(role === 'ortu' && HUBUNGAN_VALID.includes(hubungan))) return res.status(400).json({ error: 'Hubungan hanya untuk orang tua: ayah, ibu, atau wali' })
  const no_hp = hpMasuk ? rapikanHp(hpMasuk) : null
  if (hpMasuk && !no_hp) return res.status(400).json({ error: 'Nomor HP tidak valid. Contoh: 0812 3456 7890' })
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) return res.status(400).json({ error: 'Format email tidak valid' })

  // Validasi role yang diperbolehkan
  const roleValid = ['admin', 'siswa', 'ortu', 'pic']
  if (!roleValid.includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid. Pilih: admin, siswa, ortu, atau pic' })
  }

  const outletValid = [OUTLET.KANTIN_UTAMA, OUTLET.KANTIN_B, OUTLET.KOPERASI]
  if (role === 'pic' && !outletValid.includes(outlet)) {
    return res.status(400).json({ error: 'Akun PIC wajib memiliki outlet: Kantin Utama, Kantin Blok B, atau Koperasi Sekolah' })
  }
  if (role !== 'pic' && outlet) {
    return res.status(400).json({ error: 'Outlet hanya boleh diisi untuk akun PIC' })
  }

  // Validasi keterkaitan LEBIH DULU, sebelum akun dibuat — supaya tidak
  // nyisa akun setengah jadi kalau ternyata link yang dipilih tidak valid.
  if (role === 'siswa' && ortu_id) {
    const ortu = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'ortu'").get(ortu_id)
    if (!ortu) {
      return res.status(400).json({ error: 'Akun orang tua yang dipilih tidak ditemukan' })
    }
  }
  const anakIds = role === 'ortu' && Array.isArray(anak_ids) ? anak_ids.map(Number) : []
  if (role === 'ortu' && anakIds.length && !await semuaIdValid(anakIds, 'siswa')) {
    return res.status(400).json({ error: 'Salah satu akun siswa yang dipilih tidak ditemukan' })
  }

  if (role === 'ortu' && no_hp) {
    const kembar = await hpDipakaiOrtuLain(no_hp)
    if (kembar) return res.status(409).json({ error: `Nomor HP ${no_hp} sudah dipakai akun orang tua "${kembar.nama}". Satu orang tua cukup satu akun; hubungkan semua anaknya ke akun itu.` })
  }
  const anakBaru = []
  if (role === 'ortu' && Array.isArray((req.body || {}).anak_baru)) {
    const daftar = req.body.anak_baru
    if (daftar.length > 10) return res.status(400).json({ error: 'Maksimal 10 anak baru sekaligus' })
    const nisDipakai = new Set()
    for (const [i, a] of daftar.entries()) {
      const n = String((a && a.nama) || '').replace(/\s+/g, ' ').trim()
      const ni = String((a && a.nis) || '').trim()
      const k = String((a && a.kelas) || '').trim()
      if (!n || !ni || !k) return res.status(400).json({ error: `Anak ke-${i + 1}: nama, NIS, dan kelas wajib diisi` })
      if (n.length > 80 || k.length > 20) return res.status(400).json({ error: `Anak ke-${i + 1}: nama atau kelas terlalu panjang` })
      if (!/^[A-Za-z0-9._-]{3,20}$/.test(ni)) return res.status(400).json({ error: `Anak ke-${i + 1}: NIS harus 3-20 karakter huruf/angka/titik/strip` })
      if (nisDipakai.has(ni)) return res.status(400).json({ error: `NIS ${ni} diisi dua kali` })
      nisDipakai.add(ni)
      if (await db.prepare('SELECT 1 FROM users WHERE username = ?').get(ni) || await db.prepare('SELECT 1 FROM siswa_profil WHERE nis = ?').get(ni)) {
        return res.status(409).json({ error: `NIS ${ni} sudah terdaftar` })
      }
      anakBaru.push({ nama: n, nis: ni, kelas: k })
    }
  }

  try {
    // Username & password otomatis bila tidak diisi (dipakai form baru).
    const otomatis = !password
    if (!username) username = role === 'siswa' && nis ? String(nis).trim() : await usernameOtomatis(role, nama)
    if (otomatis) password = role === 'admin' ? sandiAcak() : PASSWORD_AWAL
    // Cek apakah username sudah ada
    const cekUser = await db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (cekUser) {
      return res.status(400).json({ error: 'Username sudah digunakan, silakan pilih yang lain' })
    }

    // Hash password menggunakan bcryptjs
    const salt = bcrypt.genSaltSync(10)
    const password_hash = bcrypt.hashSync(password, salt)

    const pinAwal = role === 'siswa' ? buatPinAwal() : null
    const pin_hash = pinAwal ? bcrypt.hashSync(pinAwal, 10) : null
    const anakHasil = []
    const buat = db.transaction(async () => {
      const info = await db.prepare(`
        INSERT INTO users (username, password_hash, pin_hash, nama, role, outlet, active, hubungan, no_hp, email, wajib_ganti_password)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      `).run(username, password_hash, pin_hash, nama, role, role === 'pic' ? outlet : null, hubungan, no_hp, email, otomatis)
      const id = info.lastInsertRowid
      // Siswa: selalu bikin baris siswa_profil (kelas/NIS/ortu_id boleh kosong
      // dulu), supaya nanti gampang dilengkapi lewat "Kelola Keterkaitan".
      if (role === 'siswa') await simpanProfilSiswa(id, { kelas, nis, ortu_id: ortu_id || null })
      // Ortu: hubungkan ke anak yang sudah ada, lalu buat anak baru (satu transaksi).
      if (role === 'ortu' && anakIds.length) await simpanAnakOrtu(id, anakIds)
      for (const a of anakBaru) {
        const sandi = PASSWORD_AWAL
        const pin = buatPinAwal()
        const sis = await db.prepare("INSERT INTO users (username, password_hash, pin_hash, nama, role, outlet, active, wajib_ganti_password) VALUES (?, ?, ?, ?, 'siswa', NULL, 1, TRUE)")
          .run(a.nis, bcrypt.hashSync(sandi, 10), bcrypt.hashSync(pin, 10), a.nama)
        await db.prepare('INSERT INTO siswa_profil (user_id, ortu_id, kelas, nis) VALUES (?, ?, ?, ?)').run(sis.lastInsertRowid, id, a.kelas, a.nis)
        anakHasil.push({ nama: a.nama, nis: a.nis, kelas: a.kelas, username: a.nis, password: sandi, pin })
      }
      return id
    })
    const userId = await buat()

    await audit(req, 'BUAT_AKUN', `${role} · ${nama}${role === 'pic' ? ' · ' + outlet : ''}${anakHasil.length ? ' · +' + anakHasil.length + ' anak baru' : ''}`, 'users', userId)
    res.status(201).json({
      message: 'Akun berhasil dibuat',
      pin_awal: pinAwal,
      password_awal: otomatis ? password : null,
      anak_baru: anakHasil,
      user: {
        id: userId,
        username,
        nama,
        role,
        outlet: role === 'pic' ? outlet : null,
        hubungan, no_hp, email
      }
    })
  } catch (err) {
    console.error('Gagal membuat user:', err)
    res.status(500).json({ error: pesanErrorSql(err, 'Terjadi kesalahan pada server saat membuat akun') })
  }
})


// Buat siswa + orang tua sekaligus dalam satu transaksi database.
// Jika salah satu insert gagal, keduanya dibatalkan sehingga tidak ada akun yatim.
adminAccountsRouter.post('/users/siswa-ortu', wajibLogin, hanyaAdmin, async (req, res) => {
  const {
    siswa_nama, siswa_password, kelas, nis,
    ortu_nama, ortu_username, ortu_password
  } = req.body || {}
  const hub = String((req.body || {}).ortu_hubungan || '').toLowerCase().trim() || null
  const hpIn = String((req.body || {}).ortu_no_hp || '').trim()
  const mail = String((req.body || {}).ortu_email || '').trim().toLowerCase() || null
  if (hub && !HUBUNGAN_VALID.includes(hub)) return res.status(400).json({ error: 'Hubungan: ayah, ibu, atau wali' })
  const hp = hpIn ? rapikanHp(hpIn) : null
  if (hpIn && !hp) return res.status(400).json({ error: 'Nomor HP orang tua tidak valid. Contoh: 0812 3456 7890' })
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return res.status(400).json({ error: 'Format email tidak valid' })
  if (hp) {
    const kembar = await hpDipakaiOrtuLain(hp)
    if (kembar) return res.status(409).json({ error: `Nomor HP ${hp} sudah dipakai akun orang tua "${kembar.nama}"` })
  }

  if (!siswa_nama || !siswa_password || !kelas || !nis ||
      !ortu_nama || !ortu_username || !ortu_password) {
    return res.status(400).json({ error: 'Data siswa dan orang tua wajib diisi lengkap' })
  }

  try {
    const siswaUsername = String(nis).trim()
    const existing = await db.prepare('SELECT username FROM users WHERE username IN (?, ?)').all(siswaUsername, ortu_username.trim())
    if (existing.length) {
      return res.status(400).json({ error: `Username sudah digunakan: ${existing.map(x => x.username).join(', ')}` })
    }
    const existingNis = await db.prepare('SELECT user_id FROM siswa_profil WHERE nis = ?').get(String(nis).trim())
    if (existingNis) return res.status(400).json({ error: 'NIS sudah dipakai siswa lain' })

    const hash = (password) => bcrypt.hashSync(password, 10)
    const pinAwal = buatPinAwal()
    const create = db.transaction(async () => {
      const ortu = await db.prepare(`
        INSERT INTO users (username, password_hash, nama, role, outlet, hubungan, no_hp, email)
        VALUES (?, ?, ?, 'ortu', NULL, ?, ?, ?)
      `).run(ortu_username.trim(), hash(ortu_password), ortu_nama.trim(), hub, hp, mail)

      const siswa = await db.prepare(`
        INSERT INTO users (username, password_hash, pin_hash, nama, role, outlet, active)
        VALUES (?, ?, ?, ?, 'siswa', NULL, 1)
      `).run(siswaUsername, hash(siswa_password), hash(pinAwal), siswa_nama.trim())

      await db.prepare(`
        INSERT INTO siswa_profil (user_id, ortu_id, kelas, nis)
        VALUES (?, ?, ?, ?)
      `).run(siswa.lastInsertRowid, ortu.lastInsertRowid, kelas.trim(), String(nis).trim())

      return { siswaId: siswa.lastInsertRowid, ortuId: ortu.lastInsertRowid }
    })

    const result = await create()
    await audit(req, 'BUAT_SISWA_ORTU', `${siswa_nama} (${nis}) · wali ${ortu_nama}`, 'users', Number(result.siswaId))
    res.status(201).json({
      message: 'Akun siswa dan orang tua berhasil dibuat dan langsung terhubung',
      siswa: { id: result.siswaId, nama: siswa_nama.trim(), username: String(nis).trim(), role: 'siswa', kelas: kelas.trim(), nis: String(nis).trim(), pin_awal: pinAwal },
      ortu: { id: result.ortuId, nama: ortu_nama.trim(), username: ortu_username.trim(), role: 'ortu' }
    })
  } catch (err) {
    console.error('Gagal membuat siswa + orang tua:', err)
    res.status(500).json({ error: pesanErrorSql(err, 'Gagal membuat akun siswa dan orang tua') })
  }
})


