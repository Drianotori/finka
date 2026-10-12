/**
 * API client frontend.
 *
 * Semua request ke backend sebaiknya melewati file ini. Dengan begitu format
 * URL, header JWT, parsing response, dan penanganan error tidak tersebar
 * di banyak halaman Vue.
 */
// Klien API murni (tanpa dependensi Vue/Nuxt) supaya bisa dipakai baik di
// dalam komponen/store Nuxt maupun langsung dari skrip Node untuk testing.
//
// Di Nuxt 2, process.env TIDAK ikut masuk ke bundle browser. Alamat API yang
// sebenarnya diisi lewat plugins/api-config.js dari publicRuntimeConfig
// (variabel lingkungan API_BASE_URL dibaca saat `nuxt start`). Nilai di bawah
// hanya fallback untuk skrip Node (mis. integration-test) dan development.
const DEFAULT_BASE_URL = (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) || 'http://localhost:3001/api'
export let BASE_URL = DEFAULT_BASE_URL
export function setBaseUrl(url) { if (url) BASE_URL = String(url).replace(/\/+$/, '') }

let _token = null
export function setToken(t) { _token = t }
export function getToken() { return _token }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (_token) headers.Authorization = 'Bearer ' + _token

  let res
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch (e) {
    const err = new Error('Tidak bisa menghubungi server. Pastikan backend jalan di ' + BASE_URL)
    err.status = 0
    throw err
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Terjadi kesalahan (' + res.status + ')')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  me: () => request('GET', '/auth/me'),

  anakAnak: () => request('GET', '/ortu/anak-anak'),
  riwayatPembayaran: () => request('GET', '/ortu/riwayat-pembayaran'),
  notifikasiOrtu: () => request('GET', '/ortu/notifikasi'),
  profilSiswa: (siswaId) => request('GET', '/siswa/' + siswaId),
  saldo: (siswaId) => request('GET', '/siswa/' + siswaId + '/saldo'),
  riwayat: (siswaId) => request('GET', '/siswa/' + siswaId + '/riwayat'),
  daftarSiswa: () => request('GET', '/siswa'),
  produk: () => request('GET', '/pos/produk'),
  qrSiswa: () => request('GET', '/pos/qr'),
  resolveQr: (token) => request('POST', '/pos/qr/resolve', { token }),
  tambahProduk: (nama, harga, outlet) => request('POST', '/pos/produk', { nama, harga, outlet }),
  ubahProduk: (id, nama, harga) => request('PUT', '/pos/produk/' + id, { nama, harga }),
  hapusProduk: (id) => request('DELETE', '/pos/produk/' + id),
  transaksi: (siswaId, pin, items, qrToken) => request('POST', '/pos/transaksi', { siswa_id: siswaId, pin, items, qr_token: qrToken }),
  tarikTunai: (siswaId, pin, nominal, qrToken) => request('POST', '/pos/tarik-tunai', { siswa_id: siswaId, pin, nominal, qr_token: qrToken }),

  kontrolSaya: () => request('GET', '/siswa/saya/kontrol'),
  gantiPassword: (lama, baru) => request('POST', '/auth/ganti-password', { password_lama: lama, password_baru: baru }),
  kas: () => request('GET', '/pos/kas'),
  setKas: (kasAwal) => request('PUT', '/pos/kas', { kas_awal: kasAwal }),
  infoPembayaran: () => request('GET', '/config/pembayaran'),
  kontrolAnak: (siswaId) => request('GET', '/ortu/anak/' + siswaId + '/kontrol'),
  resetPinAnak: (siswaId) => request('POST', '/ortu/anak/' + siswaId + '/reset-pin'),
  simpanKontrol: (siswaId, payload) => request('PUT', '/ortu/anak/' + siswaId + '/kontrol', payload),

  tagihan: (siswaId) => request('GET', '/tagihan?siswa_id=' + siswaId),

  ajukanTopup: (siswaId, nominal, tagihanId) =>
    request('POST', '/topup', { siswa_id: siswaId, nominal, tagihan_id: tagihanId || undefined }),
  statusTopup: (id) => request('GET', '/topup/' + id),
  buktiTopup: (id) => request('GET', '/topup/' + id + '/proof'),
  uploadBuktiTopup: (id, dataUrl, nama, mime, ukuran) =>
    request('POST', '/topup/' + id + '/proof', { data_url: dataUrl, nama, mime, ukuran }),
  antreanTopup: (status) => request('GET', '/topup' + (status ? '?status=' + status : '')),
  approveTopup: (id) => request('POST', '/topup/' + id + '/approve'),
  tolakTopup: (id, alasan) => request('POST', '/topup/' + id + '/tolak', { alasan }),
  terimaKembaliTopup: (id) => request('POST', '/topup/' + id + '/terima-kembali'),
  dashboard: (tanggal) => request('GET', '/admin/dashboard' + (tanggal ? '?tanggal=' + encodeURIComponent(tanggal) : '')),
  laporan: (tanggal) => request('GET', '/admin/laporan' + (tanggal ? '?tanggal=' + encodeURIComponent(tanggal) : '')),
  audit: (limit, beforeId) => request('GET', '/admin/audit?limit=' + (limit || 100) + (beforeId ? '&before_id=' + encodeURIComponent(beforeId) : '')),
  adminUsers: () => request('GET', '/admin/users'),
  tagihanRingkasan: (bulan) => request('GET', '/admin/tagihan-ringkasan' + (bulan ? '?bulan=' + encodeURIComponent(bulan) : '')),
  buatTagihan: (payload) => request('POST', '/admin/tagihan/bulk', payload),
  gantiPin: (pinLama, pinBaru) => request('POST', '/siswa/saya/ganti-pin', { pin_lama: pinLama, pin_baru: pinBaru }),
  riwayatKasir: () => request('GET', '/pos/riwayat-hari-ini'),
  batalTransaksi: (id, alasan) => request('POST', '/pos/transaksi/' + id + '/batal', { alasan }),
  statusTutupKas: () => request('GET', '/pos/tutup-kas'),
  tutupKas: (kasFisik) => request('POST', '/pos/tutup-kas', { kas_fisik: kasFisik }),
  tutupKasAdmin: (tanggal) => request('GET', '/admin/tutup-kas' + (tanggal ? '?tanggal=' + tanggal : '')),
  ubahTagihan: (id, payload) => request('PUT', '/admin/tagihan/' + id, payload),
  naikKelas: (pemetaan, simpan) => request('POST', '/admin/kelas/naik', { pemetaan, simpan }),
  arsipKelas: (kelas, simpan, akuiSaldo) => request('POST', '/admin/kelas/arsip', { kelas, simpan, akui_saldo: akuiSaldo }),
  unduh: async (path, namaBerkas) => {
    const res = await fetch(BASE_URL + path, { headers: { Authorization: 'Bearer ' + _token } })
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Gagal mengunduh (' + res.status + ')') }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a'); a.href = url; a.download = namaBerkas; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  },
  daftarTagihan: (q) => request('GET', '/admin/tagihan' + (q ? '?' + new URLSearchParams(q).toString() : '')),
  batalTagihan: (id, alasan) => request('POST', '/admin/tagihan/' + id + '/batal', { alasan })
}

