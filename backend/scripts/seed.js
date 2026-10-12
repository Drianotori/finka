import { ensureDemoData, db } from '../src/db.js'
import { initDb } from '../src/db.js'

try {
  await initDb()
  const created = await ensureDemoData()
  if (!created) console.log('Database sudah berisi akun/data. Seed dilewati agar data tidak terhapus.')
  const rows = await db.prepare('SELECT role, username FROM users ORDER BY id').all()
  console.log('Akun tersedia:', rows)
} finally {
  await db.close()
}
