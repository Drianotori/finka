import 'dotenv/config'
import { db, initDb, ensureDemoData } from '../src/db.js'

try {
  await initDb()
  await ensureDemoData()
  console.log('PostgreSQL schema siap.')
} finally {
  await db.close()
}
