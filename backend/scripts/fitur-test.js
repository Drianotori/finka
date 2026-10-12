// Tes reset password admin, koreksi saldo, batal tagihan, edit/hapus produk. Butuh backend + data demo, DB baru.
const B = process.env.BASE_URL || 'http://localhost:3001/api'
const call = async (m, p, t, b) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return [r.status, await r.json().catch(() => ({}))] }
const L = async (u, p) => (await call('POST', '/auth/login', null, { username: u, password: p }))[1]
let gagal = 0
const ok = (n, c, x) => { if (!c) gagal++; console.log(c ? 'OK   ' : 'GAGAL', n, c ? '' : JSON.stringify(x)) }
const admin = await L('admin', 'admin123'), pic = await L('pic.kantin.utama', '123456'), picB = await L('pic.kantin.b', '123456'), ortu = await L('ortu.sari', '123456'), sis = await L('aditya.p', '123456')
const sid = sis.user.id
const saldo = async () => (await call('GET', `/siswa/${sid}/saldo`, admin.token))[1]
let r

// --- reset password
r = await call('POST', `/admin/users/${ortu.user.id}/reset-password`, ortu.token); ok('ortu tidak boleh reset (403)', r[0] === 403, r)
r = await call('POST', `/admin/users/${admin.user.id}/reset-password`, admin.token); ok('admin reset diri sendiri ditolak', r[0] === 400, r)
r = await call('POST', '/admin/users/999999/reset-password', admin.token); ok('user tak ada -> 404', r[0] === 404, r)
r = await call('POST', `/admin/users/${ortu.user.id}/reset-password`, admin.token)
const sandi = r[1].password_sementara
ok('admin reset password ortu', r[0] === 200 && typeof sandi === 'string' && sandi.length >= 10, r)
r = await call('POST', '/auth/login', null, { username: 'ortu.sari', password: '123456' }); ok('password lama tidak berlaku', r[0] === 401, r)
r = await call('POST', '/auth/login', null, { username: 'ortu.sari', password: sandi }); ok('password sementara bisa login', r[0] === 200, r)
r = await call('GET', '/admin/audit?aksi=RESET_PASSWORD', admin.token); ok('tercatat di audit', r[0] === 200 && r[1].audit.length === 1 && !JSON.stringify(r[1]).includes(sandi), r)

// --- koreksi saldo
const s0 = await saldo()
const nilai0 = Number(s0.saldo ?? s0.sisa ?? 0)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, pic.token, { nominal: 1000, alasan: 'uji coba pic' }); ok('PIC tidak boleh koreksi (403)', r[0] === 403, r)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: 0, alasan: 'nol nominal' }); ok('nominal 0 ditolak', r[0] === 400, r)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: 1500.5, alasan: 'pecahan' }); ok('nominal pecahan ditolak', r[0] === 400, r)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: 6000000, alasan: 'terlalu besar' }); ok('nominal > batas ditolak', r[0] === 400, r)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: 5000 }); ok('tanpa alasan ditolak', r[0] === 400, r)
r = await call('POST', `/admin/users/${ortu.user.id}/koreksi-saldo`, admin.token, { nominal: 5000, alasan: 'bukan siswa' }); ok('target non-siswa -> 404', r[0] === 404, r)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: 12000, alasan: 'salah scan kemarin' }); ok('koreksi +12rb', r[0] === 201 && r[1].saldo_baru === nilai0 + 12000, r)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: -(nilai0 + 12000 + 1), alasan: 'terlalu banyak' }); ok('koreksi membuat saldo negatif ditolak 409', r[0] === 409, r)
r = await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: -2000, alasan: 'salah top-up' }); ok('koreksi -2rb', r[0] === 201 && r[1].saldo_baru === nilai0 + 10000, r)
r = await call('GET', `/siswa/${sid}/riwayat`, admin.token); ok('muncul di riwayat siswa sebagai penyesuaian', r[0] === 200 && JSON.stringify(r[1]).includes('penyesuaian'), r)
const lap = (await call('GET', '/admin/laporan', admin.token))[1].ringkasan
ok('laporan: selisih rekonsiliasi tetap 0', lap && lap.selisih === 0 && lap.koreksi_tambah === 12000 && lap.koreksi_kurang === 2000, lap)

