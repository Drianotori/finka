// Tes kunci PIN (tersimpan di DB) dan reset PIN oleh admin. Butuh backend + data demo, DB baru.
const B = process.env.BASE_URL || 'http://localhost:3001/api'
const call = async (m, p, t, b) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return [r.status, await r.json().catch(() => ({}))] }
const L = async (u, p) => (await call('POST', '/auth/login', null, { username: u, password: p }))[1]
let gagal = 0
const ok = (n, c, x) => { if (!c) gagal++; console.log(c ? 'OK   ' : 'GAGAL', n, c ? '' : JSON.stringify(x)) }
const admin = await L('admin', 'admin123'), pic = await L('pic.kantin.utama', '123456'), ortu = await L('ortu.sari', '123456'), sis = await L('aditya.p', '123456')
const id = sis.user.id
const cek = (pin) => call('POST', '/pos/verifikasi-pin', pic.token, { siswa_id: id, pin })
let r
for (let i = 1; i <= 4; i++) { r = await cek('000000'); ok(`salah ke-${i} -> 200 cocok=false`, r[0] === 200 && r[1].cocok === false, r) }
r = await cek('000000'); ok('salah ke-5 -> masih 200 (percobaan ke-5 dicatat)', r[0] === 200, r)
r = await cek('135790'); ok('PIN benar saat terkunci -> 429', r[0] === 429 && /terkunci/i.test(r[1].error), r)
r = await call('POST', `/admin/users/${id}/reset-pin`, ortu.token); ok('ortu tidak boleh reset PIN (403)', r[0] === 403, r)
r = await call('POST', `/admin/users/${id}/reset-pin`, pic.token); ok('PIC tidak boleh reset PIN (403)', r[0] === 403, r)
r = await call('POST', `/admin/users/${ortu.user.id}/reset-pin`, admin.token); ok('reset PIN non-siswa ditolak (404)', r[0] === 404, r)
r = await call('POST', `/admin/users/${id}/reset-pin`, admin.token); const pinBaru = r[1].pin
ok('admin reset PIN -> 6 digit', r[0] === 200 && /^\d{6}$/.test(pinBaru), r)
r = await cek(pinBaru); ok('PIN baru langsung berlaku & kunci terbuka', r[0] === 200 && r[1].cocok === true, r)
r = await cek('135790'); ok('PIN lama tidak berlaku', r[0] === 200 && r[1].cocok === false, r)
const aud = await call('GET', '/admin/audit?limit=20', admin.token)
ok('audit mencatat RESET_PIN_SISWA', JSON.stringify(aud[1]).includes('RESET_PIN_SISWA'), aud[0])
console.log(gagal ? `${gagal} TEST GAGAL` : 'SEMUA TEST LULUS'); process.exit(gagal ? 1 : 0)
