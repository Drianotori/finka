# Finka — Nuxt 2 + Vue 2

Export dari desain Finka. Setiap role punya folder route sendiri.

## Menjalankan

```bash
cd nuxt-app
npm install
npm run dev      # http://localhost:3000
```

Build: `npm run build && npm run start`. Static: `npm run generate`.

## Struktur route per role

```
pages/
  index.vue                     /            pemilih role
  ortu/                         /ortu        Orang Tua / Wali
    index.vue                   beranda + kartu anak
    isi-saldo/index.vue         pilih nominal
    isi-saldo/instruksi.vue     kode unik + rekening
    isi-saldo/unggah-bukti.vue  upload bukti transfer
    isi-saldo/status.vue        status verifikasi + lini masa
    tagihan/index.vue           daftar tagihan
    tagihan/_id.vue             detail tagihan → bayar
    riwayat.vue                 riwayat belanja anak (filter per anak)
    kontrol.vue                 limit harian, blokir kartu, reset PIN
    notifikasi.vue
  siswa/                        /siswa       Siswa
    index.vue                   saldo + ringkasan
    qr.vue                      barcode, hitung mundur 60 detik
    riwayat.vue
    struk/_id.vue               struk digital
  pic/                          /pic         PIC / kasir
    index.vue                   katalog + keranjang + kas sesi
    tunai.vue                   ambil tunai (nominal + cek kas laci)
    scan.vue                    scan barcode (simulasi pilih siswa)
    konfirmasi.vue              foto siswa, saldo, cek cukup
    pin.vue                     PIN 6 digit, keypad diacak
    sukses.vue                  hasil transaksi / penarikan
    gagal.vue                   saldo tidak mencukupi
  admin/                        /admin       Admin Yayasan
    index.vue                   dashboard
    verifikasi.vue              antrean top-up + mutasi bank
    tagihan/index.vue           tunggakan per kelas
    tagihan/buat.vue            buat tagihan + pratinjau invoice
    outlet.vue                  outlet & katalog produk
    laporan.vue                 rekonsiliasi harian
    audit.vue                   audit log
    pengaturan.vue              rekening, aturan kode unik, akun PIC
```

## State (Vuex, mode modules)

| Modul | Isi |
|---|---|
| `store/index.js` | siswa & saldo, transaksi, tagihan, produk, limit, blokir |
| `store/topup.js` | alur isi saldo: nominal, kode unik, bukti, status verifikasi |
| `store/pos.js` | keranjang, mode belanja/tunai, kas sesi, scan, PIN |
| `store/admin.js` | peran admin/monitoring, antrean verifikasi, draft tagihan |

Saldo dan kas benar-benar berubah lintas role: setujui top-up di `/ortu/isi-saldo/status`
atau `/admin/verifikasi`, lalu saldo di `/siswa` dan `/pic` ikut berubah.

## Layouts

- `layouts/phone.vue` — bingkai 390×844 untuk ortu, siswa, PIC (`layout: 'phone'`)
- `layouts/admin.vue` — sidebar + topbar + switch Admin/Monitoring
- `layouts/default.vue` — halaman pemilih role

## Hak akses

Switch **Admin / Monitoring** di topbar admin. Mode Monitoring bersifat read-only:
tombol setujui/tolak, terbitkan tagihan, dan tambah produk disembunyikan atau tidak aktif.

## Design tokens

Semua warna, font, dan radius ada di `assets/css/main.css` sebagai CSS custom properties
(`--navy`, `--blue`, `--sand`, `--coral`, `--green`, `--font-display`, `--font-body`).
Komponen memakai token ini, bukan nilai hex langsung.

## Data & placeholder

Semua data dummy dan hidup di store. Placeholder yang perlu aset asli:
foto siswa (konfirmasi PIC), bukti transfer (unggah & verifikasi), pratinjau kamera (scan).
QR digambar prosedural di `components/QrCode.vue` — ganti dengan encoder QR asli saat integrasi.

PIN demo: **135790** (percobaan kedua selalu diterima agar alur demo tidak buntu).
