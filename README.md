> **Deploy ke produksi: baca `DEPLOY.md`.** Beberapa bagian README di bawah dibuat saat fase awal dan sebagian sudah usang (mis. daftar halaman "belum tersambung").

# Finka v2 — Backend nyata + Frontend tersambung

Dua folder di sini bekerja bersama:

- `backend/` — API + database + autentikasi + ledger (lihat `backend/README.md`)
- `nuxt-app/` — UI asli (semua 51 file desain), sekarang sebagian tersambung ke backend di atas, bukan lagi data dummy di Vuex

## Menjalankan keduanya

```bash
# Terminal 1
cd backend
npm install
npm run seed
npm run dev            # http://localhost:3001

# Terminal 2
cd nuxt-app
npm install
npm run dev             # http://localhost:3000
```

Buka `http://localhost:3000`, atau langsung `http://localhost:3000/login`.
Halaman login punya tombol pintasan buat isi akun demo (ortu & admin).

## Apa yang SUDAH tersambung nyata

- **Login** (semua role, lewat `POST /auth/login`, sesi disimpan JWT + localStorage supaya refresh tidak logout)
- **Ortu**: dashboard (saldo & anak asli), isi saldo (kode unik & ID permintaan asli dari server), status top-up (polling status asli, tombol simulasi "admin menyetujui" sudah **dihapus**), tagihan (daftar & bayar via transfer asli), riwayat (ledger asli lintas anak, dengan saldo berjalan)
- **Admin**: halaman verifikasi top-up (antrean asli, setujui/tolak asli, tolak dengan alasan tercatat ke database)

## Apa yang BELUM tersambung (masih data mock seperti prototipe asli)

- Peran **siswa** dan **PIC** — seluruh halamannya
- Halaman admin lain: laporan, outlet, audit, pengaturan, buat tagihan
- `ortu/kontrol.vue` (limit harian, blokir kartu) dan `ortu/notifikasi.vue`
- Upload bukti transfer (masih placeholder, sesuai desain aslinya)
- Panel "mutasi bank masuk" di halaman verifikasi admin (pencocokan otomatis dgn bank asli adalah Fase 2)

## Bagaimana ini diuji

Karena lingkungan saya tidak punya browser, verifikasinya berlapis:

1. **19 skenario backend** (`backend/npm run smoke-test`) — login, ledger, saldo kurang ditolak, dst.
2. **`nuxt build` produksi** — memastikan semua file `.vue` yang saya ubah benar-benar valid (tidak ada typo sintaks/binding yang lolos) tanpa satu error pun.
3. **14 skenario integrasi** (`nuxt-app/scripts/integration-test.mjs`) — memanggil `plugins/api.js`, modul JavaScript yang SAMA PERSIS dipakai halaman Vue, langsung ke backend yang jalan. Mencakup alur penuh: ortu ajukan top-up → masuk antrean admin → admin setujui → saldo ortu naik → tercatat di riwayat; juga alur bayar tagihan (yang TIDAK menyentuh saldo saku), alur penolakan, dan percobaan akses ilegal.
4. **Nuxt server dinyalakan sungguhan** dan halaman `/`, `/login`, `/ortu`, `/admin/verifikasi` dicek merespons 200 tanpa crash.

Yang **belum** bisa saya verifikasi tanpa browser: interaksi klik-per-klik
sungguhan (isi form, tekan tombol, lihat transisi halaman), tampilan visual
di layar, dan perilaku redirect `/login` di kondisi nyata (logikanya ada di
`middleware/auth.js` dan sudah saya tulis hati-hati, tapi belum saya lihat
langsung jalan di browser). Jalankan `npm run dev` di kedua folder dan
coba sendiri di browser sebagai langkah verifikasi terakhir.

## Langkah wajar berikutnya

1. Coba sendiri di browser, laporkan kalau ada yang terasa aneh
2. Sambungkan peran siswa & PIC (pola yang sama seperti ortu)
3. Fase 2 dari dokumen kebutuhan teknis: top-up otomatis via webhook bank, ganti PIN/JWT default, rate-limiting


## Hak Akses PIC / Outlet

Akun `pic` terikat ke satu outlet: `kantin_utama`, `kantin_b`, atau `koperasi`. PIC hanya dapat login ke `/pic`, melihat produk outletnya, membuat produk baru untuk outletnya, dan menjalankan transaksi POS. Endpoint backend juga memeriksa outlet sehingga PIC tidak dapat mengakses atau menjual produk milik outlet lain hanya dengan memanipulasi frontend.

Akun seed:
- `pic.kantin.utama` / `123456` — Kantin Utama
- `pic.kantin.b` / `123456` — Kantin Blok B
- `pic.koperasi` / `123456` — Koperasi Sekolah

## Dashboard Yayasan — finalisasi rekonsiliasi

