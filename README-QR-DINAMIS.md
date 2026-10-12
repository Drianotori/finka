# QR Dinamis Siswa + PIN

Alur transaksi POS:

1. Siswa membuka **QR Saya**.
2. Backend membuat token QR yang berlaku **30 detik**.
3. Frontend merender token menjadi QR asli.
4. PIC membuka **Scan Barcode** dan mengaktifkan kamera.
5. Kamera membaca QR dinamis dan backend memvalidasi token.
6. Data siswa ditampilkan di layar konfirmasi.
7. PIC meminta siswa memasukkan **PIN 6 digit** yang sudah tersimpan.
8. Backend memverifikasi **QR + PIN + saldo + outlet produk** sebelum ledger ditulis.
9. Setelah transaksi berhasil, token QR tersebut ditandai sudah digunakan sehingga tidak dapat dipakai ulang.

## Dependency baru frontend

- `qrcode` untuk membuat QR asli.
- `jsqr` sebagai fallback pembacaan kamera pada browser yang tidak menyediakan `BarcodeDetector`.

Jalankan setelah mengambil project:

```bash
cd nuxt-app
npm install
```

`npm install` akan memperbarui `package-lock.json` dengan dependency baru.

## Catatan keamanan

Untuk deployment, set:

```env
JWT_SECRET=secret-yang-kuat
QR_SECRET=secret-qr-yang-kuat-dan-berbeda
```

Jangan memakai nilai default development.

Kamera browser membutuhkan HTTPS pada deployment (localhost tetap dapat digunakan untuk development).
