import { Router } from 'express'
import { db, saldoSiswa } from '../../db.js'
import { wajibLogin } from '../../middleware/auth.js'
import { hanyaAdmin } from '../../middleware/role.js'
import { audit } from '../../audit.js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { OUTLET } from '../../db.js'
import { simpanProfilSiswa, simpanAnakOrtu, semuaIdValid, pesanErrorSql, buatPinAwal } from './helpers.js'
import { bukaKunciPin } from '../../pin.js'

import { rapikanHp, hpDipakaiOrtuLain } from './accounts.js'
import { PASSWORD_AWAL } from '../../config.js'

export const adminUsersRouter = Router()

// Endpoint untuk melihat daftar semua user, dilengkapi info keterkaitan:
// siswa membawa kelas/NIS/nama-ortu, ortu membawa daftar anak.
adminUsersRouter.get('/users', wajibLogin, hanyaAdmin, async (req, res) => {
  try {
    const list = await db.prepare(`
      SELECT u.id, u.username, u.nama, u.role, u.outlet, u.active, u.hubungan, u.no_hp, u.email,
             sp.kelas AS kelas, sp.nis AS nis, sp.ortu_id AS ortu_id,
             ortuUser.nama AS ortu_nama
      FROM users u
      LEFT JOIN siswa_profil sp ON sp.user_id = u.id
      LEFT JOIN users ortuUser ON ortuUser.id = sp.ortu_id
      ORDER BY u.id ASC
    `).all()

    const anakRows = await db.prepare(`
      SELECT sp.ortu_id AS ortu_id, s.id AS id, s.nama AS nama, sp.kelas AS kelas, sp.nis AS nis
      FROM siswa_profil sp JOIN users s ON s.id = sp.user_id
      WHERE sp.ortu_id IS NOT NULL
      ORDER BY s.nama ASC
    `).all()
    const anakByOrtu = {}
    for (const r of anakRows) {
      const anak = anakByOrtu[r.ortu_id] || (anakByOrtu[r.ortu_id] = [])
      anak.push({ id: r.id, nama: r.nama, kelas: r.kelas, nis: r.nis })
    }

    const result = list.map((u) => (u.role === 'ortu' ? { ...u, anak: anakByOrtu[u.id] || [] } : u))
    res.json(result)
  } catch (err) {
    console.error('Gagal mengambil daftar user:', err)
    res.status(500).json({ error: 'Gagal mengambil data pengguna' })
  }
})

// Ubah kelas/NIS/wali untuk SATU akun siswa yang sudah ada — dipakai utk
// melengkapi akun lama yang belum terhubung, atau memindahkan wali.
adminUsersRouter.put('/users/:id/profil-siswa', wajibLogin, hanyaAdmin, async (req, res) => {
  const siswaId = Number(req.params.id)
  const { kelas, nis, ortu_id } = req.body || {}

  const siswa = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'siswa'").get(siswaId)
  if (!siswa) {
    return res.status(404).json({ error: 'Akun siswa tidak ditemukan' })
  }
  if (ortu_id) {
    const ortu = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'ortu'").get(ortu_id)
    if (!ortu) {
      return res.status(400).json({ error: 'Akun orang tua yang dipilih tidak ditemukan' })
    }
  }

  try {
    await simpanProfilSiswa(siswaId, { kelas, nis, ortu_id: ortu_id || null })
    await audit(req, 'UBAH_PROFIL_SISWA', `Siswa #${siswaId} · kelas ${kelas || '-'} · NIS ${nis || '-'} · ortu #${ortu_id || '-'}`, 'users', siswaId)
    res.json({ message: 'Data siswa berhasil diperbarui' })
  } catch (err) {
    console.error('Gagal memperbarui profil siswa:', err)
    res.status(500).json({ error: pesanErrorSql(err, 'Gagal memperbarui data siswa') })
  }
})

