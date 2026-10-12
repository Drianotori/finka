import './config.js'
import 'express-async-errors'
/**
 * Entry point backend Finka.
 * Tugas file ini hanya menyiapkan Express, middleware umum, dan mendaftarkan route.
 * Logika bisnis disimpan di folder routes agar lebih mudah dicari dan diuji.
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { CORS_ORIGINS, IS_PRODUCTION, TRUST_PROXY } from './config.js'
import { authRouter } from './routes/auth.js'
import { siswaRouter } from './routes/siswa.js'
import { topupRouter } from './routes/topup.js'
import { tagihanRouter } from './routes/tagihan.js'
import { posRouter } from './routes/pos.js'
import { kasirRouter } from './routes/kasir.js'
import { ortuRouter } from './routes/ortu.js'
import { adminRouter } from './routes/admin.js'
import { laporanRouter } from './routes/laporan.js'
import { configRouter } from './routes/config.js'
import { initDb, ensureDemoData, db } from './db.js'

const app = express()
app.set('trust proxy', TRUST_PROXY)
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  // Tanpa CORS_ORIGINS (development) semua origin diizinkan; di produksi wajib diisi.
  origin: CORS_ORIGINS.length ? CORS_ORIGINS : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '8mb' }))

// Health check sungguhan: cek koneksi database, bukan sekadar "proses hidup".
app.get('/api/health', async (req, res) => {
  try {
    await db.prepare('SELECT 1 AS ok').get()
    res.json({ ok: true })
  } catch (e) {
    console.error('Health check gagal:', e.message)
    res.status(503).json({ ok: false })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/config', configRouter)
app.use('/api/siswa', siswaRouter)
app.use('/api/topup', topupRouter)
app.use('/api/tagihan', tagihanRouter)
app.use('/api/pos', posRouter)
app.use('/api/pos', kasirRouter)
app.use('/api/ortu', ortuRouter)
app.use('/api/admin', adminRouter)
app.use('/api/admin/laporan', laporanRouter)

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }))

// Penanganan error terpusat. Error async dari route (Express 4) sampai ke sini
// berkat 'express-async-errors', sehingga satu error tidak mematikan server.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Error yang sengaja dilempar route: { code: 4xx, msg: '...' }
  if (err && Number.isInteger(err.code) && err.code >= 400 && err.code < 500 && err.msg) {
    return res.status(err.code).json({ error: err.msg })
  }
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Data terlalu besar' })
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Format JSON tidak valid' })
  console.error(err)
  res.status(500).json({ error: 'Terjadi kesalahan di server' })
})

process.on('unhandledRejection', (reason) => { console.error('Unhandled rejection:', reason) })

const PORT = process.env.PORT || 3001

try {
  await initDb()
  await ensureDemoData()
  const server = app.listen(PORT, () => console.log(`Finka API jalan di port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`))
  const tutup = (sinyal) => {
    console.log(`${sinyal} diterima, menutup server…`)
    server.close(async () => { await db.close(); process.exit(0) })
    setTimeout(() => process.exit(1), 10000).unref()
  }
  process.on('SIGTERM', () => tutup('SIGTERM'))
  process.on('SIGINT', () => tutup('SIGINT'))
} catch (error) {
  console.error('Gagal menyiapkan PostgreSQL:', error)
  await db.close().catch(() => {})
  process.exit(1)
}