// --- batal tagihan
r = await call('POST', '/admin/tagihan/bulk', admin.token, { nama: 'SPP Salah', nominal: 300000, jatuh_tempo: '2026-10-30', siswa_ids: [sid] }); ok('terbit tagihan', r[0] === 201, r)
let list = (await call('GET', '/admin/tagihan?q=spp%20salah', admin.token))[1].tagihan
ok('admin lihat daftar tagihan', list && list.length === 1 && list[0].status === 'belum_bayar', list)
const tid = list[0].id
r = await call('POST', `/admin/tagihan/${tid}/batal`, ortu.token, { alasan: 'coba ortu' }); ok('ortu tidak boleh batalkan (403)', r[0] === 403, r)
r = await call('POST', `/admin/tagihan/${tid}/batal`, admin.token, { alasan: 'x' }); ok('alasan terlalu pendek ditolak', r[0] === 400, r)
// ada pembayaran menunggu -> tidak boleh batal
const ortuTmp = await L('ortu.sari', sandi)
ok('login password sementara menandai wajib_ganti_password', ortuTmp.user.wajib_ganti_password === true, ortuTmp)
r = await call('GET', '/ortu/anak-anak', ortuTmp.token); ok('selama belum diganti, API lain ditolak 403 WAJIB_GANTI_PASSWORD', r[0] === 403 && r[1].kode === 'WAJIB_GANTI_PASSWORD', r)
r = await call('GET', '/auth/me', ortuTmp.token); ok('/auth/me tetap boleh & menunjukkan flag', r[0] === 200 && r[1].user.wajib_ganti_password === true, r)
r = await call('POST', '/auth/ganti-password', ortuTmp.token, { password_lama: sandi, password_baru: 'PasswordSendiri9' }); ok('ganti password menghapus kewajiban', r[0] === 200, r)
const ortu2 = await L('ortu.sari', 'PasswordSendiri9')
ok('setelah diganti, flag mati & API terbuka', ortu2.user.wajib_ganti_password === false && (await call('GET', '/ortu/anak-anak', ortu2.token))[0] === 200, ortu2)
const [, tp] = await call('POST', '/topup', ortu2.token, { siswa_id: sid, nominal: 300000, tagihan_id: tid })
r = await call('POST', `/admin/tagihan/${tid}/batal`, admin.token, { alasan: 'salah sasaran kelas' }); ok('ada transfer menunggu -> 409', r[0] === 409, r)
await call('POST', `/topup/${tp.id}/tolak`, admin.token, { alasan: 'uji' })
r = await call('POST', `/admin/tagihan/${tid}/batal`, admin.token, { alasan: 'salah sasaran kelas' }); ok('batalkan tagihan', r[0] === 200, r)
r = await call('POST', `/admin/tagihan/${tid}/batal`, admin.token, { alasan: 'ulang batal' }); ok('batal dua kali -> 409', r[0] === 409, r)
r = await call('POST', `/tagihan/${tid}/bayar`, ortu2.token); ok('tagihan batal tidak bisa dibayar', r[0] === 409, r)
r = await call('POST', '/topup', ortu2.token, { siswa_id: sid, nominal: 300000, tagihan_id: tid }); ok('tagihan batal tidak bisa diajukan transfer', r[0] === 409, r)
r = await call('GET', `/tagihan?siswa_id=${sid}`, ortu2.token); ok('ortu tidak melihat tagihan batal', r[0] === 200 && !r[1].tagihan.some((t) => t.id === tid), r)
r = await call('GET', `/tagihan?siswa_id=${sid}`, admin.token); ok('admin masih melihat tagihan batal', r[0] === 200 && r[1].tagihan.some((t) => t.id === tid && t.status === 'batal'), r)
const rg = (await call('GET', '/admin/tagihan-ringkasan', admin.token))[1]
ok('ringkasan tidak menghitung tagihan batal (2 tagihan demo = 850000, tanpa 300000)', rg.total.terbit === 850000 && rg.total.invoice === 2, rg)
// tagihan yang sudah lunas tidak bisa dibatalkan
await call('POST', '/admin/tagihan/bulk', admin.token, { nama: 'SPP Lunas', nominal: 5000, jatuh_tempo: '2026-10-30', siswa_ids: [sid] })
const lunasId = (await call('GET', '/admin/tagihan?q=spp%20lunas', admin.token))[1].tagihan[0].id
await call('POST', `/tagihan/${lunasId}/bayar`, ortu2.token)
r = await call('POST', `/admin/tagihan/${lunasId}/batal`, admin.token, { alasan: 'sudah dibayar' }); ok('tagihan lunas tidak bisa dibatalkan', r[0] === 409, r)

