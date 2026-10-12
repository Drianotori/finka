// Tes edit tagihan, ekspor CSV, kenaikan kelas, arsip lulusan. Butuh backend + data demo, DB baru.
const B = process.env.BASE_URL || 'http://localhost:3001/api'
const call = async (m, p, t, b) => { const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return [r.status, await r.json().catch(() => ({}))] }
const raw = async (p, t) => { const r = await fetch(B + p, { headers: { Authorization: 'Bearer ' + t } }); return [r.status, Buffer.from(await r.arrayBuffer()).toString('utf8'), r.headers] }
const L = async (u, p) => (await call('POST', '/auth/login', null, { username: u, password: p }))[1]
let gagal = 0
const ok = (n, c, x) => { if (!c) gagal++; console.log(c ? 'OK   ' : 'GAGAL', n, c ? '' : JSON.stringify(x)) }
const admin = await L('admin', 'admin123'), pic = await L('pic.kantin.utama', '123456'), ortu = await L('ortu.sari', '123456'), sis = await L('aditya.p', '123456')
const sid = sis.user.id
let r

// ---------- edit tagihan
await call('POST', '/admin/tagihan/bulk', admin.token, { nama: 'SPP Edit', nominal: 100000, jatuh_tempo: '2026-11-10', siswa_ids: [sid] })
const tid = (await call('GET', '/admin/tagihan?q=spp%20edit', admin.token))[1].tagihan[0].id
const body = { nama: 'SPP November', nominal: 120000, jatuh_tempo: '2026-11-15' }
r = await call('PUT', `/admin/tagihan/${tid}`, ortu.token, body); ok('ortu tidak boleh edit tagihan (403)', r[0] === 403, r)
r = await call('PUT', `/admin/tagihan/${tid}`, admin.token, { ...body, nominal: -5 }); ok('nominal negatif ditolak', r[0] === 400, r)
r = await call('PUT', `/admin/tagihan/${tid}`, admin.token, { ...body, nominal: 999999999999 }); ok('nominal raksasa ditolak', r[0] === 400, r)
r = await call('PUT', `/admin/tagihan/${tid}`, admin.token, { ...body, jatuh_tempo: '15/11/2026' }); ok('format tanggal salah ditolak', r[0] === 400, r)
r = await call('PUT', '/admin/tagihan/999999', admin.token, body); ok('tagihan tak ada -> 404', r[0] === 404, r)
r = await call('PUT', `/admin/tagihan/${tid}`, admin.token, body); ok('edit tagihan berhasil', r[0] === 200, r)
let t = (await call('GET', '/admin/tagihan?q=spp%20november', admin.token))[1].tagihan[0]
ok('perubahan tersimpan, jatuh_tempo berupa teks YYYY-MM-DD murni', t && t.id === tid && t.nominal === 120000 && t.jatuh_tempo === '2026-11-15', t)
const tOrtu = (await call('GET', `/tagihan?siswa_id=${sid}`, ortu.token))[1].tagihan.find((x) => x.id === tid)
ok('orang tua menerima jatuh_tempo "2026-11-15" (bukan timestamp -> tidak jadi NaN di layar)', tOrtu && tOrtu.jatuh_tempo === '2026-11-15', tOrtu)
const [, tp] = await call('POST', '/topup', ortu.token, { siswa_id: sid, nominal: 120000, tagihan_id: tid })
r = await call('PUT', `/admin/tagihan/${tid}`, admin.token, { ...body, nominal: 130000 }); ok('ada transfer menunggu -> tidak boleh diubah (409)', r[0] === 409, r)
await call('POST', `/topup/${tp.id}/approve`, admin.token)
r = await call('PUT', `/admin/tagihan/${tid}`, admin.token, { ...body, nominal: 130000 }); ok('tagihan lunas tidak boleh diubah (409)', r[0] === 409, r)
r = await call('GET', '/admin/audit?aksi=UBAH_TAGIHAN', admin.token); ok('edit tercatat di audit', r[1].audit.length === 1 && /100\.000.*120\.000/.test(r[1].audit[0].perubahan), r)

