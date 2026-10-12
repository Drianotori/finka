import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { buatToken, wajibLogin } from '../middleware/auth.js'
import { audit } from '../audit.js'
import rateLimit from 'express-rate-limit'

export const authRouter = Router()

// Maksimal 10 percobaan login per IP per 15 menit (hanya yang gagal dihitung).
const batasLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' }
})

authRouter.post('/login', batasLogin, async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'username dan password wajib diisi' })
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (user && Number(user.active) !== 1) {
    await audit(req, 'LOGIN_DITOLAK_NONAKTIF', `username ${String(username)}`)
    return res.status(403).json({ error: 'Akun sedang dinonaktifkan oleh Admin' })
  }
  if (!user || !user.password_hash) {
    await audit(req, 'LOGIN_GAGAL', `username ${String(username)}`)
    return res.status(401).json({ error: 'Username atau password salah' })
  }

  const cocok = bcrypt.compareSync(password, user.password_hash)
  if (!cocok) {
    await audit(req, 'LOGIN_GAGAL', `username ${String(username)}`)
    return res.status(401).json({ error: 'Username atau password salah' })
  }

  const token = buatToken(user)
  req.user = user
  await audit(req, 'LOGIN_BERHASIL', `${user.role} · ${user.nama}`)
  res.json({
    token,
    user: { id: user.id, nama: user.nama, role: user.role, username: user.username, outlet: user.outlet || null, active: Number(user.active) === 1, wajib_ganti_password: !!user.wajib_ganti_password }
  })
})

// Semua peran bisa mengganti password sendiri. Wajib password lama.
const batasGantiPassword = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => 'u' + (req.user && req.user.id),
  message: { error: 'Terlalu banyak percobaan ganti password. Coba lagi dalam 15 menit.' }
})
authRouter.post('/ganti-password', wajibLogin, batasGantiPassword, async (req, res) => {
  const { password_lama, password_baru } = req.body || {}
  if (typeof password_lama !== 'string' || typeof password_baru !== 'string' || !password_lama || !password_baru) {
    return res.status(400).json({ error: 'Password lama dan password baru wajib diisi' })
  }
  if (password_baru.length < 8) return res.status(400).json({ error: 'Password baru minimal 8 karakter' })
  if (password_baru.length > 72) return res.status(400).json({ error: 'Password baru maksimal 72 karakter' })
  if (password_baru === password_lama) return res.status(400).json({ error: 'Password baru harus berbeda dari password lama' })
  const user = await db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id)
  if (!user || !user.password_hash || !bcrypt.compareSync(password_lama, user.password_hash)) {
    await audit(req, 'GANTI_PASSWORD_GAGAL', 'Password lama salah')
    return res.status(401).json({ error: 'Password lama salah' })
  }
  await db.prepare('UPDATE users SET password_hash = ?, wajib_ganti_password = FALSE WHERE id = ?').run(bcrypt.hashSync(password_baru, 12), req.user.id)
  await audit(req, 'GANTI_PASSWORD', `${req.user.role} · ${req.user.nama}`)
  res.json({ ok: true })
})

authRouter.get('/me', wajibLogin, async (req, res) => {
  const user = await db.prepare('SELECT id, nama, role, username, outlet, active, wajib_ganti_password FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan' })
  res.json({ user: { ...user, active: Number(user.active) === 1, wajib_ganti_password: !!user.wajib_ganti_password } })
})

