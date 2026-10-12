/**
 * Konfigurasi lingkungan backend.
 * Di produksi (NODE_ENV=production) secret WAJIB diisi; server menolak start
 * kalau JWT_SECRET/QR_SECRET kosong, masih bawaan, atau terlalu pendek.
 */
import 'dotenv/config'

export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const SECRET_BAWAAN = new Set(['ganti-dengan-rahasia-panjang', 'ganti-dengan-rahasia-qr-panjang', 'dev-secret-ganti-saat-produksi', 'dev-qr-secret-ganti-saat-produksi'])

function ambilSecret(nama, cadanganDev) {
  const nilai = process.env[nama]
  if (IS_PRODUCTION) {
    if (!nilai || nilai.length < 32 || SECRET_BAWAAN.has(nilai)) {
      throw new Error(`${nama} wajib diisi di produksi (minimal 32 karakter acak, bukan nilai contoh). Buat dengan: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
    }
    return nilai
  }
  return nilai || cadanganDev
}

export const JWT_SECRET = ambilSecret('JWT_SECRET', 'dev-secret-ganti-saat-produksi')
export const QR_SECRET = ambilSecret('QR_SECRET', 'dev-qr-secret-ganti-saat-produksi')
if (IS_PRODUCTION && QR_SECRET === JWT_SECRET) {
  throw new Error('QR_SECRET harus berbeda dari JWT_SECRET')
}

// Daftar origin frontend yang boleh memanggil API, pisahkan dengan koma.
// Contoh: CORS_ORIGINS=https://finka.sekolah.sch.id
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
if (IS_PRODUCTION && CORS_ORIGINS.length === 0) {
  throw new Error('CORS_ORIGINS wajib diisi di produksi (URL frontend, mis. https://finka.sekolah.sch.id)')
}

// Rekening tujuan transfer & identitas yayasan. Ditampilkan ke orang tua dan
// admin; di produksi WAJIB diisi supaya tidak pernah menampilkan data contoh.
function ambilInfo(nama, cadanganDev) {
  const nilai = (process.env[nama] || '').trim()
  if (nilai) return nilai
  if (IS_PRODUCTION) throw new Error(`${nama} wajib diisi di produksi (rekening tujuan transfer yang ditampilkan ke orang tua)`)
  return cadanganDev
}
const ATAS_NAMA = ambilInfo('REKENING_ATAS_NAMA', 'Yayasan Contoh (data contoh)')
export const INFO_PEMBAYARAN = {
  rekening: {
    bank: ambilInfo('REKENING_BANK', 'BANK CONTOH'),
    nomor: ambilInfo('REKENING_NOMOR', '0000 0000 0000'),
    atas_nama: ATAS_NAMA
  },
  nama_yayasan: (process.env.NAMA_YAYASAN || '').trim() || ATAS_NAMA,
  alamat: (process.env.ALAMAT_YAYASAN || '').trim()
}

// Jumlah proxy terpercaya di depan app (Railway/Nginx = 1) agar IP klien benar.
export const TRUST_PROXY = Number(process.env.TRUST_PROXY ?? (IS_PRODUCTION ? 1 : 0))

// Batas nominal & jendela pembatalan transaksi kasir. Bisa diubah lewat environment.
const angka = (nama, bawaan) => { const n = Number(process.env[nama]); return Number.isInteger(n) && n > 0 ? n : bawaan }
export const TOPUP_MIN = angka('TOPUP_MIN', 10000)
export const TOPUP_MAKS = angka('TOPUP_MAKS', 2000000)
export const TAGIHAN_MAKS = angka('TAGIHAN_MAKS', 100000000)
export const VOID_MENIT = angka('VOID_MENIT', 15)

// Password awal akun siswa/orang tua/PIC yang dibuat admin. Pengguna WAJIB menggantinya
// saat login pertama. Akun admin tidak pernah memakai password awal bersama (selalu acak).
export const PASSWORD_AWAL = process.env.PASSWORD_AWAL || '123456'