// --- produk
r = await call('POST', '/pos/produk', pic.token, { nama: 'Roti Uji', harga: 4000 }); const pid = r[1].produk.id; ok('buat produk', r[0] === 201, r)
r = await call('PUT', `/pos/produk/${pid}`, pic.token, { nama: 'Roti Uji Besar', harga: 5500 }); ok('ubah nama & harga', r[0] === 200 && r[1].produk.harga === 5500, r)
r = await call('PUT', `/pos/produk/${pid}`, pic.token, { nama: '', harga: 5500 }); ok('nama kosong ditolak', r[0] === 400, r)
r = await call('PUT', `/pos/produk/${pid}`, pic.token, { nama: 'X', harga: -1 }); ok('harga negatif ditolak', r[0] === 400, r)
r = await call('PUT', `/pos/produk/${pid}`, picB.token, { nama: 'Curi', harga: 1 }); ok('PIC outlet lain ditolak (403)', r[0] === 403, r)
r = await call('DELETE', `/pos/produk/${pid}`, picB.token); ok('PIC outlet lain tak bisa hapus (403)', r[0] === 403, r)
r = await call('PUT', `/pos/produk/${pid}`, ortu2.token, { nama: 'Curi', harga: 1 }); ok('ortu tidak boleh ubah produk (403)', r[0] === 403, r)
r = await call('DELETE', `/pos/produk/${pid}`, pic.token); ok('hapus produk', r[0] === 200, r)
r = await call('DELETE', `/pos/produk/${pid}`, pic.token); ok('hapus lagi -> 404', r[0] === 404, r)
r = await call('GET', '/pos/produk', pic.token); ok('produk hilang dari daftar', !r[1].produk.some((p) => p.id === pid), r)
// --- batas top-up & tagihan
r = await call('POST', '/topup', ortu2.token, { siswa_id: sid, nominal: 1 }); ok('top-up Rp 1 ditolak', r[0] === 400 && /minimal/i.test(r[1].error), r)
r = await call('POST', '/topup', ortu2.token, { siswa_id: sid, nominal: 99999999999 }); ok('top-up nominal raksasa ditolak 400 (bukan 500)', r[0] === 400, r)
r = await call('POST', '/topup', ortu2.token, { siswa_id: sid, nominal: 2000001 }); ok('top-up di atas maksimal ditolak', r[0] === 400, r)
r = await call('POST', '/topup', ortu2.token, { siswa_id: sid, nominal: 10000 }); ok('top-up tepat minimal diterima', r[0] === 201 || r[0] === 200, r)
r = await call('GET', '/config/pembayaran', ortu2.token); ok('batas top-up tersedia untuk UI', r[1].topup_min === 10000 && r[1].topup_maks === 2000000, r)
r = await call('POST', '/admin/tagihan/bulk', admin.token, { nama: 'Raksasa', nominal: 99999999999, jatuh_tempo: '2026-10-30', siswa_ids: [sid] }); ok('tagihan nominal raksasa ditolak 400', r[0] === 400, r)
console.log(gagal ? `${gagal} TEST GAGAL` : 'SEMUA TEST LULUS'); process.exit(gagal ? 1 : 0)
