import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '../../db.js'
import { wajibLogin } from '../../middleware/auth.js'
import { hanyaAdmin } from '../../middleware/role.js'
import { audit } from '../../audit.js'
import { PASSWORD_AWAL } from '../../config.js'
import { buatPinAwal } from './helpers.js'

export const adminImporRouter = Router()

export const IMPOR_MAKS_BARIS = 300
// Biaya bcrypt 8 (bukan 10) khusus kredensial acak hasil impor, supaya 300 baris
// selesai dalam hitungan detik. Password acak 10 karakter; PIN tetap dibatasi kunci percobaan.
const BCRYPT_COST = 8
const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const sandiAcak = (n = 10) => Array.from({ length: n }, () => HURUF[crypto.randomInt(HURUF.length)]).join('')
const rapikan = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

// Validasi satu file impor tanpa menulis apa pun. Mengembalikan status per baris
// dan ringkasan, dipakai untuk pratinjau (dry-run) maupun sebelum simpan.
export async function periksaImpor(baris) {
  const hasil = []
  const nisDiFile = new Map()          // nis -> nomor baris pertama
  const ortuDiFile = new Map()         // username ortu -> { nama, baris }
  const nisSemua = baris.map((b) => rapikan(b && b.nis)).filter(Boolean)
  const ortuSemua = baris.map((b) => rapikan(b && b.username_ortu).toLowerCase()).filter(Boolean)

  const nisLower = new Set(nisSemua.map((n) => n.toLowerCase()))
  const nisAda = new Set()
  if (nisSemua.length) {
    const ph = nisSemua.map(() => '?').join(',')
    for (const r of await db.prepare(`SELECT username FROM users WHERE username IN (${ph})`).all(...nisSemua)) nisAda.add(String(r.username))
    for (const r of await db.prepare(`SELECT nis FROM siswa_profil WHERE nis IN (${ph})`).all(...nisSemua)) nisAda.add(String(r.nis))
  }
  const ortuAda = new Map()            // username -> { id, role, nama }
  const usernameOrtuOtomatis = baris.map((b) => `ortu.${rapikan(b && b.nis)}`.toLowerCase())
  const cekUsername = [...new Set([...ortuSemua, ...usernameOrtuOtomatis])]
  if (cekUsername.length) {
    const ph = cekUsername.map(() => '?').join(',')
    for (const r of await db.prepare(`SELECT id, username, role, nama FROM users WHERE lower(username) IN (${ph})`).all(...cekUsername)) {
      ortuAda.set(String(r.username).toLowerCase(), r)
    }
  }

  baris.forEach((b, i) => {
    const no = Number(b && b.no) > 0 ? Number(b.no) : i + 2
    const nama = rapikan(b && b.nama_siswa)
    const nis = rapikan(b && b.nis)
    const kelas = rapikan(b && b.kelas)
    const namaOrtu = rapikan(b && b.nama_ortu)
    const unOrtuInput = rapikan(b && b.username_ortu).toLowerCase()
    const unOrtu = unOrtuInput || (nis ? `ortu.${nis}`.toLowerCase() : '')
    const err = []

    if (!nama) err.push('nama siswa kosong')
    else if (nama.length > 80) err.push('nama siswa lebih dari 80 karakter')
    if (!nis) err.push('NIS kosong')
    else if (/^\d+(\.\d+)?e\+?\d+$/i.test(nis)) err.push('NIS tampak diubah Excel ke notasi ilmiah; format kolom NIS sebagai Teks')
    else if (!/^[A-Za-z0-9._-]{3,20}$/.test(nis)) err.push('NIS harus 3-20 karakter huruf/angka/titik/strip')
    if (!kelas) err.push('kelas kosong')
    else if (kelas.length > 20) err.push('kelas lebih dari 20 karakter')
    if (!namaOrtu) err.push('nama orang tua kosong')
    else if (namaOrtu.length > 80) err.push('nama orang tua lebih dari 80 karakter')
    if (unOrtuInput && !/^[a-z0-9._-]{3,30}$/.test(unOrtuInput)) err.push('username orang tua harus 3-30 karakter huruf kecil/angka/titik/strip/garis bawah')

    let ortuStatus = 'baru'
    if (nis && !err.length) {
      if (nisAda.has(nis)) err.push(`NIS ${nis} sudah terdaftar`)
      if (nisDiFile.has(nis)) err.push(`NIS ${nis} dobel dengan baris ${nisDiFile.get(nis)}`)
      else nisDiFile.set(nis, no)
      if (unOrtu === nis.toLowerCase()) err.push('username orang tua tidak boleh sama dengan NIS')
      else if (nisLower.has(unOrtu)) err.push(`username orang tua ${unOrtu} sama dengan NIS siswa lain di file`)
      const ada = ortuAda.get(unOrtu)
      if (ada) {
        if (ada.role !== 'ortu') err.push(`username ${unOrtu} sudah dipakai akun non-orang tua`)
        else ortuStatus = 'ada'
      }
      const lain = ortuDiFile.get(unOrtu)
      if (lain) {
        if (lain.nama.toLowerCase() !== namaOrtu.toLowerCase()) err.push(`username ${unOrtu} dipakai baris ${lain.baris} dengan nama orang tua berbeda ("${lain.nama}")`)
        else if (ortuStatus === 'baru') ortuStatus = 'sama_dengan_baris_lain'
      } else if (namaOrtu) {
        ortuDiFile.set(unOrtu, { nama: namaOrtu, baris: no })
      }
    }
    hasil.push({ no, nama_siswa: nama, nis, kelas, nama_ortu: namaOrtu, username_ortu: unOrtu, ortu_status: ortuStatus, error: err })
  })

  const salah = hasil.filter((h) => h.error.length)
  const ortuBaru = new Set(hasil.filter((h) => !h.error.length && h.ortu_status === 'baru').map((h) => h.username_ortu))
  const ortuPakaiUlang = new Set(hasil.filter((h) => !h.error.length && h.ortu_status === 'ada').map((h) => h.username_ortu))
  return {
    total: hasil.length,
    valid: hasil.length - salah.length,
    jumlah_error: salah.length,
    ortu_baru: ortuBaru.size,
    ortu_dipakai_ulang: ortuPakaiUlang.size,
    baris: hasil
  }
}

