/**
 * Kontrol orang tua atas dompet anak: limit belanja harian dan blokir kartu.
 * Disimpan di siswa_profil dan DIPAKSAKAN di server pada setiap transaksi POS
 * (bukan sekadar tampilan di aplikasi orang tua).
 */
import { db } from './db.js'

export const LIMIT_MIN = 1000
export const LIMIT_MAKS = 1000000

// Total pengeluaran siswa hari ini (zona waktu WIB): pembelian + tarik tunai.
export async function terpakaiHariIni(siswaId) {
  const row = await db.prepare(
    `SELECT COALESCE(-SUM(nominal), 0) AS total
     FROM ledger
     WHERE siswa_id = ? AND tipe IN ('pembelian', 'tarik_tunai')
       AND NOT EXISTS (SELECT 1 FROM pembatalan p WHERE p.ledger_id = ledger.id)
       AND (created_at::timestamptz + INTERVAL '7 hours')::date = (CURRENT_TIMESTAMP + INTERVAL '7 hours')::date`
  ).get(siswaId)
  return Number(row?.total || 0)
}

export async function ambilKontrol(siswaId) {
  const p = await db.prepare(
    'SELECT limit_harian_aktif, limit_harian, kartu_diblokir FROM siswa_profil WHERE user_id = ?'
  ).get(siswaId)
  if (!p) return null
  const terpakai = await terpakaiHariIni(siswaId)
  const limit = Number(p.limit_harian)
  return {
    limit_aktif: !!p.limit_harian_aktif,
    limit,
    kartu_diblokir: !!p.kartu_diblokir,
    terpakai_hari_ini: terpakai,
    sisa_limit: Math.max(0, limit - terpakai)
  }
}

// Dipanggil sebelum uang keluar. Melempar { code, msg } bila ditolak.
export async function periksaKontrol(siswaId, nominal) {
  const k = await ambilKontrol(siswaId)
  if (!k) return
  if (k.kartu_diblokir) throw { code: 403, msg: 'Kartu siswa sedang diblokir oleh orang tua' }
  if (k.limit_aktif && k.terpakai_hari_ini + Number(nominal) > k.limit) {
    throw { code: 403, msg: `Melebihi limit harian Rp ${k.limit.toLocaleString('id-ID')} (sisa Rp ${k.sisa_limit.toLocaleString('id-ID')})` }
  }
}
