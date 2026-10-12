# Panduan Deploy Finka

Dua layanan terpisah: **backend** (Express + PostgreSQL) dan **nuxt-app** (frontend Nuxt 2, mode SPA).

## 0. Sebelum apa pun
- Jangan pernah memasukkan `.env` ke zip/Git. Hanya `.env.example` yang boleh ikut.
- Kalau `.env` lama pernah terkirim ke pihak lain, ganti password database di penyedia hosting.

## 1. Backend
Environment yang harus diset di hosting (lihat `backend/.env.example`):

| Variabel | Keterangan |
|---|---|
| `NODE_ENV=production` | Mengaktifkan pemeriksaan keamanan & mematikan akun demo |
| `DATABASE_URL` | Connection string PostgreSQL (`DB_SSL=true` jika penyedia mewajibkan) |
| `JWT_SECRET`, `QR_SECRET` | Acak ≥ 32 karakter, harus berbeda. Server menolak start jika tidak valid |
| `CORS_ORIGINS` | URL frontend, mis. `https://finka.sekolah.sch.id` |
| `TRUST_PROXY=1` | Jika di belakang proxy (Railway, Nginx) |
| `REKENING_BANK`, `REKENING_NOMOR`, `REKENING_ATAS_NAMA` | Rekening tujuan transfer yang tampil ke orang tua. **Wajib**, server menolak start jika kosong. Opsional: `NAMA_YAYASAN`, `ALAMAT_YAYASAN` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Hanya untuk membuat admin pertama saat DB kosong |

Perintah: `npm ci --omit=dev` lalu `npm start`. Skema tabel dibuat otomatis saat start.
Health check untuk hosting: `GET /api/health` (mengecek koneksi database, 503 jika putus).

Setelah login admin pertama berhasil, **hapus `ADMIN_PASSWORD`** dari environment.

## 2. Frontend
- Set `API_BASE_URL=https://<domain-backend>/api` di environment hosting frontend.
- `npm ci && npm run build && npm start` (variabel dibaca saat `npm start`, tidak perlu build ulang bila URL berubah).
- Frontend berjalan dalam **mode SPA** (`ssr: false`) karena token login hanya ada di browser. Jangan diaktifkan kembali: memuat ulang halaman (F5) akan rusak (error hidrasi).

## 3. Keamanan yang sudah aktif
- Login dibatasi 10 percobaan gagal / 15 menit / IP.
- PIN siswa terkunci 15 menit setelah 5 kali salah (disimpan di database, jadi tetap berlaku setelah restart dan aman untuk lebih dari satu instance).
- `helmet`, CORS dibatasi, error async tidak mematikan server, graceful shutdown (SIGTERM).

## 4. Uji cepat setelah deploy
1. Buka `<frontend>/login`, login sebagai admin pertama.
2. Buat siswa + orang tua, login sebagai orang tua, ajukan top-up, setujui sebagai admin.
3. `GET <backend>/api/health` harus `{"ok":true}`.

## 5. Tes otomatis (opsional, butuh PostgreSQL kosong)
```bash
cd backend && npm run seed && npm run dev          # terminal 1 (NODE_ENV=development)
BASE_URL=http://localhost:3001/api npm run smoke-test    # terminal 2, DB baru
BASE_URL=http://localhost:3001/api npm run kontrol-test  # DB baru lagi (tes limit harian & blokir kartu)
BASE_URL=http://localhost:3001/api npm run pin-test      # DB baru lagi (kunci PIN & reset PIN)
BASE_URL=http://localhost:3001/api npm run akun-test     # DB baru lagi (ganti password, kas tunai, terbit tagihan)
BASE_URL=http://localhost:3001/api npm run fitur-test    # DB baru lagi (reset password, koreksi saldo, batal tagihan, edit produk)
BASE_URL=http://localhost:3001/api npm run impor-test    # DB baru lagi (impor siswa+ortu dari CSV)
BASE_URL=http://localhost:3001/api npm run kasir-test    # DB baru lagi (ganti PIN siswa, riwayat kasir, batal transaksi, tutup kas)
BASE_URL=http://localhost:3001/api npm run admin2-test   # DB baru lagi (edit tagihan, ekspor CSV, kenaikan kelas, arsip)
(cd ../nuxt-app && node scripts/csv-test.mjs)             # parser CSV, tanpa database
```
Setiap suite mengubah saldo siswa demo, jadi jalankan masing-masing pada database baru.

## 6. Fitur kontrol orang tua (sudah nyata)
Limit belanja harian dan blokir kartu disimpan di database (`siswa_profil`) dan dipaksakan server pada setiap transaksi POS, tarik tunai, dan scan QR. Limit default nonaktif untuk siswa yang sudah ada.

## 7. Kas tunai di laci
PIC mengisi **kas awal** tiap hari: ketuk label "Kas tunai" di halaman kasir. Sisa kas = kas awal − penarikan tunai hari itu di outlet tersebut. Penarikan melebihi sisa ditolak server. Jika kas awal belum diisi, penarikan tidak dibatasi.

