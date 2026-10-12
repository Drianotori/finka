// Tes ganti PIN siswa, riwayat kasir, pembatalan transaksi, tutup kas. Butuh backend + data demo, DB baru.
// Untuk menguji batas waktu pembatalan, set DATABASE_URL yang sama dengan server (mengubah waktu transaksi lewat SQL).
import pg from 'pg'
const B = process.env.BASE_URL || 'http://localhost:3001/api'
const call = async (m, p, t, b) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return [r.status, await r.json().catch(() => ({}))] }
const L = async (u, p) => (await call('POST', '/auth/login', null, { username: u, password: p }))[1]
let gagal = 0
const ok = (n, c, x) => { if (!c) gagal++; console.log(c ? 'OK   ' : 'GAGAL', n, c ? '' : JSON.stringify(x)) }
const admin = await L('admin', 'admin123'), pic = await L('pic.kantin.utama', '123456'), picB = await L('pic.kantin.b', '123456'), ortu = await L('ortu.sari', '123456'), sis = await L('aditya.p', '123456')
const sid = sis.user.id
const sql = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null
const saldo = async () => (await call('GET', `/siswa/${sid}/saldo`, admin.token))[1].saldo
let r

// --- ganti PIN siswa
r = await call('POST', '/siswa/saya/ganti-pin', ortu.token, { pin_lama: '135790', pin_baru: '482915' }); ok('ortu tidak boleh ganti PIN siswa (403)', r[0] === 403, r)
r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: '135790', pin_baru: '12345' }); ok('PIN baru 5 digit ditolak', r[0] === 400, r)
r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: '135790', pin_baru: 'abcdef' }); ok('PIN huruf ditolak', r[0] === 400, r)
for (const lemah of ['111111', '123456', '654321']) { r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: '135790', pin_baru: lemah }); ok(`PIN lemah ${lemah} ditolak`, r[0] === 400 && /mudah ditebak/.test(r[1].error), r) }
r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: '135790', pin_baru: '135790' }); ok('PIN sama ditolak', r[0] === 400, r)
r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: '999111', pin_baru: '482915' }); ok('PIN lama salah -> 401', r[0] === 401, r)
r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: '135790', pin_baru: '482915' }); ok('ganti PIN berhasil', r[0] === 200, r)
const PIN = '482915'
await call('POST', '/topup', ortu.token, { siswa_id: sid, nominal: 300000 }).then(async ([, t]) => call('POST', `/topup/${t.id}/approve`, admin.token))
const qr = async () => (await call('GET', '/pos/qr', sis.token))[1].token
r = await call('POST', '/pos/tarik-tunai', pic.token, { siswa_id: sid, pin: '135790', nominal: 5000, qr_token: await qr() }); ok('PIN lama tidak berlaku di kasir (401)', r[0] === 401, r)
for (let i = 0; i < 5; i++) r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: '000999', pin_baru: '482916' })
r = await call('POST', '/siswa/saya/ganti-pin', sis.token, { pin_lama: PIN, pin_baru: '482916' }); ok('5x PIN lama salah -> terkunci 429, bahkan PIN benar ditolak', r[0] === 429, r)
if (sql) await sql.query('DELETE FROM pin_percobaan'); else await call('POST', `/admin/users/${sid}/reset-pin`, admin.token)

// reset-pin lewat admin mengubah PIN; pakai PIN yang diketahui lagi bila perlu
if (!sql) { /* tanpa SQL: reset-pin menghasilkan PIN acak */ }
const rp = sql ? null : (await call('POST', `/admin/users/${sid}/reset-pin`, admin.token))[1]
const PIN_AKTIF = rp ? rp.pin : PIN

