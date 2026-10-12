// Tes impor siswa + orang tua (dry-run, validasi, simpan, kredensial). Butuh backend + data demo, DB baru.
const B = process.env.BASE_URL || 'http://localhost:3001/api'
const call = async (m, p, t, b) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return [r.status, await r.json().catch(() => ({}))] }
const L = async (u, p) => (await call('POST', '/auth/login', null, { username: u, password: p }))[1]
let gagal = 0
const ok = (n, c, x) => { if (!c) gagal++; console.log(c ? 'OK   ' : 'GAGAL', n, c ? '' : JSON.stringify(x)) }
const admin = await L('admin', 'admin123'), ortuDemo = await L('ortu.sari', '123456')
let r
const baris = [
  { no: 2, nama_siswa: 'Rina Wulandari', nis: '25010001', kelas: '7A', nama_ortu: 'Bapak Hadi', username_ortu: 'ortu.hadi' },
  { no: 3, nama_siswa: 'Raka Hadi', nis: '25010002', kelas: '5B', nama_ortu: 'Bapak Hadi', username_ortu: 'ortu.hadi' },
  { no: 4, nama_siswa: 'Sinta Putri', nis: '25010003', kelas: '7A', nama_ortu: 'Ibu Dewi', username_ortu: '' }
]
r = await call('POST', '/admin/impor-siswa', ortuDemo.token, { baris }); ok('ortu tidak boleh impor (403)', r[0] === 403, r)
r = await call('POST', '/admin/impor-siswa', null, { baris }); ok('tanpa login 401', r[0] === 401, r)
r = await call('POST', '/admin/impor-siswa', admin.token, { baris: [] }); ok('baris kosong 400', r[0] === 400, r)
r = await call('POST', '/admin/impor-siswa', admin.token, { baris: Array.from({ length: 301 }, (_, i) => ({ nis: 'X' + i })) }); ok('>300 baris ditolak 400', r[0] === 400, r)

// dry-run
r = await call('POST', '/admin/impor-siswa', admin.token, { baris })
ok('dry-run valid: 3 siswa, 2 ortu baru (kakak-adik berbagi)', r[0] === 200 && r[1].ok && r[1].total === 3 && r[1].ortu_baru === 2 && r[1].simpan === false, r)
ok('dry-run tidak membocorkan kredensial', !JSON.stringify(r[1]).match(/password|pin_siswa/), r)
const cek = await call('POST', '/auth/login', null, { username: '25010001', password: 'apa saja' }); ok('dry-run tidak membuat akun', cek[0] === 401 && /salah/i.test(cek[1].error || ''), cek)

// validasi
const salah = [
  { no: 2, nama_siswa: '', nis: '25020001', kelas: '7A', nama_ortu: 'X Ortu' },                      // nama kosong
  { no: 3, nama_siswa: 'A', nis: '2.5E+07', kelas: '7A', nama_ortu: 'X Ortu' },                      // notasi ilmiah
  { no: 4, nama_siswa: 'B', nis: 'ab', kelas: '7A', nama_ortu: 'X Ortu' },                           // NIS terlalu pendek
  { no: 5, nama_siswa: 'C', nis: '25020005', kelas: '', nama_ortu: 'X Ortu' },                       // kelas kosong
  { no: 6, nama_siswa: 'D', nis: '25020006', kelas: '7A', nama_ortu: '' },                           // ortu kosong
  { no: 7, nama_siswa: 'E', nis: '25020007', kelas: '7A', nama_ortu: 'X', username_ortu: 'A B!' },   // username ortu salah
  { no: 8, nama_siswa: 'F', nis: '25020008', kelas: '7A', nama_ortu: 'Ortu F', username_ortu: 'ortu.f' },
  { no: 9, nama_siswa: 'G', nis: '25020008', kelas: '7A', nama_ortu: 'Ortu G', username_ortu: 'ortu.g' }, // NIS dobel di file
  { no: 10, nama_siswa: 'H', nis: '25020010', kelas: '7A', nama_ortu: 'Orang Lain', username_ortu: 'ortu.f' }, // username sama, nama beda
  { no: 11, nama_siswa: 'I', nis: '25020011', kelas: '7A', nama_ortu: 'Admin?', username_ortu: 'admin' },  // dipakai non-ortu
  { no: 12, nama_siswa: 'J', nis: 'aditya.p', kelas: '7A', nama_ortu: 'Ortu J', username_ortu: 'ortu.j' } // NIS = username yang sudah ada
]
r = await call('POST', '/admin/impor-siswa', admin.token, { baris: salah })
const e = (no) => (r[1].baris.find((x) => x.no === no) || { error: [] }).error.join(' | ')
ok('11 baris, tiap kesalahan terdeteksi di baris yang benar', r[0] === 200 && r[1].ok === false && /nama siswa kosong/.test(e(2)) && /notasi ilmiah/.test(e(3)) && /3-20/.test(e(4)) && /kelas kosong/.test(e(5)) && /orang tua kosong/.test(e(6)) && /username orang tua harus/.test(e(7)) && /dobel dengan baris 8/.test(e(9)) && /nama orang tua berbeda/.test(e(10)) && /non-orang tua/.test(e(11)) && /sudah terdaftar/.test(e(12)) && e(8) === '', { r: r[1].baris.map((b) => [b.no, b.error]) })
r = await call('POST', '/admin/impor-siswa', admin.token, { baris: salah, simpan: true }); ok('simpan ditolak bila ada baris salah (400)', r[0] === 400, r)
r = await call('POST', '/auth/login', null, { username: '25020008', password: 'x' }); ok('tidak ada baris yang tersimpan sebagian', r[0] === 401 && /salah/i.test(r[1].error), r)

