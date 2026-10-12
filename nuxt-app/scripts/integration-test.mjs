// Menjalankan alur nyata lewat modul plugins/api.js YANG SAMA PERSIS
// dipakai halaman Vue — bukan memanggil backend langsung. Ini cara paling
// dekat dengan "klik tombol di browser" yang bisa diuji otomatis tanpa
// browser sungguhan.
import { api, setToken } from '../plugins/api.js'

let gagal = 0
function cek(label, kondisi, detail) {
  if (kondisi) console.log('OK   -', label)
  else { gagal++; console.log('GAGAL-', label, detail ? JSON.stringify(detail) : '') }
}

const run = async () => {
  console.log('=== Integration test: plugins/api.js -> backend asli ===')

  // --- Login ortu, persis alur pages/login.vue ---
  const ortu = await api.login('ortu.sari', '123456')
  setToken(ortu.token)
  cek('Login ortu dpt token & data user', !!ortu.token && ortu.user.role === 'ortu', ortu)

  // --- Dashboard ortu/index.vue: muat anak ---
  const { anak } = await api.anakAnak()
  cek('Dapat 2 anak (Aditya, Kayla)', anak.length === 2, anak)
  const aditya = anak.find((a) => a.nama.includes('Aditya'))
  cek('Saldo awal Aditya = 0', aditya.saldo === 0)

  // --- isi-saldo/index.vue: ajukan top-up saldo saku ---
  const req1 = await api.ajukanTopup(aditya.id, 200000)
  cek('Ajukan top-up saldo saku 200rb', req1.status === 'menunggu' && req1.tagihan_id === null, req1)

  // --- isi-saldo/status.vue: polling status sebelum diproses ---
  const st1 = await api.statusTopup(req1.id)
  cek('Status masih menunggu sebelum admin bertindak', st1.topup.status === 'menunggu')

  // --- Login admin, buka admin/verifikasi.vue ---
  setToken(null)
  const admin = await api.login('admin', 'admin123')
  setToken(admin.token)
  const antrean1 = await api.antreanTopup('menunggu')
  cek('Permintaan Aditya muncul di antrean admin', antrean1.topup.some((t) => t.id === req1.id), antrean1)

  await api.approveTopup(req1.id)
  const st1b = await api.statusTopup(req1.id)
  cek('Setelah admin approve, status jadi disetujui', st1b.topup.status === 'disetujui')

  // --- Balik jadi ortu: saldo harusnya naik, riwayat kecatat ---
  setToken(null)
  const ortu2 = await api.login('ortu.sari', '123456')
  setToken(ortu2.token)
  const saldoBaru = await api.saldo(aditya.id)
  cek('Saldo Aditya jadi 200000 stlh disetujui', saldoBaru.saldo === 200000, saldoBaru)
  const riwayat = await api.riwayat(aditya.id)
  cek('Riwayat mencatat 1 entri top-up dgn sisa=200000', riwayat.riwayat.length === 1 && riwayat.riwayat[0].sisa === 200000, riwayat.riwayat)

  // --- tagihan/_id.vue "Bayar tagihan ini": transfer terikat ke 1 tagihan ---
  const { tagihan } = await api.tagihan(aditya.id)
  const spp = tagihan[0]
  const req2 = await api.ajukanTopup(aditya.id, spp.nominal, spp.id)
  cek('Ajukan transfer utk SPP (tagihan_id terisi)', req2.tagihan_id === spp.id, req2)

  setToken(null)
  setToken(admin.token)
  await api.approveTopup(req2.id)

  setToken(null)
  setToken(ortu2.token)
  const saldoSetelahSPP = await api.saldo(aditya.id)
  cek('Saldo TIDAK berubah krn transfer itu utk tagihan, bukan saldo saku (tetap 200000)', saldoSetelahSPP.saldo === 200000, saldoSetelahSPP)
  const tagihanSetelah = await api.tagihan(aditya.id)
  cek('Tagihan SPP jadi lunas', tagihanSetelah.tagihan.find((t) => t.id === spp.id).status === 'lunas')

  // --- Alur penolakan (dipakai admin/verifikasi.vue tombol "Tolak") ---
  const req3 = await api.ajukanTopup(aditya.id, 999999)
  setToken(null); setToken(admin.token)
  await api.tolakTopup(req3.id, 'Nominal tidak cocok')
  const st3 = await api.statusTopup(req3.id)
  cek('Permintaan yg ditolak status=ditolak & alasan tercatat', st3.topup.status === 'ditolak' && st3.topup.alasan_tolak === 'Nominal tidak cocok', st3.topup)

  // --- Akses ilegal: ortu tidak boleh lihat data ortu lain / anak yg bukan miliknya ---
  const gagalTopup = await api.ajukanTopup(999, 50000).catch((e) => e)
  cek('Top-up utk siswa yg bukan anaknya ditolak server (403)', gagalTopup.status === 403)

  console.log('=================================================')
  console.log(gagal === 0 ? 'SEMUA INTEGRATION TEST LULUS' : gagal + ' TEST GAGAL')
  process.exit(gagal === 0 ? 0 : 1)
}

run().catch((e) => { console.error('CRASH:', e); process.exit(1) })
