// Tes form "Tambah akun" baru: kredensial otomatis, hubungan, no HP, email.

const BASE = process.env.BASE_URL || 'http://localhost:3001/api'
let gagal = 0
const cek = (n, ok, info = '') => { console.log(`${ok ? 'OK  ' : 'GAGAL'} ${n}${ok ? '' : ' ' + info}`); if (!ok) gagal++ }
const call = async (m, p, b, t) => {
  const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined })
  return { s: r.status, d: await r.json().catch(() => ({})) }
}
const login = await call('POST', '/auth/login', { username: 'admin', password: 'admin123' })
const T = login.d.token
const sfx = Date.now().toString().slice(-6)
let r = await call('POST', '/admin/users', { role: 'ortu', nama: `Sari Wulandari ${sfx}`, hubungan: 'ibu', no_hp: '+62 812-3456-7890', email: 'Sari@Email.com' }, T)
cek('ortu otomatis dibuat', r.s === 201 && r.d.password_awal && r.d.user.username.startsWith('ortu.'), JSON.stringify(r.d))
cek('hp dirapikan 08', r.d.user?.no_hp === '081234567890', r.d.user?.no_hp)
cek('email huruf kecil', r.d.user?.email === 'sari@email.com')
const lg = await call('POST', '/auth/login', { username: r.d.user.username, password: r.d.password_awal })
cek('login pakai kredensial otomatis + wajib ganti', lg.s === 200 && lg.d.user?.wajib_ganti_password === true, JSON.stringify(lg.d).slice(0, 200))
r = await call('POST', '/admin/users', { role: 'ortu', nama: `Sari Wulandari ${sfx}`, hubungan: 'ibu' }, T)
cek('nama kembar -> username unik', r.s === 201)
r = await call('POST', '/admin/users', { role: 'ortu', nama: 'X Y', no_hp: '123' }, T)
cek('hp salah ditolak', r.s === 400)
r = await call('POST', '/admin/users', { role: 'ortu', nama: 'X Y', email: 'bukanemail' }, T)
cek('email salah ditolak', r.s === 400)
r = await call('POST', '/admin/users', { role: 'siswa', nama: 'X Y', hubungan: 'ibu' }, T)
cek('hubungan utk non-ortu ditolak', r.s === 400)
r = await call('POST', '/admin/users', { role: 'siswa', nama: `Budi ${sfx}`, nis: `9${sfx}`, kelas: '7A' }, T)
cek('siswa: username = NIS + PIN', r.s === 201 && r.d.user.username === `9${sfx}` && r.d.pin_awal, JSON.stringify(r.d))
r = await call('POST', '/admin/users', { role: 'pic', nama: `Kasir ${sfx}`, outlet: 'koperasi', no_hp: '0811223344556' }, T)
cek('pic otomatis', r.s === 201 && r.d.user.outlet === 'koperasi')
r = await call('POST', '/admin/users', { role: 'ortu', nama: 'Lama', username: `lama${sfx}`, password: 'rahasia123' }, T)
cek('cara lama (username+password) tetap jalan, tanpa paksa ganti', r.s === 201 && r.d.password_awal === null)
const ls = await call('GET', '/admin/users', null, T)
cek('daftar user memuat hp/email', ls.d.some((u) => u.no_hp === '081234567890' && u.email === 'sari@email.com'))