// simpan
r = await call('POST', '/admin/impor-siswa', admin.token, { baris, simpan: true })
const akun = r[1].akun || []
ok('simpan: 3 siswa, 2 ortu dibuat', r[0] === 201 && r[1].siswa_dibuat === 3 && r[1].ortu_dibuat === 2 && akun.length === 3, r)
ok('akun saudara berbagi satu akun ortu, ortu kedua tanpa sandi baru', akun[0].username_ortu === 'ortu.hadi' && akun[0].password_ortu && akun[1].password_ortu === null && akun[2].username_ortu === 'ortu.25010003', akun)
ok('PIN 6 digit acak & password awal 123456 (wajib ganti saat login)', akun.every((a) => /^\d{6}$/.test(a.pin_siswa) && a.password_siswa === '123456' && (a.password_ortu === null || a.password_ortu === '123456')), akun)
const siswa0 = await L('25010001', akun[0].password_siswa); ok('siswa bisa login dengan NIS + sandi acak, wajib ganti password', !!siswa0.token && siswa0.user.role === 'siswa' && siswa0.user.wajib_ganti_password === true, siswa0)
const ortu0 = await L('ortu.hadi', akun[0].password_ortu); ok('ortu bisa login, wajib ganti password', !!ortu0.token && ortu0.user.wajib_ganti_password === true, ortu0)
r = await call('GET', '/pos/qr', siswa0.token); ok('sebelum ganti password, API ditolak 403', r[0] === 403 && r[1].kode === 'WAJIB_GANTI_PASSWORD', r)
await call('POST', '/auth/ganti-password', siswa0.token, { password_lama: akun[0].password_siswa, password_baru: 'SiswaBaru12345' })
await call('POST', '/auth/ganti-password', ortu0.token, { password_lama: akun[0].password_ortu, password_baru: 'OrtuBaru12345' })
const siswa1 = await L('25010001', 'SiswaBaru12345'); const ortuH = await L('ortu.hadi', 'OrtuBaru12345'); ok('setelah ganti, bebas akses', siswa1.user.wajib_ganti_password === false && ortuH.user.wajib_ganti_password === false, [siswa1.user, ortuH.user])
r = await call('GET', '/ortu/anak-anak', ortuH.token); ok('ortu melihat KEDUA anaknya', r[0] === 200 && (r[1].anak || r[1].anak_anak || r[1].siswa || []).length === 2, r)
r = await call('POST', '/pos/verifikasi-pin', null, {}); 
// PIN benar bisa dipakai (lewat kasir): isi saldo lalu tarik tunai
const pic = await L('pic.kantin.utama', '123456')
await call('POST', `/admin/users/${siswa1.user.id}/koreksi-saldo`, admin.token, { nominal: 50000, alasan: 'saldo awal uji impor' })
const qr = (await call('GET', '/pos/qr', siswa1.token))[1].token
r = await call('POST', '/pos/tarik-tunai', pic.token, { siswa_id: siswa1.user.id, pin: akun[0].pin_siswa, nominal: 10000, qr_token: qr }); ok('PIN hasil impor berfungsi di kasir', r[0] === 200, r)
// impor ulang file yang sama
r = await call('POST', '/admin/impor-siswa', admin.token, { baris }); ok('impor ulang file sama -> semua baris ditolak (NIS sudah terdaftar)', r[0] === 200 && r[1].ok === false && r[1].jumlah_error === 3, r)
// ortu yang sudah ada dipakai ulang untuk adik baru
r = await call('POST', '/admin/impor-siswa', admin.token, { baris: [{ no: 2, nama_siswa: 'Adik Baru', nis: '25010009', kelas: '1A', nama_ortu: 'Bapak Hadi', username_ortu: 'ortu.hadi' }], simpan: true })
ok('adik baru dihubungkan ke akun ortu yang sudah ada', r[0] === 201 && r[1].ortu_dibuat === 0 && r[1].ortu_dipakai_ulang === 1 && r[1].akun[0].password_ortu === null, r)
r = await call('GET', '/ortu/anak-anak', ortuH.token); ok('ortu kini punya 3 anak', (r[1].anak || r[1].anak_anak || r[1].siswa || []).length === 3, r)
r = await call('GET', '/admin/audit?aksi=IMPOR_SISWA', admin.token); ok('tercatat di audit tanpa kredensial', r[0] === 200 && r[1].audit.length === 2 && !JSON.stringify(r[1]).includes(akun[0].password_siswa), r)
console.log(gagal ? `${gagal} TEST GAGAL` : 'SEMUA TEST LULUS'); process.exit(gagal ? 1 : 0)