## 8. Ganti password
Semua peran punya tombol "Password" (admin: header; ortu/PIC: pojok kanan atas; siswa: menu pengaturan). Minimal 8 karakter, wajib password lama.

## 9. Docker & Railway
Tiap layanan punya `Dockerfile` dan `railway.json` sendiri (`backend/` dan `nuxt-app/`).
Di Railway: buat 3 komponen dalam satu project: **PostgreSQL**, **backend** (Root Directory `backend`), **frontend** (Root Directory `nuxt-app`). Railway otomatis memakai Dockerfile dan health check yang tertulis di `railway.json`.
- Backend: set variabel di tabel bagian 1. Pakai `DATABASE_URL` dari plugin PostgreSQL Railway (referensi variabel). Jika koneksi ditolak karena SSL, set `DB_SSL=true`.
- Frontend: set `API_BASE_URL=https://<domain-backend>/api`. Setelah domain frontend jadi, isi `CORS_ORIGINS` di backend dengan domain itu.
- Uji lokal: `docker build -t finka-api backend` dan `docker build -t finka-web nuxt-app`.
- Catatan: image ini belum pernah dibuild di lingkungan pengembangan (tidak ada Docker daemon). Langkah di dalamnya (npm ci, build, start produksi) sudah diuji manual.

## 10. Backup & restore database
Railway tidak menjamin backup otomatis di semua paket, jadi jalankan backup sendiri, **minimal harian**, dan simpan di luar server.
```bash
# butuh pg_dump (paket postgresql-client) di komputer/server pencadangan
cd backend
DATABASE_URL="postgres://..." ./scripts/backup.sh ./backups     # menyimpan 14 file terakhir (ubah dengan KEEP=30)
```
Skrip memverifikasi bahwa file backup bisa dibaca sebelum menyatakan berhasil. Jadwalkan dengan cron, mis. `0 2 * * * cd /path/backend && DATABASE_URL=... ./scripts/backup.sh /path/backups`, lalu salin ke Google Drive/S3.

Pulihkan (menimpa isi database tujuan, uji dulu ke database kosong):
```bash
TARGET_DATABASE_URL="postgres://..." ./scripts/restore.sh backups/finka-YYYYMMDD-HHMMSS.dump
```
Uji restore minimal sekali sebelum go-live; backup yang tidak pernah diuji belum bisa diandalkan. Setelah restore, jalankan backend dan cek `/api/health`.

## 11. Alat koreksi untuk admin
Semua tercatat di Audit Log (siapa, kapan, alasan).
- **Reset password** (Akun Siswa & Ortu, tombol "Reset Password"): membuat password sementara acak 10 karakter, tampil sekali. Pemilik akun diminta menggantinya lewat menu Password. Login yang sedang aktif tidak langsung putus; token lama berlaku sampai habis masa berlakunya. Jika akun dicurigai dipakai orang lain, nonaktifkan akun dulu (status akun dicek di setiap permintaan, jadi sesi lama langsung ditolak), reset password, baru aktifkan kembali setelah token lama kedaluwarsa. Mengganti `JWT_SECRET` memutus semua pengguna sekaligus; hanya untuk keadaan darurat.
- **Koreksi saldo** (tombol "Koreksi Saldo" pada baris siswa): tambah atau kurangi, maksimal Rp 5.000.000 per koreksi, alasan wajib, saldo tidak boleh negatif. Muncul di riwayat siswa sebagai "Penyesuaian saldo". Di Laporan, koreksi tambah tidak dihitung sebagai selisih rekonsiliasi (angkanya tersedia terpisah sebagai `koreksi_tambah` / `koreksi_kurang`).
- **Batal tagihan** (Tagihan & SPP → Daftar tagihan → Batalkan): hanya tagihan belum dibayar dan tidak sedang menunggu verifikasi. Datanya tetap tersimpan dengan status "Dibatalkan", disembunyikan dari orang tua dan siswa, dan tidak dihitung di ringkasan. Tagihan yang sudah lunas tidak bisa dibatalkan; gunakan koreksi saldo untuk mengembalikan uang.
- **Produk** (kasir PIC → Kelola): ubah nama/harga atau hapus. Transaksi lama tidak berubah karena rincian disimpan sebagai teks.

