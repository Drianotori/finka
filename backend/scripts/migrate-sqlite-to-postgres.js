import 'dotenv/config'
import Database from 'better-sqlite3'
import { db, initDb } from '../src/db.js'

const sqlitePath = process.env.SQLITE_DB_PATH || new URL('../finka.db', import.meta.url).pathname
const sqlite = new Database(sqlitePath, { readonly: true })

const tables = ['users', 'siswa_profil', 'tagihan', 'produk', 'ledger', 'audit_log', 'topup_request', 'qr_used']
const columns = {
  users: ['id','role','nama','username','password_hash','pin_hash','outlet','active','created_at'],
  siswa_profil: ['user_id','ortu_id','kelas','nis'],
  tagihan: ['id','siswa_id','nama','nominal','jatuh_tempo','status','created_at'],
  produk: ['id','nama','harga','outlet'],
  ledger: ['id','siswa_id','tipe','nominal','keterangan','ref_tabel','ref_id','dibuat_oleh','created_at'],
  audit_log: ['id','aktor_id','aksi','perubahan','ip','ref_tabel','ref_id','created_at'],
  topup_request: ['id','siswa_id','ortu_id','nominal','kode_unik','tagihan_id','status','alasan_tolak','pernah_ditolak','created_at','diproses_oleh','diproses_at'],
  qr_used: ['token_hash','siswa_id','used_at']
}

const identityTables = new Set(['users','tagihan','produk','ledger','audit_log','topup_request'])

function value(row, col) {
  return row[col] === undefined ? null : row[col]
}

try {
  await initDb()
  const migrate = db.transaction(async () => {
    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all()
      if (!rows.length) continue
      const cols = columns[table]
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
      const query = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`
      for (const row of rows) await db.prepare(query).run(...cols.map((c) => value(row, c)))

      if (identityTables.has(table)) {
        await db.prepare(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), (SELECT COUNT(*) > 0 FROM ${table}))`).get()
      }
      console.log(`${table}: ${rows.length} baris diproses`)
    }
  })
  await migrate()
  console.log('Migrasi SQLite → PostgreSQL selesai.')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  sqlite.close()
  await db.close()
}
