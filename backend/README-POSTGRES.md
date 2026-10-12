# Finka — PostgreSQL

Backend Finka sekarang menggunakan PostgreSQL sebagai database utama. SQLite hanya dipertahankan sebagai alat migrasi sekali jalan.

## 1. Buat database PostgreSQL

Contoh database lokal:

```sql
CREATE DATABASE finka;
```

## 2. Konfigurasi backend

Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`.

Contoh:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finka
JWT_SECRET=ganti-dengan-rahasia-panjang
QR_SECRET=ganti-dengan-rahasia-qr-panjang
PORT=3001
```

## 3. Install dependency

```bash
npm install
```

## 4. Buat schema PostgreSQL

```bash
npm run db:init
```

Perintah ini membuat tabel, index, constraint, dan akun demo bila database masih kosong.

## 5. Jika ingin memindahkan data SQLite lama

Letakkan `finka.db` lama di folder `backend/`, lalu jalankan:

```bash
npm run db:migrate-sqlite
```

Atau tentukan lokasi lain:

```bash
SQLITE_DB_PATH=/path/ke/finka.db npm run db:migrate-sqlite
```

Script migrasi mempertahankan ID dan menyelaraskan sequence PostgreSQL setelah data dipindahkan.

## 6. Jalankan backend

```bash
npm run dev
```

## 7. Frontend

Salin `nuxt-app/.env.example` menjadi `nuxt-app/.env` dan ubah bila backend berada di server lain:

```env
API_BASE_URL=http://localhost:3001/api
```

Dengan demikian database PostgreSQL dapat berada di server/database host terpisah dari Express dan Nuxt.