// Ganti seluruh daftar anak untuk SATU akun ortu yang sudah ada.
adminUsersRouter.put('/users/:id/anak', wajibLogin, hanyaAdmin, async (req, res) => {
  const ortuId = Number(req.params.id)
  const { anak_ids } = req.body || {}

  const ortu = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'ortu'").get(ortuId)
  if (!ortu) {
    return res.status(404).json({ error: 'Akun orang tua tidak ditemukan' })
  }
  if (!Array.isArray(anak_ids)) {
    return res.status(400).json({ error: 'anak_ids harus berupa daftar id siswa' })
  }
  const anakIds = anak_ids.map(Number)
  if (!await semuaIdValid(anakIds, 'siswa')) {
    return res.status(400).json({ error: 'Salah satu akun siswa yang dipilih tidak ditemukan' })
  }

  await simpanAnakOrtu(ortuId, anakIds)
  await audit(req, 'UBAH_KETERKAITAN_ANAK', `Ortu #${ortuId} · ${anakIds.length} anak`, 'users', ortuId)
  res.json({ message: 'Keterkaitan anak berhasil diperbarui' })
})

// Edit profil akun internal (Admin/PIC). Role tidak dapat diubah dari sini.
// Password boleh dikosongkan jika tidak ingin diganti.
adminUsersRouter.put('/users/:id/profil-internal', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const { nama, username, password, outlet } = req.body || {}
  if (!nama || !String(nama).trim() || !username || !String(username).trim()) {
    return res.status(400).json({ error: 'Nama dan username wajib diisi' })
  }

  const target = await db.prepare('SELECT id, nama, username, role, outlet FROM users WHERE id = ? AND role IN (\'admin\', \'pic\')').get(id)
  if (!target) return res.status(404).json({ error: 'Akun Admin/PIC tidak ditemukan' })

  const normalizedUsername = String(username).trim()
  const duplicate = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(normalizedUsername, id)
  if (duplicate) return res.status(409).json({ error: 'Username sudah digunakan akun lain' })

  let nextOutlet = null
  if (target.role === 'pic') {
    const validOutlets = [OUTLET.KANTIN_UTAMA, OUTLET.KANTIN_B, OUTLET.KOPERASI]
    if (!validOutlets.includes(outlet)) return res.status(400).json({ error: 'Outlet PIC tidak valid' })
    nextOutlet = outlet
  }

  try {
    if (password && String(password).length > 0) {
      const passwordHash = bcrypt.hashSync(String(password), 10)
      await db.prepare('UPDATE users SET nama = ?, username = ?, password_hash = ?, outlet = ? WHERE id = ?')
        .run(String(nama).trim(), normalizedUsername, passwordHash, nextOutlet, id)
    } else {
      await db.prepare('UPDATE users SET nama = ?, username = ?, outlet = ? WHERE id = ?')
        .run(String(nama).trim(), normalizedUsername, nextOutlet, id)
    }

    await audit(req, 'UBAH_AKUN_INTERNAL', `${target.role} · ${target.nama} → ${String(nama).trim()}`, 'users', id)
    const updated = await db.prepare('SELECT id, username, nama, role, outlet, active FROM users WHERE id = ?').get(id)
    res.json({ message: 'Akun berhasil diperbarui', user: updated })
  } catch (err) {
    console.error('Gagal memperbarui akun internal:', err)
    res.status(500).json({ error: 'Gagal memperbarui akun' })
  }
})

// Ubah kontak (hubungan, nomor HP, email) akun orang tua / PIC / admin.
adminUsersRouter.put('/users/:id/kontak', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const target = await db.prepare("SELECT id, nama, role FROM users WHERE id = ? AND role IN ('ortu','pic','admin')").get(id)
  if (!target) return res.status(404).json({ error: 'Akun tidak ditemukan' })
  const b = req.body || {}
  const hubungan = String(b.hubungan || '').toLowerCase().trim() || null
  const hpMasuk = String(b.no_hp || '').trim()
  const email = String(b.email || '').trim().toLowerCase() || null
  if (hubungan && !(target.role === 'ortu' && ['ayah', 'ibu', 'wali'].includes(hubungan))) return res.status(400).json({ error: 'Hubungan hanya untuk orang tua: ayah, ibu, atau wali' })
  const no_hp = hpMasuk ? rapikanHp(hpMasuk) : null
  if (hpMasuk && !no_hp) return res.status(400).json({ error: 'Nomor HP tidak valid. Contoh: 0812 3456 7890' })
  if (target.role === 'ortu' && !no_hp) return res.status(400).json({ error: 'Nomor HP orang tua wajib diisi' })
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) return res.status(400).json({ error: 'Format email tidak valid' })
  if (target.role === 'ortu') {
    const kembar = await hpDipakaiOrtuLain(no_hp, id)
    if (kembar) return res.status(409).json({ error: `Nomor HP ${no_hp} sudah dipakai akun orang tua "${kembar.nama}"` })
  }
  await db.prepare('UPDATE users SET hubungan = ?, no_hp = ?, email = ? WHERE id = ?').run(hubungan, no_hp, email, id)
  await audit(req, 'UBAH_KONTAK', `${target.role} · ${target.nama}`, 'users', id)
  res.json({ ok: true, hubungan, no_hp, email })
})

