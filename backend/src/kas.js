/**
 * Kas tunai di laci per outlet per hari (WIB). PIC mengisi kas awal; yang sudah
 * ditarik siswa hari itu dihitung dari ledger 'tarik_tunai' oleh PIC outlet tsb.
 * Bila kas awal belum diisi, penarikan tidak dibatasi (kas = tidak diketahui).
 */
import { db } from './db.js'

const HARI_INI = "(CURRENT_TIMESTAMP + INTERVAL '7 hours')::date"

export async function ambilKas(outlet) {
  if (!outlet) return { kas_awal: null, sudah_ditarik: 0, sisa: null }
  const k = await db.prepare(`SELECT kas_awal FROM kas_outlet WHERE outlet = ? AND tanggal = ${HARI_INI}`).get(outlet)
  const t = await db.prepare(
    `SELECT COALESCE(-SUM(l.nominal), 0) AS total
     FROM ledger l JOIN users u ON u.id = l.dibuat_oleh
     WHERE l.tipe = 'tarik_tunai' AND u.outlet = ?
       AND NOT EXISTS (SELECT 1 FROM pembatalan p WHERE p.ledger_id = l.id)
       AND (l.created_at::timestamptz + INTERVAL '7 hours')::date = ${HARI_INI}`
  ).get(outlet)
  const sudah = Number(t?.total || 0)
  if (!k) return { kas_awal: null, sudah_ditarik: sudah, sisa: null }
  const awal = Number(k.kas_awal)
  return { kas_awal: awal, sudah_ditarik: sudah, sisa: Math.max(0, awal - sudah) }
}

export async function simpanKasAwal(outlet, kasAwal) {
  await db.prepare(
    `INSERT INTO kas_outlet (outlet, tanggal, kas_awal) VALUES (?, ${HARI_INI}, ?)
     ON CONFLICT (outlet, tanggal) DO UPDATE SET kas_awal = EXCLUDED.kas_awal`
  ).run(outlet, kasAwal)
}

export async function periksaKas(outlet, nominal) {
  const k = await ambilKas(outlet)
  if (k.sisa !== null && Number(nominal) > k.sisa) {
    throw { code: 409, msg: `Kas tunai di laci tidak cukup (sisa Rp ${k.sisa.toLocaleString('id-ID')})` }
  }
}
