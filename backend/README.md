# Finka Backend — Fase 1: Fondasi (+ perluasan utk integrasi frontend)

Backend nyata untuk Finka: API + database + autentikasi + ledger transaksi.
Ini menggantikan store Vuex di `nuxt-app/` yang lama (yang datanya dummy dan
hilang saat refresh) dengan server yang benar-benar menyimpan data dan
menghitung saldo dari riwayat transaksi.

**Status: sudah tersambung ke frontend Nuxt** (folder `nuxt-app/` di
sebelah `backend/` ini) untuk alur ortu (dashboard, isi saldo, bayar
tagihan, riwayat) dan satu halaman admin (verifikasi top-up). Peran
siswa, pic, dan halaman admin lainnya (laporan, outlet, audit,
pengaturan, buat tagihan) masih pakai data mock seperti prototipe asli.

## Menjalankan

```bash
npm install
npm run seed   # isi database dengan akun & data contoh (hapus data lama)
npm run dev    # jalan di http://localhost:3001
```

Tes otomatis backend (login, top-up, beli, tolak transaksi saldo kurang, dll):

```bash
npm run smoke-test   # jalankan di terminal LAIN selagi `npm run dev` aktif
```

## Akun demo (dibuat oleh `npm run seed`)

| Role  | Username     | Password  | Catatan          |
|-------|--------------|-----------|------------------|
| admin | `admin`      | `admin123`|                  |
| ortu  | `ortu.sari`  | `123456` | wali Aditya & Kayla |
| pic   | `pic.kantin` | `123456`  |                  |
| siswa | `aditya.p`   | `123456`| PIN kasir: `135790` |
| siswa | `kayla.p`    | `123456`| PIN kasir: `135790` |

Login pakai **username**, bukan email — sengaja, supaya siswa SD/SMP yang
belum tentu punya email sendiri tetap bisa punya akun.

## Endpoint utama

| Method & Path                     | Role         | Fungsi |
|-----------------------------------|--------------|--------|
| `POST /api/auth/login`            | semua        | login, dapat JWT |
| `GET  /api/auth/me`               | semua        | profil dari token |
| `GET  /api/ortu/anak-anak`        | ortu         | daftar anak + saldo masing² |
| `GET  /api/siswa/:id/saldo`       | siswa/ortu/pic/admin | saldo = SUM(ledger) |
| `GET  /api/siswa/:id/riwayat`     | siswa/ortu/pic/admin | 100 transaksi terakhir + saldo berjalan |
| `POST /api/topup`                 | ortu         | ajukan top-up (saldo saku ATAU `tagihan_id` utk bayar tagihan spesifik) |
| `GET  /api/topup?status=`         | admin        | antrean verifikasi |
| `GET  /api/topup/:id`             | ortu pemilik/admin | status satu permintaan |
| `POST /api/topup/:id/approve`     | admin        | kredit saldo (atau lunaskan tagihan kalau `tagihan_id` terisi) |
| `POST /api/topup/:id/tolak`       | admin        | tolak + catat alasan opsional |
| `GET  /api/tagihan?siswa_id=`     | semua        | daftar tagihan siswa |
| `POST /api/tagihan/:id/bayar`     | ortu/siswa   | bayar langsung dari saldo saku (endpoint tersedia, tapi UI ortu saat ini pakai alur transfer+verifikasi di atas, bukan ini — lihat catatan desain) |
| `POST /api/pos/verifikasi-pin`    | pic          | cek PIN cepat (tidak potong saldo) |
| `POST /api/pos/transaksi`         | pic          | cek PIN lagi + potong saldo |
| `POST /api/pos/tarik-tunai`       | pic          | cek PIN lagi + potong saldo |

## Keputusan desain yang penting

- **Saldo tidak pernah disimpan sebagai angka.** Saldo = jumlah semua baris
  di tabel `ledger` untuk siswa itu. Setiap top-up, pembelian, penarikan
  tunai, dan pembayaran tagihan menambah baris baru, tidak pernah
  mengubah baris lama. Ini yang membuat saldo tidak bisa "hilang" akibat
  bug di satu tempat, dan bisa ditelusuri.
- **Dua jalur uang yang terpisah, sesuai desain UI asli:** top-up biasa
  menambah saldo saku (dipakai jajan di kantin/koperasi); top-up dengan
  `tagihan_id` adalah transfer yang di-earmark utk satu tagihan (mis. SPP)
  dan saat disetujui HANYA melunaskan tagihan itu — TIDAK menambah saldo
  saku, karena uangnya memang tidak pernah masuk dompet jajan.
- **Cek saldo + tulis ledger terjadi dalam satu transaksi database**
  (`db.transaction(...)`), supaya tidak mungkin ada dua pembelian
  bersamaan yang sama-sama lolos padahal saldo cuma cukup untuk satu.
- **PIN dicek ulang di setiap endpoint yang memindahkan uang**
  (`/pos/transaksi`, `/pos/tarik-tunai`), bukan cuma sekali di layar PIN.
  `/pos/verifikasi-pin` cuma untuk feedback cepat di UI.
- **Role dari token, bukan dari body request** — klien tidak bisa
  berpura-pura jadi admin dengan mengirim `"role": "admin"` di JSON.

## Yang BELUM ada — perlu ditambah sebelum benar-benar live

Ini bukan bug, ini memang di luar cakupan "Fondasi" dan masuk fase
berikutnya di dokumen kebutuhan teknis:

- **Top-up masih disetujui manual oleh admin lewat endpoint.** Belum ada
  webhook dari bank/payment gateway asli yang mencocokkan otomatis — itu
  Fase 2 (Alur uang nyata). Panel "mutasi bank" di halaman verifikasi
  admin masih ilustratif untuk alasan yang sama.
- **PostgreSQL digunakan sebagai database utama.** Untuk development lokal maupun production, backend terhubung melalui `DATABASE_URL`. Untuk beban banyak
  sekolah sekaligus, pertimbangkan migrasi ke PostgreSQL (skema di
  `src/db.js` memakai SQL standar, jadi portabel).
- **Belum ada rate-limiting** di `/auth/login` dan `/pos/verifikasi-pin` —
  wajib ditambah supaya tidak bisa ditebak brute-force.
- **`JWT_SECRET` default di kode cuma untuk development.** Set env var
  `JWT_SECRET` ke nilai acak yang panjang sebelum deploy — lihat
  `.env.example`.
- **Upload bukti transfer masih placeholder** di langkah "unggah bukti" —
  itu Fase 3 (Integrasi perangkat).
- **QR asli & kamera scan belum ada** — juga Fase 3.

## Pendaftaran siswa + orang tua

Admin dapat membuka **Manajemen Akun Siswa & Orang Tua → Tambah Siswa + Orang Tua**.
Satu kali simpan akan membuat akun siswa dan akun orang tua dalam **satu transaksi PostgreSQL**
dan langsung menghubungkan keduanya.

- Username siswa otomatis = **NIS**, sehingga login siswa memakai **NIS + password**.
- Username/password orang tua diisi admin.
- NIS dan username diperiksa agar tidak duplikat.
- Jika proses gagal, transaksi dibatalkan sehingga tidak tercipta akun setengah jadi.
- Tidak perlu menjalankan seed setelah menambah akun.

`npm run seed` juga sudah aman: jika database sudah berisi user, seed dilewati dan data lama tidak dihapus. Lihat `README-POSTGRES.md` untuk setup PostgreSQL dan migrasi dari SQLite.