// Nonaktifkan/aktifkan akun tanpa menghapus histori transaksi.
adminUsersRouter.patch('/users/:id/status', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const active = req.body && (req.body.active === true || Number(req.body.active) === 1) ? 1 : 0
  if (id === Number(req.user.id)) return res.status(400).json({ error: 'Admin tidak dapat menonaktifkan akun sendiri' })
  const target = await db.prepare('SELECT id, nama, role, active FROM users WHERE id = ?').get(id)
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan' })
  await db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active, id)
  await audit(req, active ? 'AKTIFKAN_AKUN' : 'NONAKTIFKAN_AKUN', `${target.role} · ${target.nama}`, 'users', id)
  res.json({ ok: true, active: !!active, message: active ? 'Akun diaktifkan' : 'Akun dinonaktifkan' })
})

// Endpoint untuk menghapus user berdasarkan ID
adminUsersRouter.delete('/users/:id', wajibLogin, hanyaAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const stmt = await db.prepare('DELETE FROM users WHERE id = ?')
    const target = await db.prepare('SELECT id,nama,role,username FROM users WHERE id = ?').get(id)
    const info = await stmt.run(id)

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' })
    }

    await audit(req, 'HAPUS_AKUN', `${target?.role || '-'} · ${target?.nama || id}`, 'users', Number(id))
    res.json({ message: 'User berhasil dihapus' })
  } catch (err) {
    console.error('Gagal menghapus user:', err)
    // Biasanya krn FK: akun ini masih dipakai di siswa_profil (sbg siswa
    // atau sbg ortu) atau di ledger/tagihan/topup_request.
    if (String(err.message || '').includes('violates foreign key constraint')) {
      return res.status(409).json({
        error: 'Akun ini masih terhubung dengan data lain (siswa/ortu/riwayat transaksi). Lepas keterkaitannya dulu lewat "Kelola", baru hapus.'
      })
    }
    res.status(500).json({ error: 'Gagal menghapus user' })
  }
})



// Admin mereset PIN POS siswa (PIN lupa/terkunci). PIN baru dibuat acak 6 digit,
// hanya dikembalikan SEKALI pada respons ini, dan kunci percobaan PIN dibuka.
adminUsersRouter.post('/users/:id/reset-pin', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  const siswa = await db.prepare("SELECT id, nama FROM users WHERE id = ? AND role = 'siswa'").get(id)
  if (!siswa) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
  const pin = buatPinAwal()
  await db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(bcrypt.hashSync(pin, 10), id)
  await bukaKunciPin(id)
  await audit(req, 'RESET_PIN_SISWA', `Siswa #${id} · ${siswa.nama}`, 'users', id)
  res.json({ ok: true, siswa_id: id, nama: siswa.nama, pin })
})

// Reset password MASSAL ke password awal (PASSWORD_AWAL, bawaan 123456) untuk satu peran.
// Pengguna wajib menggantinya saat login berikutnya. Akun admin tidak bisa direset massal.
adminUsersRouter.post('/users/reset-password-massal', wajibLogin, hanyaAdmin, async (req, res) => {
  const { role, kelas, konfirmasi } = req.body || {}
  if (!['siswa', 'ortu', 'pic'].includes(role)) return res.status(400).json({ error: 'Peran harus siswa, ortu, atau pic' })
  if (konfirmasi !== 'RESET') return res.status(400).json({ error: 'Ketik RESET untuk konfirmasi' })
  const hash = bcrypt.hashSync(PASSWORD_AWAL, 10)
  let info
  if (role === 'siswa' && kelas) {
    info = await db.prepare("UPDATE users SET password_hash = ?, wajib_ganti_password = TRUE WHERE role = 'siswa' AND active = 1 AND id IN (SELECT user_id FROM siswa_profil WHERE kelas = ?)").run(hash, String(kelas).trim())
  } else {
    info = await db.prepare('UPDATE users SET password_hash = ?, wajib_ganti_password = TRUE WHERE role = ? AND active = 1').run(hash, role)
  }
  const jumlah = Number(info.changes ?? info.rowCount ?? 0)
  await audit(req, 'RESET_PASSWORD_MASSAL', `${role}${kelas ? ' kelas ' + kelas : ''} · ${jumlah} akun`)
  res.json({ ok: true, jumlah, password_awal: PASSWORD_AWAL })
})

