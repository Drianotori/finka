# Perbaikan Finka — 4 Oktober 2026

Perbaikan utama:
- Upload bukti transfer ortu sekarang benar-benar menyimpan gambar ke database dan bisa dilihat Admin.
- Tombol "Perbesar" bukti transfer sekarang membuka preview gambar.
- Notifikasi pembayaran ditolak/diterima kembali dimuat di dashboard ortu.
- Status pembayaran tagihan tidak bisa dibuat berkali-kali saat masih menunggu verifikasi.
- Tagihan yang sudah lunas ditolak server jika ada percobaan pembayaran ulang.
- Tombol "Periksa status" mengambil status langsung dari backend dan tetap bisa bekerja setelah halaman status di-refresh melalui ID request.
- Halaman khusus role diperketat: Ortu tidak bisa masuk Admin, Admin tidak bisa membuka halaman Siswa/PIC, dan role lain diarahkan ke halaman masing-masing.
- Login tidak lagi menerima `next` yang tidak sesuai dengan role akun.
- Getter Admin sekarang membaca role akun sebenarnya, bukan state UI lama.
- Migrasi database menambahkan kolom bukti transfer secara aman saat backend dijalankan.

Catatan:
- Bukti transfer dibatasi maksimal 5 MB dan format JPG/PNG/WEBP.
- Jalankan backend dan Nuxt seperti biasa setelah mengganti source.


## Siap-deploy (4 Okt 2026, sesi 2)
- Frontend: alamat API lewat `publicRuntimeConfig`; mode SPA (perbaikan halaman mati saat F5); layout penuh layar di HP; jam/sapaan/timestamp WIB sungguhan; akun demo dihapus dari halaman login.
- Backend: secret wajib di produksi, tanpa akun demo di produksi, admin pertama via env, rate limit login & PIN, helmet, CORS, health check DB, error async tidak mematikan server, pool DB tahan putus, QR unik, bigint -> angka.
- Fitur: kontrol orang tua (limit harian + blokir kartu) kini tersimpan & ditegakkan server. Kartu "Reset PIN anak (OTP)" dihapus karena belum ada backend-nya.

## Sesi 3 (5 Okt 2026)
- Rekening tujuan & identitas yayasan kini dari environment server (`REKENING_*`, wajib di produksi); data contoh (BCA 872 011 4556 / Yayasan Nurul Ilmi / alamat Bandung) dihapus dari 5 halaman.
- Hitung mundur palsu di instruksi transfer dihapus; tombol Salin benar-benar menyalin ke clipboard.
- Panel "Mutasi bank masuk" palsu (selalu hijau "Cocok") diganti panduan cek manual yang jujur.
- Outlet: kolom stok & badge "Sesi buka" palsu dihapus. Pengaturan: aturan kode unik terisi.
- Kunci PIN pindah ke database (tahan restart & multi-instance). Admin bisa Reset PIN siswa (menu Admin > Siswa), PIN acak crypto, tampil sekali.
- Tes baru: `npm run pin-test`.

## Sesi 4 (5 Okt 2026)
- BUG KRITIS: admin tidak bisa menerbitkan tagihan massal (regex tanggal `\\d` salah tulis -> selalu 400). Diperbaiki + tes regresi. Halaman buat tagihan kini menampilkan pesan error/sukses (sebelumnya kosong) dan nomor/tanggal terbit tidak lagi statis.
- Kas tunai laci: bukan lagi angka palsu 420.000; kas awal diisi PIC, sisa dihitung server, penarikan melebihi sisa ditolak.
- Dasbor siswa: limit harian sungguhan dari pengaturan orang tua; teks QR "30 detik".
- Ganti password untuk semua peran (`/akun/password`, POST /auth/ganti-password).
- Tes baru: `npm run akun-test`. Tes browser: 27 langkah.

## Sesi 5 (2026-10-05)
- Perbaikan ekspor CSV audit log (`\n` dan BOM sebelumnya tertulis literal).
- Ditambah `Dockerfile`, `.dockerignore`, `railway.json` untuk backend dan frontend.
- Ditambah `backend/scripts/backup.sh` dan `restore.sh` (diuji: dump lalu restore ke DB lain, jumlah data sama) dan panduan di DEPLOY.md bagian 9-10.

## Sesi 6 (2026-10-05)
- Admin: reset password pengguna, koreksi saldo (ledger `penyesuaian`), batal tagihan (status `batal`, migrasi otomatis constraint), daftar tagihan dengan pencarian.
- PIC: kelola produk (ubah harga/nama, hapus). Hapus produk juga mengosongkan item itu dari keranjang.
- Laporan: koreksi saldo tidak lagi terbaca sebagai selisih rekonsiliasi.
- Perbaikan UI: kotak PIN/password sementara tidak lagi tampil kosong saat menunggu server. Judul "Tunggakan per kelas" memakai bulan berjalan (sebelumnya "September 2026" tetap). Tombol "Pengingat (segera)" yang nonaktif dihapus.
- Tes baru: `npm run fitur-test` (41 pemeriksaan). Browser e2e 32 langkah, semua lulus.

