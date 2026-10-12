import { api, setToken } from '~/plugins/api'

const TOKEN_KEY = 'finka_token_v2'

function storage() { return typeof window !== 'undefined' ? window.sessionStorage : null }

export const state = () => ({
  token: null,
  user: null,
  siap: false // sudah selesai cek localStorage saat load pertama?
})

export const getters = {
  sudahLogin: (s) => !!s.token,
  peran: (s) => (s.user ? s.user.role : null)
}

export const mutations = {
  setAuth(s, { token, user }) { s.token = token; s.user = user },
  setSiap(s, v) { s.siap = v }
}

export const actions = {
  async login({ commit }, { username, password }) {
    const data = await api.login(username, password)
    setToken(data.token)
    const st = storage(); if (st) st.setItem(TOKEN_KEY, data.token)
    commit('setAuth', { token: data.token, user: data.user })
    return data.user
  },

  logout({ commit }) {
    setToken(null)
    const st = storage(); if (st) st.removeItem(TOKEN_KEY)
    commit('setAuth', { token: null, user: null })
  },

  // Dipanggil sekali saat app dimuat di browser: pulihkan sesi dari token
  // tersimpan supaya refresh halaman tidak selalu balik ke /login.
  async rehydrate({ commit }) {
    if (typeof window === 'undefined') return
    const st = storage()
    const token = st ? st.getItem(TOKEN_KEY) : null
    if (!token) { commit('setSiap', true); return }
    setToken(token)
    try {
      const { user } = await api.me()
      commit('setAuth', { token, user })
    } catch (e) {
      st.removeItem(TOKEN_KEY)
    }
    commit('setSiap', true)
  }
}