// ---- ronde 2: anak baru, HP kembar, ubah kontak
r = await call('POST', '/admin/users', { role: 'ortu', nama: `Rina ${sfx}`, hubungan: 'ibu', no_hp: '0856 1000 2000', anak_baru: [{ nama: 'Anak Satu', nis: `A1${sfx}`, kelas: '3A' }, { nama: 'Anak Dua', nis: `A2${sfx}`, kelas: '5B' }] }, T)
cek('ortu + 2 anak baru dibuat', r.s === 201 && r.d.anak_baru.length === 2 && r.d.anak_baru[0].password && r.d.anak_baru[0].pin, JSON.stringify(r.d))
const ortuRina = r.d.user.id
const l2 = await call('GET', '/admin/users', null, T)
const rina = l2.d.find((u) => u.id === ortuRina)
cek('kedua anak terhubung ke ortu', rina && rina.anak.length === 2)
const ln = await call('POST', '/auth/login', { username: `A1${sfx}`, password: r.d.anak_baru[0].password })
cek('anak bisa login dengan NIS + sandi otomatis', ln.s === 200)
r = await call('POST', '/admin/users', { role: 'ortu', nama: 'Kembar HP', no_hp: '085610002000' }, T)
cek('HP kembar ditolak 409', r.s === 409, JSON.stringify(r.d))
r = await call('POST', '/admin/users', { role: 'ortu', nama: 'Tanpa Jejak', no_hp: '0856 3000 4000', anak_baru: [{ nama: 'Dobel', nis: `A1${sfx}`, kelas: '1A' }] }, T)
cek('NIS anak baru yang sudah ada ditolak', r.s === 409, JSON.stringify(r.d))
const cari = (await call('GET', '/admin/users', null, T)).d
cek('gagal -> tidak ada akun ortu setengah jadi', !cari.some((u) => u.nama === 'Tanpa Jejak'))
r = await call('POST', '/admin/users', { role: 'ortu', nama: 'Dobel File', no_hp: '0856 5000 6000', anak_baru: [{ nama: 'a', nis: `B1${sfx}`, kelas: '1A' }, { nama: 'b', nis: `B1${sfx}`, kelas: '1A' }] }, T)
cek('NIS dobel dalam form ditolak', r.s === 400)
r = await call('PUT', `/admin/users/${ortuRina}/kontak`, { hubungan: 'wali', no_hp: '0856 1000 2999', email: 'rina@x.id' }, T)
cek('ubah kontak berhasil', r.s === 200 && r.d.no_hp === '085610002999', JSON.stringify(r.d))
const sari = (await call('GET', '/admin/users', null, T)).d.find((u) => u.no_hp === '081234567890')
r = await call('PUT', `/admin/users/${ortuRina}/kontak`, { hubungan: 'ibu', no_hp: '081234567890' }, T)
cek('ubah ke HP milik ortu lain ditolak', r.s === 409 && sari, JSON.stringify(r.d))
r = await call('PUT', `/admin/users/${ortuRina}/kontak`, { hubungan: 'ibu', no_hp: '085610002999' }, T)
cek('simpan HP sendiri (tidak berubah) tidak dianggap kembar', r.s === 200)
const sid = anak => 0
r = await call('PUT', `/admin/users/${(await call('GET', '/admin/users', null, T)).d.find((u) => u.nis === `A1${sfx}`).id}/kontak`, { no_hp: '0811' }, T)
cek('siswa tidak punya kontak (404)', r.s === 404)
r = await call('PUT', `/admin/users/${ortuRina}/kontak`, { hubungan: 'ibu', no_hp: '' }, T)
cek('HP ortu tidak boleh dikosongkan', r.s === 400)

// ---- ronde 3: ortu reset PIN anak
const ortuTok = (await call('POST', '/auth/login', { username: 'ortu.sari', password: '123456' })).d.token
const anakSari = (await call('GET', '/ortu/anak-anak', null, ortuTok)).d.anak
const aid = anakSari[0].id
r = await call('POST', `/ortu/anak/${aid}/reset-pin`, null, ortuTok)
cek('ortu reset PIN anak -> PIN 6 digit', r.s === 200 && /^\d{6}$/.test(r.d.pin), JSON.stringify(r.d))
const pinBaru = r.d.pin
const sisT = (await call('POST', '/auth/login', { username: 'aditya.p', password: '123456' })).d.token
const gp = await call('POST', '/siswa/saya/ganti-pin', { pin_lama: pinBaru, pin_baru: '482915' }, sisT)
cek('PIN baru dari ortu benar-benar berlaku', gp.s === 200, JSON.stringify(gp.d))
r = await call('POST', `/ortu/anak/${aid}/reset-pin`, null, sisT)
cek('siswa tidak boleh memakai endpoint ortu (403)', r.s === 403)
await call('POST', '/admin/users', { role: 'ortu', nama: `Orang Lain ${sfx}`, username: `lain${sfx}`, password: 'rahasia123', no_hp: '0877 1234 5678' }, T)
const ot2 = (await call('POST', '/auth/login', { username: `lain${sfx}`, password: 'rahasia123' })).d
r = await call('POST', `/ortu/anak/${aid}/reset-pin`, null, ot2.token)
cek('ortu lain tidak bisa reset PIN anak orang lain (403)', r.s === 403, JSON.stringify({ s: r.s, login: !!ot2.token }))
let n429 = 0
for (let i = 0; i < 6; i++) { const x = await call('POST', `/ortu/anak/${aid}/reset-pin`, null, ortuTok); if (x.s === 429) n429++ }
cek('dibatasi 5x/24 jam (429)', n429 >= 1, n429)
const aud = await call('GET', '/admin/audit?aksi=RESET_PIN_ORTU', null, T)
cek('reset oleh ortu tercatat di audit', aud.d.audit && aud.d.audit.length >= 1)

