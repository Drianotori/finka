import { Router } from 'express'
import { db, saldoSiswa } from '../db.js'
import { wajibLogin } from '../middleware/auth.js'

import { ambilKontrol } from '../kontrol.js'
import { periksaKunciPin, catatHasilPin } from '../pin.js'
import { audit } from '../audit.js'
import bcrypt from 'bcryptjs'

// PIN terlalu mudah ditebak: semua digit sama, atau berurutan naik/turun.
function pinLemah(p) {
  if (/^(\d)\1+$/.test(p)) return true
  const d = p.split('').map(Number)
  const naik = d.every((x, i) => i === 0 || x === d[i - 1] + 1)
  const turun = d.every((x, i) => i === 0 || x === d[i - 1] - 1)
  return naik || turun
}

export const siswaRouter = Router()

// Siswa melihat limit harian & status kartunya sendiri (diatur orang tua).
siswaRouter.get('/saya/kontrol', wajibLogin, async (req, res) => {
  if (req.user.role !== 'siswa') return res.status(403).json({ error: 'Tidak punya akses' })
  res.json(await ambilKontrol(req.user.id))
})

// Siswa mengganti PIN POS-nya sendiri. PIN lama wajib; salah memakai penghitung
// percobaan yang sama dengan kasir (5 salah = terkunci 15 menit).
siswaRouter.post('/saya/ganti-pin', wajibLogin, async (req, res) => {
  if (req.user.role !== 'siswa') return res.status(403).json({ error: 'Tidak punya akses' })
  const { pin_lama, pin_baru } = req.body || {}
  if (typeof pin_lama !== 'string' || typeof pin_baru !== 'string' || !/^\d{6}$/.test(pin_lama)) return res.status(400).json({ error: 'PIN lama dan PIN baru wajib diisi (6 digit angka)' })
  if (!/^\d{6}$/.test(pin_baru)) return res.status(400).json({ error: 'PIN baru harus 6 digit angka' })
  if (pin_baru === pin_lama) return res.status(400).json({ error: 'PIN baru harus berbeda dari PIN lama' })
  if (pinLemah(pin_baru)) return res.status(400).json({ error: 'PIN terlalu mudah ditebak (jangan angka kembar atau berurutan)' })
  try { await periksaKunciPin(req.user.id) } catch (e) { return res.status(e.code || 429).json({ error: e.msg }) }
  const u = await db.prepare("SELECT pin_hash FROM users WHERE id = ? AND role = 'siswa'").get(req.user.id)
  const cocok = !!(u && u.pin_hash && bcrypt.compareSync(pin_lama, u.pin_hash))
  await catatHasilPin(req.user.id, cocok)
  if (!cocok) { await audit(req, 'GANTI_PIN_GAGAL', 'PIN lama salah'); return res.status(401).json({ error: 'PIN lama salah' }) }
  await db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(bcrypt.hashSync(pin_baru, 10), req.user.id)
  await audit(req, 'GANTI_PIN', `Siswa #${req.user.id}`)
  res.json({ ok: true })
})

siswaRouter.get('/', wajibLogin, async (req, res) => {
  if (!['admin', 'pic'].includes(req.user.role)) return res.status(403).json({ error: 'Tidak punya akses' })
  const rows = await db.prepare(`
    SELECT u.id, u.nama, sp.kelas, sp.nis, sp.ortu_id,
           o.nama AS ortu_nama
    FROM users u
    LEFT JOIN siswa_profil sp ON sp.user_id = u.id
    LEFT JOIN users o ON o.id = sp.ortu_id
    WHERE u.role = 'siswa'
    ORDER BY u.nama ASC
  `).all()
  const siswa = await Promise.all(rows.map(async (r) => ({ ...r, saldo: await saldoSiswa(r.id), inisial: (r.nama || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() })))
  res.json({ siswa })
})

siswaRouter.get('/:id', wajibLogin, async (req, res) => {
  const siswaId = Number(req.params.id)
  if (!(await bolehLihat(req.user, siswaId))) return res.status(403).json({ error: 'Tidak punya akses' })
  const row = await db.prepare(`
    SELECT u.id, u.nama, u.username, sp.kelas, sp.nis, sp.ortu_id,
           o.nama AS ortu_nama
    FROM users u
    LEFT JOIN siswa_profil sp ON sp.user_id = u.id
    LEFT JOIN users o ON o.id = sp.ortu_id
    WHERE u.id = ? AND u.role = 'siswa'
  `).get(siswaId)
  if (!row) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
  res.json({ siswa: { ...row, saldo: await saldoSiswa(siswaId), inisial: (row.nama || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() } })
})

async function bolehLihat(reqUser, siswaId) {
  if (['admin', 'pic'].includes(reqUser.role)) return true
  if (reqUser.role === 'siswa' && reqUser.id === Number(siswaId)) return true
  if (reqUser.role === 'ortu') {
    const profil = await db.prepare('SELECT ortu_id FROM siswa_profil WHERE user_id = ?').get(siswaId)
    return profil && profil.ortu_id === reqUser.id
  }
  return false
}

siswaRouter.get('/:id/saldo', wajibLogin, async (req, res) => {
  const siswaId = req.params.id
  if (!(await bolehLihat(req.user, siswaId))) return res.status(403).json({ error: 'Tidak punya akses' })
  res.json({ siswa_id: Number(siswaId), saldo: await saldoSiswa(siswaId) })
})

siswaRouter.get('/:id/riwayat', wajibLogin, async (req, res) => {
  const siswaId = req.params.id
  if (!(await bolehLihat(req.user, siswaId))) return res.status(403).json({ error: 'Tidak punya akses' })

  const rows = await db.prepare(
    `SELECT l.id, l.tipe, l.nominal, l.keterangan, l.created_at, u.nama AS oleh_nama,
            SUM(l.nominal) OVER (ORDER BY l.id) AS sisa
     FROM ledger l
     LEFT JOIN users u ON u.id = l.dibuat_oleh
     WHERE l.siswa_id = ?
     ORDER BY l.id DESC LIMIT 100`
  ).all(siswaId)
  res.json({ riwayat: rows })
})

