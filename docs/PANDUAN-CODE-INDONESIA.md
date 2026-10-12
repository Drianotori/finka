# Panduan Kode Finka V2

Dokumen ini dibuat supaya programmer Indonesia yang baru masuk ke project Finka bisa membaca source code tanpa harus menebak-nebak fungsi tiap folder.

## 1. Gambaran singkat

Finka terdiri dari dua aplikasi:

```text
finka-work/
├── backend/          # API Express + SQLite
├── nuxt-app/         # Frontend Nuxt 2 + Vue 2
├── docs/             # Dokumentasi teknis
└── README.md
```

Alur sederhananya:

```text
Browser
  ↓
Nuxt / Vue
  ↓
plugins/api.js
  ↓ HTTP + JWT
Express API
  ↓
route
  ↓
database SQLite
```

## 2. Aturan penamaan

Gunakan nama yang jelas dan konsisten.

### JavaScript

- `camelCase` untuk variabel dan fungsi.
- `PascalCase` untuk nama komponen Vue.
- Konstanta tetap menggunakan `UPPER_SNAKE_CASE` jika nilainya memang konstan.
- Nama fungsi menggunakan kata kerja: `muatAnak()`, `ajukanTopup()`, `approveTopup()`.

Contoh:

```js
const AMBANG_MENIPIS = 20000

async function muatDataSiswa() {
  // ambil data siswa dari API
}
```

### Vue

- Nama komponen: `StatusBadge.vue`, `EmptyState.vue`.
- `props` memakai nama yang menjelaskan isi: `status`, `judul`, `pesan`.
- Class CSS menggunakan pola BEM sederhana:
  - `.kartu`
  - `.kartu__nama`
  - `.kartu--navy`

## 3. Pembagian tanggung jawab

### Frontend

`pages/`

Tempat halaman utama. Sebaiknya halaman hanya mengatur tampilan dan memanggil store/API.

`components/`

Komponen yang bisa digunakan kembali di beberapa halaman.

`store/`

State aplikasi Vuex. Data yang dipakai beberapa halaman sebaiknya berada di sini.

`plugins/api.js`

Satu pintu untuk komunikasi frontend ke backend.

`middleware/`

Pengecekan akses halaman berdasarkan login dan role.

`assets/css/main.css`

Design system dan CSS umum. CSS yang sangat khusus halaman tetap boleh berada di `<style scoped>` halaman tersebut.

### Backend

`routes/`

Endpoint API. Setiap route sebaiknya fokus pada satu area bisnis.

`middleware/`

Login dan pengecekan role.

`db.js`

Koneksi database dan fungsi database umum.

`audit.js`

Pencatatan aktivitas penting admin/sistem.

## 4. Cara mencari bug

Gunakan urutan ini agar tidak langsung mengubah banyak file.

### Bug tampilan

```text
pages/*.vue
↓
components/*.vue
↓
assets/css/main.css
```

### Bug tombol atau interaksi

```text
pages/*.vue
↓
methods / computed
↓
store/*.js
↓
plugins/api.js
```

### Bug data tidak masuk database

```text
pages/*.vue
↓
plugins/api.js
↓
routes/*.js
↓
db.js
```

### Bug hak akses

```text
middleware/auth.js
middleware/role.js
↓
routes/*.js
```

## 5. Status pembayaran

Status yang disimpan backend:

| Status | Arti |
|---|---|
| `menunggu` | Pengajuan belum diproses admin |
| `disetujui` | Pembayaran sudah diterima |
| `ditolak` | Pembayaran ditolak |

Tampilan status sebaiknya menggunakan `StatusBadge.vue`, sehingga label dan warna tidak dibuat ulang di setiap halaman.

## 6. Empty state

Jika daftar kosong, gunakan `EmptyState.vue` daripada membuat markup sendiri berulang kali.

Contoh:

```vue
<EmptyState
  ikon="▱"
  judul="Belum ada transaksi"
  pesan="Transaksi akan muncul di sini."
/>
```

## 7. CSS

Gunakan class umum jika memungkinkan:

```html
<div class="card">
  <div class="stack">
    <h1 class="page__title">Dashboard</h1>
    <p class="page__subtitle">Ringkasan aktivitas hari ini.</p>
  </div>
</div>
```

Class umum yang tersedia antara lain:

- `.page`
- `.page__header`
- `.page__title`
- `.page__subtitle`
- `.stack`
- `.row`
- `.grid`
- `.form-group`
- `.input`
- `.select`
- `.textarea`
- `.alert`
- `.table`
- `.sr-only`

## 8. Prinsip saat menambah fitur

1. Jangan menaruh query SQL di halaman Vue.
2. Jangan menaruh aturan bisnis penting hanya di frontend.
3. Validasi transaksi tetap dilakukan backend.
4. Jangan menduplikasi fungsi API jika endpoint yang sama sudah tersedia.
5. Jika komponen dipakai minimal dua halaman, pertimbangkan memindahkannya ke `components/`.
6. Gunakan komentar untuk menjelaskan **kenapa**, bukan sekadar menjelaskan sintaks.
7. Sebelum commit, jalankan pemeriksaan syntax dan test yang tersedia.

## 9. Checklist sebelum menyerahkan perubahan

- [ ] Nama variabel/fungsi mudah dipahami.
- [ ] Tidak ada query SQL di Vue.
- [ ] Error API memiliki pesan yang jelas.
- [ ] Loading dan empty state sudah ditangani.
- [ ] Tombol memiliki kondisi disabled ketika proses berjalan.
- [ ] Tampilan mobile tidak rusak.
- [ ] Status pembayaran memakai istilah yang sama di frontend dan backend.
- [ ] Test backend tetap lulus.
- [ ] `npm run build` frontend tetap lulus.
