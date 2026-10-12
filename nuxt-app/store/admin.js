import { api } from '~/plugins/api'

export const state = () => ({
  peran: 'admin',
  pilihId: null,
  alasan: '',
  outlet: 0,
  memuatAntrean: false,
  antrean: []
})

export const getters = {
  admin: (s, getters, rootState) => !!(rootState.auth.user && rootState.auth.user.role === 'admin'),
  status: (s) => (id) => {
    const item = s.antrean.find((a) => a.id === id)
    if (!item) return 'Menunggu Verifikasi'
    if (item.status === 'disetujui') return 'Disetujui'
    if (item.status === 'ditolak') return 'Ditolak'
    return 'Menunggu Verifikasi'
  },
  menunggu: (s, g) => s.antrean.filter((a) => g.status(a.id) === 'Menunggu Verifikasi'),
  pilih: (s) => s.antrean.find((a) => a.id === s.pilihId) || s.antrean[0]
}

export const mutations = {
  setPeran(s, v) { s.peran = v; s.alasan = '' },
  setPilih(s, id) { s.pilihId = id; s.alasan = '' },
  setAlasan(s, v) { s.alasan = v },
  setAntrean(s, list) { s.antrean = list },
  setMemuatAntrean(s, v) { s.memuatAntrean = v },
  setOutlet(s, i) { s.outlet = Number(i) }
}

export const actions = {
  async muatAntrean({ commit, state }) {
    commit('setMemuatAntrean', true)
    try {
      const { topup } = await api.antreanTopup()
      commit('setAntrean', topup)
      if (!state.pilihId && topup.length) commit('setPilih', topup[0].id)
      return topup
    } finally { commit('setMemuatAntrean', false) }
  },
  async setujuiAsli({ dispatch }, id) { await api.approveTopup(id); return dispatch('muatAntrean') },
  async tolakAsli({ dispatch, commit }, { id, alasan }) { await api.tolakTopup(id, alasan); commit('setAlasan',''); return dispatch('muatAntrean') },
  async terimaKembali({ dispatch }, id) { await api.terimaKembaliTopup(id); return dispatch('muatAntrean') }
}

