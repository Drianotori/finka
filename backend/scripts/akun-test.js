// Tes ganti password, limit milik siswa, dan kas tunai laci. Butuh backend + data demo, DB baru.
const B = process.env.BASE_URL || 'http://localhost:3001/api'
const call = async (m, p, t, b) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return [r.status, await r.json().catch(() => ({}))] }
const L = async (u, p) => (await call('POST', '/auth/login', null, { username: u, password: p }))[1]
let gagal = 0
const ok = (n, c, x) => { if (!c) gagal++; console.log(c ? 'OK   ' : 'GAGAL', n, c ? '' : JSON.stringify(x)) }
const admin = await L('admin', 'admin123'), pic = await L('pic.kantin.utama', '123456'), ortu = await L('ortu.sari', '123456'), sis = await L('aditya.p', '123456')
let r
// --- ganti password
r = await call('POST', '/auth/ganti-password', ortu.token, { password_lama: 'salah', password_baru: 'BaruKuat123' }); ok('password lama salah -> 401', r[0] === 401, r)
r = await call('POST', '/auth/ganti-password', ortu.token, { password_lama: '123456', password_baru: 'pendek' }); ok('password baru <8 -> 400', r[0] === 400, r)
r = await call('POST', '/auth/ganti-password', ortu.token, { password_lama: '123456', password_baru: '123456' }); ok('password sama -> 400', r[0] === 400, r)
r = await call('POST', '/auth/ganti-password', null, { password_lama: 'a', password_baru: 'bbbbbbbbb' }); ok('tanpa login -> 401', r[0] === 401, r)
r = await call('POST', '/auth/ganti-password', ortu.token, { password_lama: '123456', password_baru: 'BaruKuat123' }); ok('ganti password berhasil', r[0] === 200, r)
r = await call('POST', '/auth/login', null, { username: 'ortu.sari', password: '123456' }); ok('password lama tidak bisa login', r[0] === 401, r)
r = await call('POST', '/auth/login', null, { username: 'ortu.sari', password: 'BaruKuat123' }); ok('password baru bisa login', r[0] === 200, r)
// --- kontrol milik siswa
r = await call('GET', '/siswa/saya/kontrol', sis.token); ok('siswa lihat kontrol sendiri', r[0] === 200 && r[1].limit_aktif === false, r)
r = await call('GET', '/siswa/saya/kontrol', ortu.token); ok('ortu tidak boleh (403)', r[0] === 403, r)
// --- kas tunai
r = await call('GET', '/pos/kas', pic.token); ok('kas awal belum diisi -> sisa null', r[0] === 200 && r[1].sisa === null, r)
r = await call('PUT', '/pos/kas', pic.token, { kas_awal: -5 }); ok('kas awal negatif ditolak', r[0] === 400, r)
r = await call('PUT', '/pos/kas', ortu.token, { kas_awal: 1000 }); ok('ortu tidak boleh atur kas (403)', r[0] === 403, r)
r = await call('PUT', '/pos/kas', pic.token, { kas_awal: 50000 }); ok('PIC atur kas awal 50rb', r[0] === 200 && r[1].sisa === 50000, r)
const [, t] = await call('POST', '/topup', ortu.token, { siswa_id: sis.user.id, nominal: 200000 })
const login2 = await L('ortu.sari', 'BaruKuat123')
await call('POST', `/topup/${t.id}/approve`, admin.token)
const qr = async () => (await call('GET', '/pos/qr', sis.token))[1].token
const tarik = async (n) => call('POST', '/pos/tarik-tunai', pic.token, { siswa_id: sis.user.id, pin: '135790', nominal: n, qr_token: await qr() })
r = await tarik(30000); ok('tarik tunai 30rb lolos', r[0] === 200, r)
r = await call('GET', '/pos/kas', pic.token); ok('sisa kas = 20rb', r[1].sisa === 20000 && r[1].sudah_ditarik === 30000, r)
r = await tarik(25000); ok('tarik 25rb > sisa kas 20rb -> 409', r[0] === 409 && /kas/i.test(r[1].error), r)
r = await tarik(20000); ok('tarik tepat sisa kas lolos', r[0] === 200, r)
const picB = await L('pic.kantin.b', '123456'); r = await call('GET', '/pos/kas', picB.token); ok('kas outlet lain terpisah (belum diisi)', r[1].sisa === null, r)
// --- terbit tagihan massal (regresi: regex tanggal)
const sid = sis.user.id
r = await call('POST', '/admin/tagihan/bulk', admin.token, { nama: 'SPP Tes', nominal: 450000, jatuh_tempo: '2026-10-25', siswa_ids: [sid] }); ok('admin terbitkan tagihan massal', r[0] === 200 || r[0] === 201, r)
r = await call('POST', '/admin/tagihan/bulk', admin.token, { nama: 'SPP Tes', nominal: 450000, jatuh_tempo: '25/10/2026', siswa_ids: [sid] }); ok('format tanggal salah ditolak 400', r[0] === 400, r)
console.log(gagal ? `${gagal} TEST GAGAL` : 'SEMUA TEST LULUS'); process.exit(gagal ? 1 : 0)