// --- produk & belanja
const prodUtama = (await call('GET', '/pos/produk', pic.token))[1].produk
const p1 = prodUtama[0]
const beli = async (token = pic.token, qty = 1, pin = PIN_AKTIF) => call('POST', '/pos/transaksi', token, { siswa_id: sid, pin, items: [{ produk_id: p1.id, qty }], qr_token: await qr() })
const s0 = await saldo()
r = await beli(); const trx1 = r[1].ledger_id; ok('belanja berhasil dengan PIN baru', r[0] === 200 && !!trx1, r)
r = await call('GET', '/pos/riwayat-hari-ini', pic.token)
ok('riwayat hari ini memuat transaksi, ringkasan benar', r[0] === 200 && r[1].transaksi.some((t) => t.id === trx1 && t.bisa_dibatalkan) && r[1].ringkasan.penjualan === p1.harga && r[1].ringkasan.jumlah === 1, r)
r = await call('GET', '/pos/riwayat-hari-ini', picB.token); ok('riwayat outlet lain tidak memuat transaksi ini', r[0] === 200 && r[1].transaksi.length === 0, r)
r = await call('GET', '/pos/riwayat-hari-ini', ortu.token); ok('ortu tidak boleh (403)', r[0] === 403, r)

// --- pembatalan
r = await call('POST', `/pos/transaksi/${trx1}/batal`, picB.token, { alasan: 'iseng' }); ok('PIC outlet lain tidak boleh membatalkan (403)', r[0] === 403, r)
r = await call('POST', `/pos/transaksi/${trx1}/batal`, pic.token, { alasan: 'a' }); ok('alasan terlalu pendek ditolak', r[0] === 400, r)
r = await call('POST', `/pos/transaksi/${trx1}/batal`, ortu.token, { alasan: 'ortu coba' }); ok('ortu tidak boleh (403)', r[0] === 403, r)
r = await call('POST', '/pos/transaksi/999999/batal', pic.token, { alasan: 'tidak ada' }); ok('transaksi tak ada -> 404', r[0] === 404, r)
r = await call('POST', `/pos/transaksi/${trx1}/batal`, pic.token, { alasan: 'salah pilih produk' }); ok('PIC membatalkan transaksi 1', r[0] === 200 && r[1].saldo_baru === s0, r)
ok('saldo kembali seperti sebelum belanja', (await saldo()) === s0, await saldo())
r = await call('POST', `/pos/transaksi/${trx1}/batal`, pic.token, { alasan: 'batal lagi' }); ok('batal dua kali -> 409', r[0] === 409, r)
r = await call('GET', '/pos/riwayat-hari-ini', pic.token); ok('riwayat menandai dibatalkan & tidak dihitung', r[1].transaksi.find((t) => t.id === trx1).dibatalkan === true && r[1].ringkasan.penjualan === 0 && r[1].ringkasan.dibatalkan === 1, r)
r = await call('GET', `/siswa/${sid}/riwayat`, admin.token); ok('riwayat siswa memuat baris pembalik', JSON.stringify(r[1]).includes('Pembatalan transaksi #' + trx1), r)
const dash = (await call('GET', '/admin/dashboard', admin.token))[1]; ok('dashboard: omzet outlet tidak menghitung transaksi batal', dash.outlets.find((o) => o.outlet === 'kantin_utama').nilai === 0, dash.outlets)
const lap = (await call('GET', '/admin/laporan', admin.token))[1].ringkasan; ok('laporan: selisih rekonsiliasi tetap 0 setelah pembatalan', lap.selisih === 0, lap)

// batas limit harian dipulihkan
await call('PUT', `/ortu/anak/${sid}/kontrol`, ortu.token, { limit_aktif: true, limit: 20000, kartu_diblokir: false })
r = await beli(pic.token, 1); const trx2 = r[1].ledger_id
r = await beli(pic.token, 1)
const k1 = (await call('GET', '/siswa/saya/kontrol', sis.token))[1]
await call('POST', `/pos/transaksi/${trx2}/batal`, pic.token, { alasan: 'uji limit' })
const k2 = (await call('GET', '/siswa/saya/kontrol', sis.token))[1]; ok('pembatalan mengembalikan jatah limit harian', k2.terpakai_hari_ini === k1.terpakai_hari_ini - p1.harga, [k1, k2])
await call('PUT', `/ortu/anak/${sid}/kontrol`, ortu.token, { limit_aktif: false, limit: 20000, kartu_diblokir: false })