## 12. Impor siswa & orang tua dari CSV
Menu: Akun Siswa & Ortu → **Impor dari CSV**. Unduh templat di dalam jendela impor.
- Kolom: `nama_siswa, nis, kelas, nama_ortu` + opsional `username_ortu`. Isi `username_ortu` yang sama untuk kakak-adik agar berbagi satu akun orang tua; jika kosong dibuat otomatis `ortu.<NIS>`. Jika username itu sudah milik akun orang tua yang ada, siswa baru dihubungkan ke akun tersebut.
- Pemisah `;` `,` atau tab terdeteksi otomatis (Excel Indonesia menyimpan CSV dengan `;`). Excel `.xlsx` tidak dibaca: simpan sebagai CSV. Format kolom NIS sebagai **Teks** agar nol di depan tidak hilang dan angka tidak berubah ke notasi ilmiah (dideteksi dan ditolak).
- Alurnya dua langkah: file diperiksa dulu (tidak ada yang tersimpan), baris yang salah ditampilkan dengan nomor baris dan alasannya. **Tidak ada yang tersimpan sebelum semua baris benar** (satu transaksi, semua atau tidak sama sekali). Maksimal 300 baris per impor (sekitar 20 detik untuk 300 baris).
- Username siswa = NIS. Password siswa, password orang tua baru, dan PIN dibuat acak oleh sistem lalu **ditampilkan sekali** dalam file `akun-siswa-ortu-RAHASIA.csv` yang diunduh di akhir. Server tidak menyimpannya dalam bentuk terbaca, jadi jika file hilang gunakan Reset Password / Reset PIN. File itu rahasia: bagikan per keluarga, bukan ke grup, lalu hapus.
- Di Audit Log tercatat jumlahnya saja (`IMPOR_SISWA`), tanpa kredensial.

## 13. Password sementara wajib diganti
Password hasil **Reset Password** dan **impor CSV** ditandai sementara. Pengguna yang login dengan password itu langsung diarahkan ke halaman Ganti password, dan semua endpoint lain ditolak (403, kode `WAJIB_GANTI_PASSWORD`) sampai password diganti. Password baru harus berbeda dari yang lama.

## 14. Alat kasir (PIC)
- **Riwayat hari ini** (tombol di header layar kasir): daftar belanja dan tarik tunai outlet, dengan ringkasan.
- **Batalkan transaksi:** kasir bisa membatalkan transaksi outletnya sendiri dalam **15 menit** (ubah dengan `VOID_MENIT`); admin bisa kapan saja lewat API. Alasan wajib. Ledger tidak diubah: sistem menulis baris pembalik bertipe "Penyesuaian saldo" dan menandai transaksi asal. Transaksi yang dibatalkan tidak dihitung lagi di omzet outlet, limit harian, dan kas laci.
- **Tutup kas:** kasir mengetik hasil hitung uang fisik di laci; sistem membandingkannya dengan (kas awal - penarikan tunai) dan menyimpan selisih. Admin melihatnya di halaman Outlet & Produk ("Tutup kas hari ini"). Penutupan bisa diperbarui di hari yang sama.
- **Siswa ganti PIN sendiri:** menu pengaturan siswa, "Ganti PIN kasir". PIN lama wajib benar dan ikut aturan kunci 5 kali salah.

## 15. Alat admin tambahan
- **Batas top-up:** default minimum Rp 10.000 dan maksimum Rp 2.000.000 per pengajuan (`TOPUP_MIN`, `TOPUP_MAKS`). Pembayaran tagihan memakai nominal tagihan, bukan batas ini. Batas nominal tagihan: `TAGIHAN_MAKS` (default Rp 100.000.000).
- **Ubah tagihan** (Tagihan & SPP, tombol Ubah): nama, nominal, jatuh tempo. Hanya tagihan belum dibayar dan tidak sedang menunggu verifikasi.
- **Ekspor CSV** (Laporan, kartu "Ekspor untuk bendahara / auditor"): transaksi per rentang tanggal (maks 366 hari), rekap harian (maks 93 hari), tagihan per bulan, dan saldo semua siswa. Pemisah `;`, UTF-8 dengan BOM, aman dari injeksi rumus Excel. Setiap ekspor tercatat di audit log.
- **Kenaikan kelas & arsip lulusan** (Akun Siswa & Ortu, tombol "Kenaikan kelas"): pemetaan kelas dijalankan serentak setelah pratinjau. Arsip menonaktifkan semua siswa satu kelas (riwayat tetap) dan akun orang tua yang semua anaknya nonaktif; bila masih ada saldo, admin harus mengonfirmasi secara eksplisit. Urutan yang benar tiap tahun ajaran: arsipkan kelas lulusan, lalu naikkan kelas lainnya.
- **Halaman Outlet & Produk:** admin bisa menambah, mengubah, dan menghapus produk, serta melihat tutup kas.
- **Cetak struk:** tombol "Cetak / simpan PDF" di struk digital siswa.

## 16. Belum ada (sengaja)
Pembayaran otomatis (DOKU), notifikasi WhatsApp/email, lupa password mandiri, cicilan/diskon/denda, dan peran bendahara terpisah. Semuanya butuh kredensial atau keputusan kebijakan dari sekolah.

> Catatan: admin pertama (dari `ADMIN_PASSWORD`) otomatis diwajibkan mengganti password saat login pertama. Setelah itu hapus `ADMIN_PASSWORD` dari environment hosting.