// ---- ronde 4: password awal 123456 + reset massal
r = await call('POST', '/admin/users', { role: 'siswa', nama: `Siswa Default ${sfx}`, nis: `D${sfx}`, kelas: '8C' }, T)
cek('siswa baru: password awal 123456 + wajib ganti', r.s === 201 && r.d.password_awal === '123456', JSON.stringify(r.d))
let ld = await call('POST', '/auth/login', { username: `D${sfx}`, password: '123456' })
cek('siswa login dengan 123456, wajib_ganti_password=true', ld.s === 200 && ld.d.user?.wajib_ganti_password === true, JSON.stringify(ld.d).slice(0, 160))
r = await call('POST', '/auth/ganti-password', { password_lama: '123456', password_baru: '123456' }, ld.d.token)
cek('tidak boleh tetap 123456', r.s === 400)
r = await call('POST', '/auth/ganti-password', { password_lama: '123456', password_baru: 'passwordBaru9' }, ld.d.token)
cek('siswa ganti password sendiri berhasil', r.s === 200)
ld = await call('POST', '/auth/login', { username: `D${sfx}`, password: '123456' })
cek('123456 tidak lagi berlaku', ld.s === 401)
r = await call('POST', '/admin/users', { role: 'admin', nama: `Adm ${sfx}` }, T)
cek('admin baru TIDAK memakai 123456', r.s === 201 && r.d.password_awal && r.d.password_awal !== '123456')
r = await call('POST', '/admin/users/reset-password-massal', { role: 'siswa' }, T)
cek('reset massal tanpa konfirmasi ditolak', r.s === 400)
r = await call('POST', '/admin/users/reset-password-massal', { role: 'admin', konfirmasi: 'RESET' }, T)
cek('reset massal admin ditolak', r.s === 400)
r = await call('POST', '/admin/users/reset-password-massal', { role: 'siswa', kelas: '8C', konfirmasi: 'RESET' }, T)
cek('reset massal per kelas: 1 akun', r.s === 200 && r.d.jumlah === 1, JSON.stringify(r.d))
ld = await call('POST', '/auth/login', { username: `D${sfx}`, password: '123456' })
cek('siswa kelas 8C kembali ke 123456 + wajib ganti', ld.s === 200 && ld.d.user?.wajib_ganti_password === true)
const lp = await call('POST', '/auth/login', { username: 'pic.kantin.utama', password: '123456' })
cek('PIC tidak ikut terreset (tetap pakai sandi lama, tanpa paksa ganti)', lp.s === 200 && lp.d.user?.wajib_ganti_password === false)
r = await call('POST', '/admin/users/reset-password-massal', { role: 'siswa', konfirmasi: 'RESET' }, T)
cek('reset massal seluruh siswa', r.s === 200 && r.d.jumlah >= 3, JSON.stringify(r.d))
const orT = (await call('POST', '/auth/login', { username: 'ortu.sari', password: '123456' })).d.token
const sad = await call('POST', '/admin/users/reset-password-massal', { role: 'siswa', konfirmasi: 'RESET' }, orT)
cek('non-admin tidak boleh reset massal (403)', sad.s === 403)
const aud4 = await call('GET', '/admin/audit?aksi=RESET_PASSWORD_MASSAL', null, T)
cek('reset massal tercatat di audit', aud4.d.audit && aud4.d.audit.length >= 2)
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua lulus'); process.exit(gagal ? 1 : 0)
