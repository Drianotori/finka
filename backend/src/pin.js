/**
 * Pembatas percobaan PIN siswa, disimpan di database (tabel pin_percobaan)
 * sehingga tetap berlaku setelah restart dan di semua instance backend.
 * 5 kali salah berturut-turut mengunci pengecekan PIN siswa 15 menit.
 */
import { db } from './db.js'

export const PIN_MAKS_SALAH = 5
export const PIN_KUNCI_MENIT = 15

export async function periksaKunciPin(siswaId) {
  const row = await db.prepare(
    `SELECT CEIL(EXTRACT(EPOCH FROM (terkunci_sampai - CURRENT_TIMESTAMP)) / 60) AS menit
     FROM pin_percobaan WHERE siswa_id = ? AND terkunci_sampai > CURRENT_TIMESTAMP`
  ).get(Number(siswaId))
  if (row) {
    throw { code: 429, msg: `PIN terkunci sementara karena terlalu banyak salah. Coba lagi ${Math.max(1, Number(row.menit))} menit lagi atau minta admin mereset PIN.` }
  }
}

// Atomik dalam satu statement supaya percobaan paralel tidak bisa lolos hitungan.
export async function catatHasilPin(siswaId, cocok) {
  const id = Number(siswaId)
  if (!Number.isInteger(id) || id <= 0) return
  if (cocok) {
    await db.prepare('DELETE FROM pin_percobaan WHERE siswa_id = ?').run(id)
    return
  }
  await db.prepare(
    `INSERT INTO pin_percobaan (siswa_id, salah, terkunci_sampai)
     VALUES (?, 1, NULL)
     ON CONFLICT (siswa_id) DO UPDATE SET
       salah = CASE WHEN pin_percobaan.terkunci_sampai IS NOT NULL AND pin_percobaan.terkunci_sampai <= CURRENT_TIMESTAMP
                    THEN 1 ELSE pin_percobaan.salah + 1 END,
       terkunci_sampai = CASE WHEN (CASE WHEN pin_percobaan.terkunci_sampai IS NOT NULL AND pin_percobaan.terkunci_sampai <= CURRENT_TIMESTAMP
                                         THEN 1 ELSE pin_percobaan.salah + 1 END) >= ${PIN_MAKS_SALAH}
                              THEN CURRENT_TIMESTAMP + INTERVAL '${PIN_KUNCI_MENIT} minutes' ELSE NULL END`
  ).run(id)
}

export async function bukaKunciPin(siswaId) {
  await db.prepare('DELETE FROM pin_percobaan WHERE siswa_id = ?').run(Number(siswaId))
}