// ---------- siapkan data kelas via impor
const baris = [
  { no: 2, nama_siswa: '=HYPERLINK("http://x")', nis: '90000001', kelas: '9A', nama_ortu: 'Ortu Lulus', username_ortu: 'ortu.lulus' },
  { no: 3, nama_siswa: 'Lulus Dua', nis: '90000002', kelas: '9A', nama_ortu: 'Ortu Lulus', username_ortu: 'ortu.lulus' },
  { no: 4, nama_siswa: 'Lulus Tiga', nis: '90000003', kelas: '9A', nama_ortu: 'Ortu Campur', username_ortu: 'ortu.campur' },
  { no: 5, nama_siswa: 'Kelas Delapan A', nis: '90000004', kelas: '8B', nama_ortu: 'Ortu Campur', username_ortu: 'ortu.campur' },
  { no: 6, nama_siswa: 'Kelas Delapan B', nis: '90000005', kelas: '8B', nama_ortu: 'Ortu Delapan', username_ortu: 'ortu.delapan' }
]
r = await call('POST', '/admin/impor-siswa', admin.token, { baris, simpan: true }); const akun = r[1].akun || []; ok('data uji kelas dibuat', r[0] === 201 && akun.length === 5, r)
const idOf = async (nis) => (await call('GET', '/siswa', admin.token))[1].siswa.find((x) => x.nis === nis).id

