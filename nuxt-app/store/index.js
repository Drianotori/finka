import { api } from '~/plugins/api'

export const state = () => ({
  // Data uang/siswa/produk sekarang berasal dari backend. Tidak ada lagi
  // saldo atau transaksi hardcoded di store ini.
  siswaList: [],
  produk: [],
  ambangMenipis: 20000,
  limitOn: false,
  limit: 25000,
  limitPakai: 0,
  blokir: false,
  infoPembayaran: null // { rekening:{bank,nomor,atas_nama}, nama_yayasan, alamat }
})

export const getters = {
  siswaById: (s) => (id) => s.siswaList.find((x) => Number(x.id) === Number(id)) || null,
  produkById: (s) => (id) => s.produk.find((x) => String(x.id) === String(id)) || null,
  produkOutlet: (s) => (o) => s.produk.filter((p) => String(p.outlet) === String(o) || Number(p.outlet) === Number(o)),
  limitSisa: (s) => Math.max(0, s.limit - s.limitPakai)
}

export const mutations = {
  setSiswa(s, list) { s.siswaList = list },
  setProduk(s, list) { s.produk = list },
  setLimitOn(s, v) { s.limitOn = v },
  setLimit(s, v) { s.limit = v },
  setBlokir(s, v) { s.blokir = v },
  setInfoPembayaran(s, v) { s.infoPembayaran = v },
  setLimitPakai(s, v) { s.limitPakai = Number(v) || 0 },
  setServerSaldo(s, { siswaId, saldo }) {
    const siswa = s.siswaList.find((x) => Number(x.id) === Number(siswaId))
    if (siswa) siswa.saldo = Number(saldo) || 0
  }
}

export const actions = {
  async muatSiswa({ commit }) {
    const { siswa } = await api.daftarSiswa()
    commit('setSiswa', siswa)
    return siswa
  },
  async muatInfoPembayaran({ commit, state }) {
    if (state.infoPembayaran) return state.infoPembayaran
    const info = await api.infoPembayaran()
    commit('setInfoPembayaran', info)
    return info
  },
  // Kontrol orang tua (limit harian & blokir kartu) disimpan di server.
  async muatKontrol({ commit }, siswaId) {
    const k = await api.kontrolAnak(siswaId)
    commit('setLimitOn', k.limit_aktif); commit('setLimit', k.limit)
    commit('setBlokir', k.kartu_diblokir); commit('setLimitPakai', k.terpakai_hari_ini)
    return k
  },
  async simpanKontrol({ commit }, { siswaId, payload }) {
    const k = await api.simpanKontrol(siswaId, payload)
    commit('setLimitOn', k.limit_aktif); commit('setLimit', k.limit)
    commit('setBlokir', k.kartu_diblokir); commit('setLimitPakai', k.terpakai_hari_ini)
    return k
  },
  async muatProduk({ commit }) {
    const { produk } = await api.produk()
    commit('setProduk', produk)
    return produk
  },
  async tambahProduk({ dispatch }, payload) {
    const data = await api.tambahProduk(payload.nama, payload.harga, payload.outlet)
    await dispatch('muatProduk')
    return data
  },
  async ubahProduk({ dispatch }, p) {
    const data = await api.ubahProduk(p.id, p.nama, p.harga)
    await dispatch('muatProduk')
    return data
  },
  async hapusProduk({ dispatch }, id) {
    const data = await api.hapusProduk(id)
    await dispatch('muatProduk')
    return data
  },
  async muatData({ dispatch }) {
    await Promise.all([dispatch('muatSiswa'), dispatch('muatProduk')])
  }
}

