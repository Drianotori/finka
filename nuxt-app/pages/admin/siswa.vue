import { api } from '~/plugins/api'

export default {
  // Mengambil daftar siswa dengan parameter filter/pencarian
  getSiswa(params) {
    return api.get('/admin/siswa', { params })
  },
  // Detail data siswa berdasarkan ID<template>
  <div class="admin-siswa">
    <div class="header">
      <h2>Kelola Data Siswa</h2>
      <button class="btn btn--primary" @click="bukaModalForm()">+ Tambah Siswa</button>
    </div>

    <div class="card">
      <table v-if="!loading" class="table">
        <thead>
          <tr>
            <th>NIS</th>
            <th>Nama</th>
            <th>Kelas</th>
            <th>Saldo</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in listSiswa" :key="item.id">
            <td>{{ item.nis }}</td>
            <td>{{ item.nama }}</td>
            <td>{{ item.kelas }}</td>
            <td>{{ item.saldo | rp }}</td>
            <td class="aksi">
              <button class="btn-icon" @click="bukaModalForm(item)">✏️</button>
              <button class="btn-icon" @click="hapusSiswa(item.id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="loading">Memuat data siswa...</div>
    </div>
  </div>
</template>

<script>
import siswaService from '~/services/siswaService'

export default {
  middleware: ['auth', 'admin'],
  data() {
    return {
      listSiswa: [],
      loading: false,
      modalForm: false,
      form: { id: null, nama: '', nis: '', kelas: '', saldo: 0 }
    }
  },
  mounted() {
    this.muatSiswa()
  },
  methods: {
    async muatSiswa() {
      this.loading = true
      try {
        const res = await siswaService.getSiswa()
        this.listSiswa = res.data || res
      } catch (err) {
        alert(err.message || 'Gagal memuat data siswa')
      } finally {
        this.loading = false
      }
    },
    bukaModalForm(item = null) {
      this.form = item ? { ...item } : { id: null, nama: '', nis: '', kelas: '', saldo: 0 }
      this.modalForm = true
    },
    async simpan() {
      try {
        if (this.form.id) {
          await siswaService.update(this.form.id, this.form)
        } else {
          await siswaService.tambah(this.form)
        }
        this.modalForm = false
        await this.muatSiswa()
      } catch (err) {
        alert(err.message || 'Gagal menyimpan data')
      }
    },
    async hapusSiswa(id) {
      if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return
      try {
        await siswaService.hapus(id)
        await this.muatSiswa()
      } catch (err) {
        alert(err.message || 'Gagal menghapus siswa')
      }
    }
  }
}
</script>
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
