/**
 * Vuex module untuk akun Orang Tua.
 * State di sini dipakai bersama oleh dashboard, tagihan, riwayat,
 * isi saldo, dan notifikasi.
 */
import { api } from '~/plugins/api'

function inisialDari(nama) {
  return (nama || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export const state = () => ({
  anak: [], // [{ id, nama, kelas, nis, saldo }]
  anakAktifId: null,
  tagihan: {}, // siswaId -> [tagihan...]
  riwayat: {}, // siswaId -> [ledger...]
  memuatAnak: false,
  riwayatPembayaran: [],
  notifikasiStatus: []
})

export const getters = {
  aktif: (s) => s.anak.find((a) => a.id === s.anakAktifId) || s.anak[0] || null,
  tagihanAktif: (s, g) => (g.aktif ? s.tagihan[g.aktif.id] || [] : []),
  tagihanSemua: (s) => {
    const out = []
    Object.keys(s.tagihan).forEach((siswaId) => {
      const anak = s.anak.find((a) => String(a.id) === String(siswaId))
      ;(s.tagihan[siswaId] || []).forEach((t) => out.push(Object.assign({ anakNama: anak ? anak.nama : '' }, t)))
    })
    return out
  },
  belumBayarSemua: (s, g) => g.tagihanSemua.filter((t) => t.status === 'belum_bayar').length,
  notifikasi: (s, g) => {
    const out = []
    const AMBANG_MENIPIS = 20000
    const sekarang = new Date()
    const batas = new Date(sekarang)
    batas.setDate(batas.getDate() + 7)

    s.anak.forEach((anak) => {
      if (Number(anak.saldo) < AMBANG_MENIPIS) {
        out.push({
          tipe: 'saldo',
          judul: 'Saldo anak menipis',
          isi: `${anak.nama} memiliki saldo ${Number(anak.saldo || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}. Pertimbangkan isi saldo sebelum digunakan di kantin.`,
          waktu: 'Sekarang',
          baru: true,
          prioritas: 1,
          anakId: anak.id
        })
      }
    })

    g.tagihanSemua.filter((t) => t.status === 'belum_bayar').forEach((t) => {
      const jatuhTempo = t.jatuh_tempo ? new Date(`${t.jatuh_tempo}T23:59:59`) : null
      let judul = 'Tagihan belum dibayar'
      let isi = `${t.anakNama}: ${t.nama} sebesar ${Number(t.nominal || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}.`
      let prioritas = 3

      if (jatuhTempo && jatuhTempo < sekarang) {
        judul = 'Tagihan sudah jatuh tempo'
        isi += ` Jatuh tempo ${t.jatuh_tempo}.`
        prioritas = 1
      } else if (jatuhTempo && jatuhTempo <= batas) {
        judul = 'Tagihan segera jatuh tempo'
        isi += ` Jatuh tempo ${t.jatuh_tempo}.`
        prioritas = 2
      } else if (t.jatuh_tempo) {
        isi += ` Jatuh tempo ${t.jatuh_tempo}.`
      }

      out.push({ tipe: 'tagihan', judul, isi, waktu: t.jatuh_tempo ? `Jatuh tempo ${t.jatuh_tempo}` : 'Belum dibayar', baru: true, prioritas, anakId: t.siswa_id, tagihanId: t.id })
    })

    return out.sort((a, b) => a.prioritas - b.prioritas)
  },
  jumlahNotifikasi: (s, g) => g.notifikasi.length + s.notifikasiStatus.length,
  semuaNotifikasi: (s, g) => g.notifikasi.concat(s.notifikasiStatus),
  riwayatAktif: (s, g) => (g.aktif ? s.riwayat[g.aktif.id] || [] : [])
}

export const mutations = {
  setAnak(s, list) {
    s.anak = list.map((a) => Object.assign({ inisial: inisialDari(a.nama) }, a))
    if (!s.anakAktifId && list.length) s.anakAktifId = list[0].id
  },
  setAnakAktif(s, id) { s.anakAktifId = id },
  setTagihan(s, { siswaId, list }) { s.tagihan = Object.assign({}, s.tagihan, { [siswaId]: list }) },
  setRiwayat(s, { siswaId, list }) { s.riwayat = Object.assign({}, s.riwayat, { [siswaId]: list }) },
  setSaldo(s, { siswaId, saldo }) {
    const a = s.anak.find((x) => x.id === siswaId)
    if (a) a.saldo = saldo
  },
  setMemuatAnak(s, v) { s.memuatAnak = v },
  setRiwayatPembayaran(s, list) { s.riwayatPembayaran = list },
  setNotifikasiStatus(s, list) { s.notifikasiStatus = list }
}

export const actions = {
  async muatAnak({ commit, state }) {
    commit('setMemuatAnak', true)
    try {
      const { anak } = await api.anakAnak()
      commit('setAnak', anak)
    } finally {
      commit('setMemuatAnak', false)
    }
  },
  async muatTagihan({ commit }, siswaId) {
    const { tagihan } = await api.tagihan(siswaId)
    commit('setTagihan', { siswaId, list: tagihan })
  },
  async muatRiwayat({ commit }, siswaId) {
    const { riwayat } = await api.riwayat(siswaId)
    commit('setRiwayat', { siswaId, list: riwayat })
  },
  async muatPembayaran({ commit }) {
    const { riwayat } = await api.riwayatPembayaran()
    commit('setRiwayatPembayaran', riwayat || [])
    const { notifikasi } = await api.notifikasiOrtu()
    commit('setNotifikasiStatus', notifikasi || [])
  },
  async refreshSaldo({ commit }, siswaId) {
    const { saldo } = await api.saldo(siswaId)
    commit('setSaldo', { siswaId, saldo })
  }
}

