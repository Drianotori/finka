const BASE = process.env.BASE_URL || 'http://localhost:3001/api'
let gagal = 0

function cek(label, kondisi, detail) {
  if (kondisi) {
    console.log('OK   -', label)
  } else {
    gagal++
    console.log('GAGAL-', label, detail ? JSON.stringify(detail) : '')
  }
}

async function login(username, password) {
  const r = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await r.json()
  return { status: r.status, data }
}

async function call(method, path, token, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await r.json()
  return { status: r.status, data }
}

const run = async () => {
  console.log('=== Smoke test Finka backend ===')

  const ortuLogin = await login('ortu.sari', '123456')
  cek('Login ortu berhasil', ortuLogin.status === 200, ortuLogin.data)
  const ortuToken = ortuLogin.data.token

  const salahPass = await login('ortu.sari', 'passwordSALAH')
  cek('Login dengan password salah ditolak (401)', salahPass.status === 401)

  const anakAwal = await call('GET', '/ortu/anak-anak', ortuToken)
  cek('Ortu punya 2 anak terdaftar', anakAwal.data.anak && anakAwal.data.anak.length === 2, anakAwal.data)
  const siswaId = anakAwal.data.anak[0].id // Aditya — id sesungguhnya, bukan diasumsikan

  const saldoAwal = await call('GET', `/siswa/${siswaId}/saldo`, ortuToken)
  cek('Saldo awal siswa = 0', saldoAwal.data.saldo === 0, saldoAwal.data)

  const ajukan = await call('POST', '/topup', ortuToken, { siswa_id: siswaId, nominal: 100000 })
  cek('Ortu bisa ajukan top-up', ajukan.status === 201, ajukan.data)
  const topupId = ajukan.data.id

  const adminLogin = await login('admin', 'admin123')
  const adminToken = adminLogin.data.token

  const buatPasangan = await call('POST', '/admin/users/siswa-ortu', adminToken, {
    siswa_nama: 'Smoke Test Siswa', siswa_password: 'smoke123', kelas: '8A', nis: 'SMOKE2409',
    ortu_nama: 'Smoke Test Ortu', ortu_username: 'ortu.smoke', ortu_password: 'smoke123'
  })
  cek('Admin membuat siswa + orang tua sekaligus', buatPasangan.status === 201 && buatPasangan.data.siswa && buatPasangan.data.ortu, buatPasangan.data)
  const siswaBaruId = buatPasangan.data.siswa && buatPasangan.data.siswa.id
  const loginSiswaBaru = await login('SMOKE2409', 'smoke123')
  cek('Siswa baru langsung bisa login memakai NIS + password', loginSiswaBaru.status === 200 && loginSiswaBaru.data.user.role === 'siswa', loginSiswaBaru.data)
  cek('Siswa baru otomatis mendapat PIN POS', /^\d{6}$/.test(String(buatPasangan.data.siswa.pin_awal || '')), buatPasangan.data)


  const approve = await call('POST', `/topup/${topupId}/approve`, adminToken)
  cek('Admin approve top-up', approve.status === 200, approve.data)

  const approveLagi = await call('POST', `/topup/${topupId}/approve`, adminToken)
  cek('Approve dobel ditolak (409)', approveLagi.status === 409, approveLagi.data)

  const saldoSetelahTopup = await call('GET', `/siswa/${siswaId}/saldo`, ortuToken)
  cek('Saldo jadi 100000 setelah top-up disetujui', saldoSetelahTopup.data.saldo === 100000, saldoSetelahTopup.data)

  const picLogin = await login('pic.kantin.utama', '123456')
  const picToken = picLogin.data.token
  const siswaLogin = await login('aditya.p', '123456')
  const siswaToken = siswaLogin.data.token
  const produkRes = await call('GET', '/pos/produk', picToken)
  const produk = produkRes.data.produk || []
  const produkA = produk.find(p => p.nama.startsWith('Paket A')) || produk[0]
  const produkB = produk.find(p => p.nama.startsWith('Paket B')) || produk[1]
  cek('Daftar produk POS tersedia', produkRes.status === 200 && produkA && produkB, produkRes.data)
  const qr1 = await call('GET', '/pos/qr', siswaToken)

  const pinSalah = await call('POST', '/pos/transaksi', picToken, { siswa_id: siswaId, pin: '000000', qr_token: qr1.data.token, items: [{ produk_id: produkA.id, qty: 1 }] })
  cek('Transaksi dengan PIN salah ditolak (401)', pinSalah.status === 401, pinSalah.data)

  const qr2 = await call('GET', '/pos/qr', siswaToken)
  const beli = await call('POST', '/pos/transaksi', picToken, {
    siswa_id: siswaId, pin: '135790', qr_token: qr2.data.token, items: [{ produk_id: produkA.id, qty: 1 }, { produk_id: produkB.id, qty: 2 }]
  })
  // Paket A 15000 + 2x Paket B 12000 = 39000
  cek('Transaksi kantin berhasil, total 39000', beli.status === 200 && beli.data.total === 39000, beli.data)
  cek('Saldo berkurang jadi 61000', beli.data.saldo_baru === 61000, beli.data)

  const tagihanList = await call('GET', '/tagihan?siswa_id=' + siswaId, ortuToken)
  const tagihanId = tagihanList.data.tagihan[0].id

  const bayarTagihan = await call('POST', `/tagihan/${tagihanId}/bayar`, ortuToken)
  cek('Bayar SPP 450000 dari saldo saku ditolak, saldo cuma 61000 (402)', bayarTagihan.status === 402, bayarTagihan.data)

  const ajukanBayarTagihan = await call('POST', '/topup', ortuToken, { siswa_id: siswaId, nominal: 450000, tagihan_id: tagihanId })
  cek('Ajukan transfer utk bayar tagihan langsung', ajukanBayarTagihan.status === 201 && ajukanBayarTagihan.data.tagihan_id === tagihanId, ajukanBayarTagihan.data)

  const approveTagihan = await call('POST', `/topup/${ajukanBayarTagihan.data.id}/approve`, adminToken)
  cek('Admin approve transfer tagihan', approveTagihan.status === 200, approveTagihan.data)

  const saldoSetelahBayarTagihan = await call('GET', `/siswa/${siswaId}/saldo`, ortuToken)
  cek('Saldo saku TIDAK berubah krn transfer tagihan bukan top-up saku (tetap 61000)', saldoSetelahBayarTagihan.data.saldo === 61000, saldoSetelahBayarTagihan.data)

  const tagihanSetelah = await call('GET', '/tagihan?siswa_id=' + siswaId, ortuToken)
  cek('Tagihan berubah status jadi lunas', tagihanSetelah.data.tagihan.find(t => t.id === tagihanId).status === 'lunas', tagihanSetelah.data)

  const qr3 = await call('GET', '/pos/qr', siswaToken)
  const tarikBerlebih = await call('POST', '/pos/tarik-tunai', picToken, { siswa_id: siswaId, pin: '135790', nominal: 1000000, qr_token: qr3.data.token })
  cek('Tarik tunai melebihi saldo ditolak (402)', tarikBerlebih.status === 402, tarikBerlebih.data)

  const riwayat = await call('GET', `/siswa/${siswaId}/riwayat`, ortuToken)
  cek('Riwayat mencatat 2 entri ledger (topup + pembelian)', riwayat.data.riwayat.length === 2, riwayat.data)


  const laporan = await call('GET', '/admin/laporan', adminToken)
  cek('Laporan admin tersedia dari data asli', laporan.status === 200 && laporan.data.ringkasan, laporan.data)
  cek('Rekonsiliasi selisih = 0 setelah transaksi yang valid', laporan.data.ringkasan && laporan.data.ringkasan.selisih === 0, laporan.data)

  const audit = await call('GET', '/admin/audit?limit=200', adminToken)
  cek('Audit log tersedia', audit.status === 200 && Array.isArray(audit.data.audit), audit.data)
  cek('Audit mencatat approve top-up', audit.data.audit && audit.data.audit.some(a => a.aksi === 'SETUJUI_TOPUP'), audit.data)
  cek('Audit mencatat transaksi POS', audit.data.audit && audit.data.audit.some(a => a.aksi === 'TRANSAKSI_POS'), audit.data)

  const picLihatSiswaLain = await call('GET', `/siswa/999/saldo`, picToken)
  cek('PIC boleh lihat saldo siswa manapun', picLihatSiswaLain.status !== 403)

  const ortuAsingCobaTopup = await call('POST', '/topup', ortuToken, { siswa_id: 999, nominal: 50000 })
  cek('Ortu tidak bisa top-up untuk siswa yang bukan anaknya (403)', ortuAsingCobaTopup.status === 403, ortuAsingCobaTopup.data)

  const nonaktif = await call('PATCH', `/admin/users/${siswaBaruId}/status`, adminToken, { active: false })
  cek('Admin bisa menonaktifkan akun tanpa menghapus data', nonaktif.status === 200 && nonaktif.data.active === false, nonaktif.data)
  const loginNonaktif = await login('SMOKE2409', 'smoke123')
  cek('Akun nonaktif ditolak saat login (403)', loginNonaktif.status === 403, loginNonaktif.data)

  console.log('===============================')
  console.log(gagal === 0 ? 'SEMUA TEST LULUS' : gagal + ' TEST GAGAL')
  process.exit(gagal === 0 ? 0 : 1)
}

run().catch((e) => { console.error('Smoke test crash:', e); process.exit(1) })