// batas waktu
r = await beli(pic.token, 1); const trx3 = r[1].ledger_id
if (sql) {
  await sql.query("UPDATE ledger SET created_at = created_at - INTERVAL '16 minutes' WHERE id = $1", [trx3])
  r = await call('POST', `/pos/transaksi/${trx3}/batal`, pic.token, { alasan: 'terlambat' }); ok('PIC lewat batas waktu ditolak (403)', r[0] === 403 && /Batas waktu/.test(r[1].error), r)
  r = await call('GET', '/pos/riwayat-hari-ini', pic.token); ok('riwayat: bisa_dibatalkan=false untuk PIC setelah jendela', r[1].transaksi.find((t) => t.id === trx3).bisa_dibatalkan === false, r)
  r = await call('GET', '/pos/riwayat-hari-ini?outlet=kantin_utama', admin.token); ok('admin melihat riwayat outlet & bisa membatalkan kapan saja', r[0] === 200 && r[1].transaksi.find((t) => t.id === trx3).bisa_dibatalkan === true, r)
} else console.log('LEWAT  uji batas waktu (DATABASE_URL tidak diset)')
r = await call('POST', `/pos/transaksi/${trx3}/batal`, admin.token, { alasan: 'dibatalkan admin' }); ok('admin membatalkan', r[0] === 200, r)

// --- tarik tunai, kas, dan pembatalan
r = await call('GET', '/pos/tutup-kas', pic.token); ok('tutup kas: belum ditutup', r[0] === 200 && r[1].ditutup === null, r)
r = await call('POST', '/pos/tutup-kas', pic.token, { kas_fisik: 1000 }); ok('tutup kas tanpa kas awal -> 409', r[0] === 409, r)
await call('PUT', '/pos/kas', pic.token, { kas_awal: 50000 })
const tarik = async (n) => call('POST', '/pos/tarik-tunai', pic.token, { siswa_id: sid, pin: PIN_AKTIF, nominal: n, qr_token: await qr() })
r = await tarik(30000); const tt1 = r[1].ledger_id; ok('tarik tunai 30rb', r[0] === 200, r)
r = await tarik(30000); ok('tarik 30rb lagi melebihi kas (409)', r[0] === 409, r)
await call('POST', `/pos/transaksi/${tt1}/batal`, pic.token, { alasan: 'salah nominal' })
r = await call('GET', '/pos/kas', pic.token); ok('pembatalan tarik tunai mengembalikan kas laci', r[1].sudah_ditarik === 0 && r[1].sisa === 50000, r)
r = await tarik(20000); ok('tarik tunai 20rb', r[0] === 200, r)
r = await call('POST', '/pos/tutup-kas', pic.token, { kas_fisik: -1 }); ok('kas fisik negatif ditolak', r[0] === 400, r)
r = await call('POST', '/pos/tutup-kas', ortu.token, { kas_fisik: 30000 }); ok('ortu tidak boleh tutup kas (403)', r[0] === 403, r)
r = await call('POST', '/pos/tutup-kas', pic.token, { kas_fisik: 29000 }); ok('tutup kas: fisik 29rb, diharapkan 30rb, selisih -1000', r[0] === 200 && r[1].ditutup.diharapkan === 30000 && r[1].ditutup.selisih === -1000, r)
r = await call('POST', '/pos/tutup-kas', pic.token, { kas_fisik: 30000 }); ok('tutup ulang (koreksi hitung) menimpa, selisih 0', r[0] === 200 && r[1].ditutup.selisih === 0, r)
r = await call('GET', '/admin/tutup-kas', admin.token); ok('admin melihat penutupan 3 outlet (1 tertutup)', r[0] === 200 && r[1].outlets.length === 3 && r[1].outlets.find((o) => o.outlet === 'kantin_utama').ditutup === true && r[1].outlets.filter((o) => o.ditutup).length === 1, r)
r = await call('GET', '/admin/tutup-kas', pic.token); ok('PIC tidak boleh lihat rekap admin (403)', r[0] === 403, r)
r = await call('GET', '/admin/audit?aksi=BATAL_TRANSAKSI', admin.token); ok('pembatalan tercatat di audit', r[0] === 200 && r[1].audit.length >= 4, r)
r = await call('GET', '/admin/audit?aksi=TUTUP_KAS', admin.token); ok('tutup kas tercatat di audit (2x)', r[0] === 200 && r[1].audit.length === 2, r)
if (sql) await sql.end()
console.log(gagal ? `${gagal} TEST GAGAL` : 'SEMUA TEST LULUS'); process.exit(gagal ? 1 : 0)