Dashboard Admin sekarang memakai satu sumber perhitungan yang sama dengan Laporan & Rekonsiliasi (`backend/src/routes/laporan.js`).

- Uang masuk = top-up saldo + pembayaran tagihan langsung.
- Uang keluar = debit ledger + settlement pembayaran tagihan langsung.
- Perubahan saldo agregat = total perubahan seluruh saldo siswa dari ledger.
- Selisih = uang masuk - uang keluar - perubahan saldo agregat.
- Grafik 14 hari memakai definisi arus yang sama dan tetap menampilkan hari tanpa transaksi sebagai Rp0.
- Transaksi per outlet selalu menampilkan Kantin Utama, Kantin Blok B, dan Koperasi Sekolah, termasuk outlet dengan 0 transaksi.
- Dashboard tidak lagi menggunakan angka contoh/dummy.
- Header admin menampilkan tanggal WIB aktual, bukan tanggal hard-coded.
- Audit Log mendukung refresh, pemuatan log lebih lama, referensi tabel/ID, dan ekspor CSV.

### Pemeriksaan source

Semua file JavaScript backend di `src/` dan `scripts/` lulus `node --check` pada saat paket dibuat.

Runtime end-to-end memerlukan dependency npm terpasang. Jalankan dari folder `backend`:

```bash
npm ci
npm run seed
npm run dev
```

Lalu jalankan smoke test pada terminal lain:

```bash
BASE_URL=http://localhost:3001/api npm run smoke-test
```


## Pembaruan 2026-09-17 — Akun Siswa + Orang Tua
- Admin dapat membuat siswa + orang tua dalam satu transaksi database.
- Username siswa otomatis menggunakan NIS.
- Akun siswa baru otomatis mendapatkan PIN POS 6 digit; PIN plaintext hanya dikembalikan sekali pada respons pembuatan akun untuk dicatat Admin.
- Akun pengguna memiliki status aktif/nonaktif. Menonaktifkan akun tidak menghapus histori ledger, tagihan, top-up, atau audit.
- JWT tetap diverifikasi, lalu status akun dibaca ulang dari SQLite pada setiap request terlindungi; akun nonaktif langsung ditolak.
- Pembayaran transfer yang ditujukan ke tagihan harus memiliki nominal yang sama persis dengan nominal tagihan dan siswa/tagihannya harus cocok.
- Tombol Admin menyediakan Aktifkan/Nonaktifkan sebagai pengganti penghapusan data untuk kebutuhan operasional normal.

## V2 Work Revision — 28 Sep 2026

Perubahan yang sudah diterapkan:
- PIC: tombol `−/+` pada item yang sudah dipilih dan tombol `Reset` untuk mengosongkan input transaksi.
- Orang tua: status top-up/pembayaran sekarang masuk ke halaman Notifikasi, termasuk status ditolak.
- Dashboard orang tua: riwayat top-up dan pembayaran tagihan ditampilkan dengan status.
- Admin: label `Verifikasi Top-up` diganti menjadi `Verifikasi Pembayaran`.
- Admin: pembayaran yang sebelumnya ditolak dapat diterima kembali melalui `Terima pembayaran yang terlambat`; sistem mencegah proses ganda.
- Orang tua mendapat notifikasi khusus jika pembayaran yang sebelumnya ditolak kemudian diterima.
- Sesi login frontend memakai `sessionStorage`, sehingga beberapa tab dapat login ke akun berbeda tanpa saling menimpa token.

### DOKU Payment Gateway
Integrasi otomatis DOKU belum diaktifkan pada revisi ini karena membutuhkan kredensial merchant, endpoint/webhook, dan konfigurasi lingkungan DOKU. Struktur verifikasi manual tetap menjadi fallback sampai kredensial tersebut tersedia.


## Perapian Kode — 28 Sep 2026

Kode dirapikan agar lebih mudah dipahami programmer Indonesia tanpa mengubah alur bisnis yang sudah berjalan.

- Ditambahkan `docs/PANDUAN-CODE-INDONESIA.md` untuk aturan penamaan, struktur, alur bug fixing, CSS, dan checklist.
- Ditambahkan `docs/STRUKTUR-FOLDER.md` sebagai peta folder backend/frontend.
- Ditambahkan komponen reusable `StatusBadge.vue` dan `EmptyState.vue`.
- Dashboard Orang Tua menggunakan komponen status dan empty state yang reusable.
- `assets/css/main.css` ditambah class umum untuk layout, form, alert, table, accessibility, dan responsive mobile.
- File inti backend/frontend diberi komentar berbahasa Indonesia yang menjelaskan tanggung jawab file.
- Whitespace source dibersihkan dan syntax JavaScript backend diperiksa ulang.

Catatan: CSS khusus halaman tetap berada di `<style scoped>` jika memang hanya dipakai oleh halaman tersebut. CSS umum ditempatkan di `assets/css/main.css` agar tidak terjadi duplikasi.
