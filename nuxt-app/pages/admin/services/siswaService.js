import { api } from '~/plugins/api'

export default {
  // Ambil daftar siswa
  getSiswa(params) {
    return api.get('/admin/siswa', { params })
  },
  // Ambil detail siswa berdasarkan ID
  getDetail(id) {
    return api.get(`/admin/siswa/${id}`)
  },
  // Tambah siswa baru
  tambah(data) {
    return api.post('/admin/siswa', data)
  },
  // Update data siswa
  update(id, data) {
    return api.put(`/admin/siswa/${id}`, data)
  },
  // Hapus data siswa
  hapus(id) {
    return api.delete(`/admin/siswa/${id}`)
  },
  // Topup saldo siswa dari admin
  topup(id, payload) {
    return api.post(`/admin/siswa/${id}/topup`, payload)
  },
  // Reset PIN siswa
  resetPin(id) {
    return api.post(`/admin/siswa/${id}/reset-pin`)
  }
}
