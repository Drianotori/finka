# Struktur Folder Finka V2

## Backend

```text
backend/
├── src/
│   ├── server.js              # Menyalakan Express dan mendaftarkan route
│   ├── db.js                  # Koneksi SQLite + helper database
│   ├── audit.js               # Helper audit log
│   ├── middleware/
│   │   ├── auth.js            # JWT + login
│   │   └── role.js            # Hak akses role
│   └── routes/
│       ├── auth.js            # Login
│       ├── ortu.js            # Dashboard, riwayat, notifikasi orang tua
│       ├── topup.js           # Top-up dan verifikasi pembayaran
│       ├── tagihan.js         # Tagihan siswa
│       ├── pos.js             # Transaksi kasir/PIC
│       ├── siswa.js           # Data siswa
│       ├── admin.js            # Router utama admin
│       ├── laporan.js         # Laporan
│       └── admin/              # Endpoint admin yang dipecah per fungsi
└── scripts/
    ├── seed.js
    └── smoke-test.js
```

## Frontend

```text
nuxt-app/
├── pages/                     # Halaman yang menjadi route URL
├── components/                # Komponen reusable
├── layouts/                   # Kerangka halaman
├── middleware/                # Proteksi route
├── plugins/                   # API client dan plugin Nuxt
├── store/                     # Vuex
├── utils/                     # Helper kecil
└── assets/css/main.css        # Design system + CSS umum
```
