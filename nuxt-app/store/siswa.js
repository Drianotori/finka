import { api } from '~/plugins/api'
import { trxDariLedger } from '~/utils/adapt'

export const state = () => ({
  profil: null,
  saldo: 0,
  riwayat: [],
  memuat: false
})

export const getters = {
  siswa: (s) => s.profil,
  transaksi: (s) => s.riwayat.map(trxDariLedger),
  hariIni: (s, g) => {
    const list = g.transaksi
    if (!list.length) return []
    return list.slice(0, 3)
  }
}

export const mutations = {
  setProfil(s, p) { s.profil = p },
  setSaldo(s, n) { s.saldo = Number(n) || 0 },
  setRiwayat(s, rows) { s.riwayat = rows || [] },
  setMemuat(s, v) { s.memuat = v }
}

export const actions = {
  async muat({ commit, rootState }) {
    const user = rootState.auth.user
    if (!user || user.role !== 'siswa') return null
    commit('setMemuat', true)
    try {
      const [{ siswa }, { saldo }, { riwayat }] = await Promise.all([
        api.profilSiswa(user.id),
        api.saldo(user.id),
        api.riwayat(user.id)
      ])
      commit('setProfil', siswa)
      commit('setSaldo', saldo)
      commit('setRiwayat', riwayat)
      return siswa
    } finally {
      commit('setMemuat', false)
    }
  },
  async refresh({ dispatch }) { return dispatch('muat') }
}

