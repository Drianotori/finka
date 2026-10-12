import { api } from '~/plugins/api'

export const state = () => ({
  outlet: 0,
  mode: 'belanja',
  cart: {},
  tunai: 0,
  kasSesi: null, // sisa kas tunai di laci hari ini (dari server); null = kas awal belum diisi
  kasAwal: null,
  scanId: null,
  qrToken: null,
  pin: '',
  pinGagal: 0,
  lastLedgerId: null,
  keypad: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
})

export const getters = {
  totalBelanja: (s, g, root) =>
    Object.keys(s.cart).reduce((a, id) => {
      const p = root.produk.find((x) => String(x.id) === String(id))
      return a + (p ? p.harga * s.cart[id] : 0)
    }, 0),
  total: (s, g) => (s.mode === 'tunai' ? s.tunai : g.totalBelanja),
  jumlahItem: (s) => Object.keys(s.cart).reduce((a, k) => a + s.cart[k], 0),
  items: (s, g, root) =>
    s.mode === 'tunai'
      ? [{ label: 'Ambil tunai di kasir', harga: s.tunai }]
      : Object.keys(s.cart).map((id) => {
          const p = root.produk.find((x) => String(x.id) === String(id))
          return { label: p.nama + ' ×' + s.cart[id], harga: p.harga * s.cart[id] }
        }),
  siswaScan: (s, g, root) => (s.scanId === null ? null : root.siswaList.find((x) => Number(x.id) === Number(s.scanId)) || null),
  cukup: (s, g) => (g.siswaScan ? g.siswaScan.saldo >= g.total : false)
}

export const mutations = {
  setOutlet(s, i) { s.outlet = Number(i) },
  setMode(s, m) { s.mode = m },
  tambah(s, id) { s.cart = Object.assign({}, s.cart, { [id]: (s.cart[id] || 0) + 1 }) },
  kurangi(s, id) {
    const qty = Number(s.cart[id] || 0) - 1
    const next = Object.assign({}, s.cart)
    if (qty <= 0) delete next[id]
    else next[id] = qty
    s.cart = next
  },
  hapusItem(s, id) { const next = Object.assign({}, s.cart); delete next[id]; s.cart = next },
  kosongkan(s) { s.cart = {} },
  setTunai(s, n) { s.tunai = Math.max(0, Math.min(Number(n) || 0, 9999999)) },
  setScan(s, i) { s.scanId = i === null ? null : Number(i) },
  setQrToken(s, token) { s.qrToken = token || null },
  setPin(s, v) { s.pin = v },
  setLastLedgerId(s, id) { s.lastLedgerId = id },
  gagalPin(s) { s.pinGagal += 1 },
  acakKeypad(s) {
    const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = a[i]; a[i] = a[j]; a[j] = t
    }
    s.keypad = a
  },
  setKas(s, k) { s.kasSesi = k.sisa; s.kasAwal = k.kas_awal },
  reset(s) {
    s.cart = {}
    s.mode = 'belanja'
    s.tunai = 0
    s.scanId = null
    s.qrToken = null
    s.pin = ''
    s.pinGagal = 0
    s.lastLedgerId = null
  }
}

export const actions = {
  async muatKas({ commit }) {
    const k = await api.kas()
    commit('setKas', k)
    return k
  },
  async selesaikan({ state, getters, rootGetters, commit, dispatch }) {
    if (state.scanId === null) throw new Error('Siswa belum dipilih')
    const siswa = rootGetters['siswaById'](state.scanId)
    if (!siswa) throw new Error('Data siswa tidak ditemukan')

    let hasil
    if (state.mode === 'tunai') {
      hasil = await api.tarikTunai(siswa.id, state.pin, state.tunai, state.qrToken)
      await dispatch('muatKas').catch(() => {})
    } else {
      const items = Object.keys(state.cart).map((id) => ({ produk_id: Number(id), qty: state.cart[id] }))
      hasil = await api.transaksi(siswa.id, state.pin, items, state.qrToken)
    }

    // Refresh saldo lokal dari nilai yang dikembalikan server supaya layar
    // berikutnya tidak menampilkan saldo lama.
    commit('setServerSaldo', { siswaId: siswa.id, saldo: hasil.saldo_baru }, { root: true })
    commit('setLastLedgerId', hasil.ledger_id || null)
    return hasil
  }
}

