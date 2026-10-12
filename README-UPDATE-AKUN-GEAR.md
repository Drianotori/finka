# Update Finka v2 — Gear Siswa + Kelola Akun Internal

## Perubahan

### Dashboard Siswa
- Tombol Logout global tidak lagi menimpa area kanan atas dashboard siswa.
- Tombol gear sekarang menjadi tombol pengaturan yang membuka menu kecil.
- Logout siswa dipindahkan ke menu gear.
- Halaman siswa lain tetap memakai tombol Keluar biasa dari layout phone.

### Admin — Manajemen Akun
Pada tab **Admin & PIC** sekarang ada tombol **Kelola**.

Admin dapat:
- melihat nama, username, role, outlet, dan status;
- mengubah nama;
- mengubah username;
- mengubah outlet untuk PIC;
- mengganti password secara opsional;
- mengaktifkan/nonaktifkan akun melalui tombol status.

Role tidak dapat diubah dari modal ini agar hak akses tidak berubah tanpa sengaja.
Admin yang sedang login tetap tidak boleh menonaktifkan akunnya sendiri.

Endpoint baru:
`PUT /api/admin/users/:id/profil-internal`

Database existing tidak di-reset.
