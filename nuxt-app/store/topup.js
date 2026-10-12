/**
 * Vuex module transaksi top-up/pembayaran.
 * Status transaksi berasal dari backend; store tidak boleh menganggap
 * pembayaran berhasil sebelum server mengembalikan status disetujui.
 */
import { api } from '~/plugins/api'

// Alur top-up sekarang benar-benar bicara ke server: kode unik & id
// permintaan datang dari respons API (server.js -> topup.js), bukan
// diacak di browser seperti versi prototipe.
export const state = () => ({
  anakAktifId: null,
  tagihanId: null, // diisi kalau ini transfer utk bayar tagihan tertentu
  nominal: 1000000,
  id: null,
  kodeUnik: null,
  status: 'idle', // idle -> menunggu -> disetujui/ditolak
  dibuatPada: null,
  diprosesPada: null,
  alasan: '',
  mengirim: false,
  error: ''
})

export const getters = {
  transfer: (s) => s.nominal + (s.kodeUnik || 0),
  kodeStr: (s) => String(s.kodeUnik || 0).padStart(3, '0')
}

export const mutations = {
  setAnak(s, id) { s.anakAktifId = id },
  setNominal(s, n) { s.nominal = Number(n) || 0 },
  setTagihan(s, id) { s.tagihanId = id },
  setHasil(s, { id, kodeUnik, status }) { s.id = id; s.kodeUnik = kodeUnik; s.status = status },
  setId(s, id) { s.id = Number(id) || null },
  setDariServer(s, t) {
    s.id = t.id || s.id
    s.anakAktifId = t.siswa_id || s.anakAktifId
    s.nominal = Number(t.nominal || s.nominal)
    s.kodeUnik = Number(t.kode_unik || t.kode || s.kodeUnik || 0)
    s.tagihanId = t.tagihan_id || null
    s.status = t.status
    s.alasan = t.alasan_tolak || ''
    s.dibuatPada = t.waktu || null
    s.diprosesPada = t.diproses_at || null
  },
  setMengirim(s, v) { s.mengirim = v },
  setError(s, v) { s.error = v },
  reset(s) { s.tagihanId = null; s.id = null; s.kodeUnik = null; s.status = 'idle'; s.alasan = ''; s.error = '' }
}

export const actions = {
  async ajukan({ state, commit }) {
    commit('setMengirim', true)
    commit('setError', '')
    try {
      const hasil = await api.ajukanTopup(state.anakAktifId, state.nominal, state.tagihanId)
      commit('setHasil', { id: hasil.id, kodeUnik: hasil.kode_unik, status: hasil.status })
      return hasil
    } catch (e) {
      commit('setError', e.message)
      throw e
    } finally {
      commit('setMengirim', false)
    }
  },
  async refreshStatus({ state, commit }, id) {
    const requestId = Number(id || state.id)
    if (!requestId) return null
    const { topup } = await api.statusTopup(requestId)
    commit('setDariServer', topup)
    return topup
  }
}

