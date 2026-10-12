import jwt from 'jsonwebtoken'
import { db } from '../db.js'
import { JWT_SECRET } from '../config.js'

const BOLEH_SAAT_WAJIB_GANTI = new Set(['/api/auth/me', '/api/auth/ganti-password'])

export function buatToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, nama: user.nama },
    JWT_SECRET,
    { expiresIn: '12h', algorithm: 'HS256' }
  )
}

// Mewajibkan token valid. Ini yang menggantikan "tinggal klik kartu role"
// di prototipe — setiap request ke endpoint yang butuh identitas harus
// bawa token, dan token itu yang menentukan role, bukan parameter dari
// klien (klien tidak bisa mengaku-ngaku jadi admin).
export async function wajibLogin(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Token tidak ada' })

  try {
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    // Status akun selalu dibaca ulang dari DB agar akun yang dinonaktifkan
    // langsung kehilangan akses walaupun JWT-nya belum kedaluwarsa.
    const user = await db.prepare('SELECT id, role, nama, username, outlet, active, wajib_ganti_password FROM users WHERE id = ?').get(req.user.id)
    if (!user) return res.status(401).json({ error: 'Akun tidak ditemukan' })
    if (Number(user.active) !== 1) return res.status(403).json({ error: 'Akun sedang dinonaktifkan oleh Admin' })
    req.user = { ...req.user, ...user }
    // Password sementara (hasil reset/impor) wajib diganti dulu; selain halaman ganti password, semua ditolak.
    if (user.wajib_ganti_password && !BOLEH_SAAT_WAJIB_GANTI.has(req.originalUrl.split('?')[0])) {
      return res.status(403).json({ error: 'Anda harus mengganti password sementara terlebih dahulu', kode: 'WAJIB_GANTI_PASSWORD' })
    }
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' })
  }
}

// Dipakai setelah wajibLogin. Blokir di level API (bukan cuma sembunyikan
// tombol di UI, seperti mode "Monitoring" admin di prototipe).
export function wajibRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Tidak punya akses untuk aksi ini' })
    }
    next()
  }
}

