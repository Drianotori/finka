# Finka v2 — Struktur Kode yang Dirapikan

Refactor ini fokus pada **keterbacaan kode**, bukan mengubah alur bisnis atau mereset database.

## Backend

`backend/src/routes/admin.js` sekarang hanya menjadi router penghubung.

Detail Admin dipisah menjadi:

- `routes/admin/accounts.js` — membuat akun baru dan membuat siswa + orang tua.
- `routes/admin/users.js` — daftar, edit keterkaitan, aktif/nonaktif, dan hapus akun.
- `routes/admin/reports.js` — dashboard, ringkasan tagihan, terbit tagihan, dan audit.
- `routes/admin/helpers.js` — fungsi kecil yang dipakai bersama.
- `middleware/role.js` — pengecekan akses role Admin.

Dengan pola ini, ketika mencari bug:

- masalah **akun** → `routes/admin/accounts.js`
- masalah **kelola akun** → `routes/admin/users.js`
- masalah **laporan/audit** → `routes/admin/reports.js`
- masalah **hak akses admin** → `middleware/role.js`

## Database

(Catatan 4 Okt 2026: `finka.db` SQLite lama sudah tidak disertakan di paket; database kini PostgreSQL.)

Database sudah dicek integritasnya setelah perapian dan tetap berisi data existing.

## Frontend

Halaman Nuxt tidak diubah secara agresif pada tahap ini agar risiko merusak UI/logic yang sudah berjalan tetap rendah. Refactor frontend sebaiknya dilakukan bertahap per area (Admin, Ortu, Siswa, PIC), setelah backend stabil.

## Menjalankan project

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd nuxt-app
npm install
npm run dev
```

Folder `node_modules` dan hasil build `.nuxt` sengaja tidak disertakan dalam paket bersih. Jalankan `npm install` untuk membuat dependency lokal.