// Admin mengatur ulang password akun lain (lupa password). Password sementara
// acak dikembalikan SEKALI; pengguna diminta menggantinya lewat menu Password.
// Admin tidak bisa memakai ini untuk dirinya sendiri (pakai ganti-password).
const HURUF_SANDI = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
function buatSandiSementara(panjang = 10) {
  let out = ''
  for (let i = 0; i < panjang; i++) out += HURUF_SANDI[crypto.randomInt(HURUF_SANDI.length)]
  return out
}
adminUsersRouter.post('/users/:id/reset-password', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  if (id === Number(req.user.id)) return res.status(400).json({ error: 'Untuk akun sendiri gunakan menu Password (ganti password)' })
  const target = await db.prepare('SELECT id, nama, role, username FROM users WHERE id = ?').get(id)
  if (!target) return res.status(404).json({ error: 'Pengguna tidak ditemukan' })
  const sandi = buatSandiSementara()
  await db.prepare('UPDATE users SET password_hash = ?, wajib_ganti_password = TRUE WHERE id = ?').run(bcrypt.hashSync(sandi, 10), id)
  await audit(req, 'RESET_PASSWORD', `${target.role} · ${target.nama} (${target.username})`, 'users', id)
  res.json({ ok: true, user_id: id, nama: target.nama, username: target.username, password_sementara: sandi })
})

// Koreksi saldo siswa oleh admin (salah top-up, belanja salah scan, dsb).
// Selalu tercatat di ledger sebagai 'penyesuaian' + audit, alasan wajib,
// dan saldo tidak boleh menjadi negatif.
export const KOREKSI_MAKS = 5000000
adminUsersRouter.post('/users/:id/koreksi-saldo', wajibLogin, hanyaAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const nominal = Number(req.body && req.body.nominal)
  const alasan = String((req.body && req.body.alasan) || '').trim()
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID tidak valid' })
  if (!Number.isInteger(nominal) || nominal === 0 || Math.abs(nominal) > KOREKSI_MAKS) {
    return res.status(400).json({ error: `Nominal koreksi harus bilangan bulat bukan nol, maksimal Rp ${KOREKSI_MAKS.toLocaleString('id-ID')} (negatif untuk mengurangi)` })
  }
  if (alasan.length < 5 || alasan.length > 200) return res.status(400).json({ error: 'Alasan koreksi wajib diisi (5-200 karakter)' })
  const trx = db.transaction(async () => {
    const siswa = await db.prepare("SELECT id, nama FROM users WHERE id = ? AND role = 'siswa' FOR UPDATE").get(id)
    if (!siswa) throw { code: 404, msg: 'Siswa tidak ditemukan' }
    const sebelum = await saldoSiswa(id)
    if (sebelum + nominal < 0) throw { code: 409, msg: `Saldo tidak cukup untuk dikurangi (saldo Rp ${sebelum.toLocaleString('id-ID')})` }
    const info = await db.prepare(
      "INSERT INTO ledger (siswa_id, tipe, nominal, keterangan, ref_tabel, dibuat_oleh) VALUES (?, 'penyesuaian', ?, ?, 'koreksi', ?)"
    ).run(id, nominal, 'Koreksi admin: ' + alasan, req.user.id)
    return { siswa, sebelum, sesudah: sebelum + nominal, ledger_id: info.lastInsertRowid }
  })
  try {
    const r = await trx()
    await audit(req, 'KOREKSI_SALDO', `Siswa #${id} · ${r.siswa.nama} · ${nominal > 0 ? '+' : '-'}Rp ${Math.abs(nominal).toLocaleString('id-ID')} · ${r.sebelum} → ${r.sesudah} · ${alasan}`, 'ledger', Number(r.ledger_id) || null)
    res.status(201).json({ ok: true, siswa_id: id, saldo_sebelum: r.sebelum, saldo_baru: r.sesudah })
  } catch (e) {
    if (e.code) return res.status(e.code).json({ error: e.msg })
    throw e
  }
})