adminImporRouter.post('/impor-siswa', wajibLogin, hanyaAdmin, async (req, res) => {
  const baris = req.body && req.body.baris
  const simpan = req.body && req.body.simpan === true
  if (!Array.isArray(baris) || !baris.length) return res.status(400).json({ error: 'Tidak ada baris data untuk diimpor' })
  if (baris.length > IMPOR_MAKS_BARIS) return res.status(400).json({ error: `Maksimal ${IMPOR_MAKS_BARIS} baris per impor. Pecah file menjadi beberapa bagian.` })

  const pratinjau = await periksaImpor(baris)
  if (!simpan) return res.json({ ok: pratinjau.jumlah_error === 0, simpan: false, ...pratinjau })
  if (pratinjau.jumlah_error > 0) {
    return res.status(400).json({ error: 'Masih ada baris yang salah. Perbaiki file lalu periksa ulang; tidak ada data yang disimpan.', ok: false, simpan: false, ...pratinjau })
  }

  const akun = []
  const ortuIdPerUsername = new Map()
  const trx = db.transaction(async () => {
    for (const b of pratinjau.baris) {
      let ortuId = ortuIdPerUsername.get(b.username_ortu)
      let sandiOrtu = null
      if (!ortuId) {
        const ada = await db.prepare("SELECT id FROM users WHERE lower(username) = ? AND role = 'ortu'").get(b.username_ortu)
        if (ada) {
          ortuId = ada.id
        } else {
          sandiOrtu = PASSWORD_AWAL
          const r = await db.prepare("INSERT INTO users (username, password_hash, nama, role, outlet, wajib_ganti_password) VALUES (?, ?, ?, 'ortu', NULL, TRUE)")
            .run(b.username_ortu, bcrypt.hashSync(sandiOrtu, BCRYPT_COST), b.nama_ortu)
          ortuId = r.lastInsertRowid
        }
        ortuIdPerUsername.set(b.username_ortu, ortuId)
      }
      const sandiSiswa = PASSWORD_AWAL
      const pin = buatPinAwal()
      const s = await db.prepare("INSERT INTO users (username, password_hash, pin_hash, nama, role, outlet, active, wajib_ganti_password) VALUES (?, ?, ?, ?, 'siswa', NULL, 1, TRUE)")
        .run(b.nis, bcrypt.hashSync(sandiSiswa, BCRYPT_COST), bcrypt.hashSync(pin, BCRYPT_COST), b.nama_siswa)
      await db.prepare('INSERT INTO siswa_profil (user_id, ortu_id, kelas, nis) VALUES (?, ?, ?, ?)').run(s.lastInsertRowid, ortuId, b.kelas, b.nis)
      akun.push({
        nama_siswa: b.nama_siswa, nis: b.nis, kelas: b.kelas,
        username_siswa: b.nis, password_siswa: sandiSiswa, pin_siswa: pin,
        nama_ortu: b.nama_ortu, username_ortu: b.username_ortu, password_ortu: sandiOrtu
      })
    }
  })
  try {
    await trx()
  } catch (e) {
    console.error('Impor siswa gagal:', e)
    const dobel = /duplicate key|unique/i.test(String(e.message || ''))
    return res.status(dobel ? 409 : 500).json({ error: dobel ? 'Ada data yang baru saja dibuat pihak lain (NIS/username dobel). Periksa ulang file lalu coba lagi; tidak ada data yang disimpan.' : 'Impor gagal; tidak ada data yang disimpan.' })
  }
  await audit(req, 'IMPOR_SISWA', `${akun.length} siswa · ${pratinjau.ortu_baru} akun orang tua baru · ${pratinjau.ortu_dipakai_ulang} akun orang tua dipakai ulang`, 'users', null)
  res.status(201).json({
    ok: true, simpan: true,
    siswa_dibuat: akun.length, ortu_dibuat: akun.filter((a) => a.password_ortu).length, ortu_dipakai_ulang: pratinjau.ortu_dipakai_ulang,
    akun
  })
})