## Sesi 7 (2026-10-05)
- Impor siswa + orang tua dari CSV (periksa dulu, simpan semua-atau-tidak-sama-sekali, kredensial acak sekali tampil, unduh CSV). Backend `routes/admin/impor.js`, parser `nuxt-app/utils/csv.js`.
- Tes baru: `npm run impor-test` (21 pemeriksaan), `node scripts/csv-test.mjs` (9), e2e browser 34 langkah, semua lulus.

## Sesi 8 (2026-10-06)
- Wajib ganti password sementara (reset/impor), batas top-up, siswa ganti PIN sendiri, cetak struk.
- Kasir: riwayat hari ini, batalkan transaksi (baris pembalik, jendela 15 menit), tutup kas dengan selisih; admin melihat tutup kas di halaman Outlet.
- Admin: ubah tagihan, ekspor CSV (transaksi, rekap harian, tagihan, saldo siswa), kenaikan kelas, arsip lulusan, ubah/hapus produk di halaman Outlet.
- Tes baru: `kasir-test` (43), `admin2-test` (39). Browser e2e 42 langkah, semua lulus.

## Sesi 9 — Form "Tambah akun" baru
- Modal satu layar: pilih jenis (Orang tua / Siswa / PIC), isian menyesuaikan (Nama, Hubungan, Nomor HP, Email opsional, outlet untuk PIC, kelas/NIS untuk siswa).
- Username dan password awal dibuat otomatis, ditampilkan sekali; pengguna wajib ganti password saat login pertama.
- Kolom baru `users.hubungan`, `no_hp`, `email` (migrasi otomatis). Email baru disimpan sebagai kontak; pengiriman notifikasi email belum ada.
- Tes baru: `npm run akun-baru-test`.

## Sesi 10 — Kelengkapan form pendaftaran
- Form orang tua bisa mendaftarkan anak baru sekaligus (maks. 10; semua dalam satu transaksi, gagal satu = batal semua). Kredensial anak ditampilkan sekali.
- Nomor HP orang tua tidak boleh kembar (409 dengan nama akun yang memakainya).
- Daftar akun menampilkan Kontak (HP/email) dan Hubungan; tombol Kelola bisa mengubah hubungan/HP/email (`PUT /admin/users/:id/kontak`, tercatat di audit `UBAH_KONTAK`).
- Modal "Tambah Siswa + Orang Tua" ikut menerima hubungan/HP/email.

## Sesi 11 — Instal di Windows
- `better-sqlite3` (hanya untuk skrip migrasi lama) dipindah ke `optionalDependencies`: `npm install` tidak lagi gagal di Windows tanpa Visual Studio C++.
- Skrip frontend memakai `cross-env NODE_OPTIONS=--openssl-legacy-provider` supaya `npm run dev` jalan di Node 18+ pada Windows/Mac/Linux.

## Sesi 12 — Orang tua bisa reset PIN anak
- `POST /api/ortu/anak/:id/reset-pin` (hanya orang tua pemilik anak). PIN acak 6 digit ditampilkan sekali, PIN lama tidak berlaku, kunci percobaan dibuka. Dibatasi 5x/24 jam per anak; tercatat di audit (`RESET_PIN_ORTU`).
- Tombol "Buat PIN baru" di halaman Kontrol Orang Tua.

## Sesi 13 — Password awal 123456
- Akun siswa, orang tua, dan PIC yang dibuat admin (form, impor CSV, anak baru) memakai password awal `123456` (ubah lewat env `PASSWORD_AWAL`). Wajib diganti saat login pertama; password baru minimal 8 karakter sehingga `123456` tidak bisa dipertahankan. Admin baru tetap memakai password acak.
- `POST /api/admin/users/reset-password-massal` + tombol "Reset password massal" (per peran, siswa bisa per kelas, ketik RESET). Admin tidak ikut. Tercatat di audit.
- Akun demo (SEED_DEMO): siswa/ortu/PIC kini `123456`; admin tetap `admin123`.
- Tiap peran bisa ganti password sendiri dari dashboard (menu Password / Ganti password).

## Sesi 14 — Uji kesiapan deploy
- Diuji dari zip bersih: `npm ci`, mode produksi, penolakan start tanpa konfigurasi, tanpa akun demo, pembatasan login, CORS, header keamanan, JWT palsu, SQL injection, data bertahan setelah restart, backup.
- Admin pertama dari `ADMIN_PASSWORD` kini wajib ganti password saat login pertama.