// ---------- ekspor CSV
await call('POST', `/admin/users/${sid}/koreksi-saldo`, admin.token, { nominal: 1000, alasan: 'uji ekspor' })
r = await raw('/admin/ekspor/transaksi.csv', pic.token); ok('PIC tidak boleh ekspor (403)', r[0] === 403, r[1])
r = await raw('/admin/ekspor/transaksi.csv?dari=2026-01-01&sampai=2027-12-31', admin.token); ok('rentang > 366 hari ditolak', r[0] === 400, r[1])
r = await raw('/admin/ekspor/transaksi.csv?dari=2026-12-01&sampai=2026-11-01', admin.token); ok('dari > sampai ditolak', r[0] === 400, r[1])
r = await raw('/admin/ekspor/transaksi.csv', admin.token)
ok('transaksi.csv: tipe, BOM, header, attachment', r[0] === 200 && /text\/csv/.test(r[2].get('content-type')) && /attachment; filename="finka-transaksi-/.test(r[2].get('content-disposition')) && r[1].startsWith('﻿Waktu (WIB);Siswa;NIS;Kelas;Jenis;Nominal'), r[1].slice(0, 120))
ok('transaksi.csv memuat baris koreksi hari ini', /Penyesuaian;1000;Koreksi admin: uji ekspor/.test(r[1]), r[1])
r = await raw('/admin/ekspor/tagihan.csv', admin.token); ok('tagihan.csv memuat SPP November, status Lunas', r[0] === 200 && /SPP November;130000|SPP November;120000/.test(r[1]) && /Lunas/.test(r[1]), r[1])
r = await raw('/admin/ekspor/rekap-harian.csv?dari=2026-10-01&sampai=2026-10-03', admin.token); ok('rekap-harian.csv: 3 hari + header', r[0] === 200 && r[1].trim().split('\r\n').length === 4, r[1])
r = await raw('/admin/ekspor/saldo-siswa.csv', admin.token); ok('saldo-siswa.csv: rumus berbahaya dinetralkan & ada total', r[0] === 200 && r[1].includes(`"'=HYPERLINK(""http://x"")"`) && /TOTAL SALDO MENGENDAP/.test(r[1]), r[1].slice(0, 400))
r = await call('GET', '/admin/audit?aksi=EKSPOR_CSV', admin.token); ok('ekspor tercatat di audit', r[1].audit.length >= 4, r)

// ---------- arsip lulusan
const s1 = await idOf('90000001')
await call('POST', `/admin/users/${s1}/koreksi-saldo`, admin.token, { nominal: 25000, alasan: 'saldo awal uji arsip' })
r = await call('POST', '/admin/kelas/arsip', ortu.token, { kelas: '9A' }); ok('ortu tidak boleh arsip (403)', r[0] === 403, r)
r = await call('POST', '/admin/kelas/arsip', admin.token, { kelas: 'ZZ' }); ok('kelas tak ada -> 404', r[0] === 404, r)
r = await call('POST', '/admin/kelas/arsip', admin.token, { kelas: '9A' }); ok('pratinjau arsip: 3 siswa, 1 bersaldo, ortu.lulus ikut nonaktif, ortu.campur tidak', r[0] === 200 && r[1].simpan === false && r[1].jumlah_siswa === 3 && r[1].siswa_bersaldo === 1 && r[1].total_saldo === 25000 && r[1].akun_ortu_ikut_nonaktif === 1, r)
ok('pratinjau tidak mengubah apa pun', (await L('90000002', akun[1].password_siswa)).token !== undefined, 0)
r = await call('POST', '/admin/kelas/arsip', admin.token, { kelas: '9A', simpan: true }); ok('simpan tanpa mengakui saldo -> 409', r[0] === 409 && r[1].perlu_konfirmasi_saldo === true, r)
r = await call('POST', '/admin/kelas/arsip', admin.token, { kelas: '9A', simpan: true, akui_saldo: true }); ok('arsip tersimpan', r[0] === 200 && r[1].simpan === true, r)
r = await call('POST', '/auth/login', null, { username: '90000002', password: akun[1].password_siswa }); ok('siswa terarsip tidak bisa login (403)', r[0] === 403, r)
r = await call('POST', '/auth/login', null, { username: 'ortu.lulus', password: akun[0].password_ortu }); ok('ortu yang semua anaknya lulus ikut nonaktif (403)', r[0] === 403, r)
r = await call('POST', '/auth/login', null, { username: 'ortu.campur', password: akun[2].password_ortu }); ok('ortu dengan anak lain yang aktif tetap aktif', r[0] === 200, r)
r = await call('GET', `/siswa/${s1}/riwayat`, admin.token); ok('riwayat siswa terarsip tetap utuh', r[0] === 200 && r[1].riwayat.length >= 1, r)
r = await call('GET', '/admin/audit?aksi=ARSIP_KELAS', admin.token); ok('arsip tercatat di audit', r[1].audit.length === 1, r)

// ---------- kenaikan kelas
const kelasSiswa = (await call('GET', '/siswa', admin.token))[1].siswa
const kelasAditya = kelasSiswa.find((x) => x.id === sid).kelas
r = await call('POST', '/admin/kelas/naik', ortu.token, { pemetaan: [{ dari: '8B', ke: '9B' }] }); ok('ortu tidak boleh (403)', r[0] === 403, r)
r = await call('POST', '/admin/kelas/naik', admin.token, { pemetaan: [{ dari: '8B', ke: '8B' }] }); ok('asal = tujuan ditolak', r[0] === 400, r)
r = await call('POST', '/admin/kelas/naik', admin.token, { pemetaan: [{ dari: '8B', ke: '9B' }, { dari: '8B', ke: '9C' }] }); ok('kelas asal dobel ditolak', r[0] === 400, r)
const peta = [{ dari: kelasAditya, ke: '8B' }, { dari: '8B', ke: '9B' }, { dari: 'KOSONG', ke: 'X' }]
r = await call('POST', '/admin/kelas/naik', admin.token, { pemetaan: peta }); ok('pratinjau: jumlah per kelas & kelas kosong ditandai', r[0] === 200 && r[1].simpan === false && r[1].pemetaan[1].siswa === 2 && r[1].kelas_kosong.includes('KOSONG'), r)
r = await call('POST', '/admin/kelas/naik', admin.token, { pemetaan: peta, simpan: true }); ok('kenaikan kelas tersimpan', r[0] === 200 && r[1].simpan === true, r)
const sesudah = (await call('GET', '/siswa', admin.token))[1].siswa
const kelasDari = (nis) => (sesudah.find((x) => x.nis === nis) || {}).kelas
ok('serentak, tidak berantai: siswa lama 8B -> 9B, kelas Aditya -> 8B', kelasDari('90000004') === '9B' && kelasDari('90000005') === '9B' && sesudah.find((x) => x.id === sid).kelas === '8B', sesudah.map((x) => [x.nis, x.kelas]))
r = await call('GET', '/admin/audit?aksi=KENAIKAN_KELAS', admin.token); ok('kenaikan kelas tercatat di audit', r[1].audit.length === 1, r)
console.log(gagal ? `${gagal} TEST GAGAL` : 'SEMUA TEST LULUS'); process.exit(gagal ? 1 : 0)
