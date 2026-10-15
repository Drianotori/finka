import { api } from '~/plugins/api'

export default {
  // Mengambil daftar siswa dengan parameter filter/pencarian
  getSiswa(params) {
    return api.get('/admin/siswa', { params })
  },
  // Detail data siswa berdasarkan ID
  getDetail(id) {
    return api.get(`/admin/siswa/${id}`)
  },
  // Tambah siswa baru
  tambah(data) {
    return api.post('/admin/siswa', data)
  },
  // Perbarui data siswa
  update(id, data) {
    return api.put(`/admin/siswa/${id}`, data)
  },
  // Hapus data siswa
  hapus(id) {
    return api.delete(`/admin/siswa/${id}`)
  },
  // Topup saldo dari panel admin
  topup(id, payload) {
    return api.post(`/admin/siswa/${id}/topup`, payload)
  }
}
