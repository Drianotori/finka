<script>
import siswaService from '~/services/siswaService'

export default {
  middleware: ['auth', 'admin'],<template>
  <div class="admin-siswa">
    <div class="header">
      <h2>Kelola Data Siswa</h2>
      <button class="btn btn--primary" @click="bukaModalForm()">+ Tambah Siswa</button>
    </div>

    <!-- Tabel Siswa -->
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
      <div v-else class="loading">Memuat data...</div>
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
      if (!confirm('Yakin ingin menghapus siswa ini?')) return
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
  data() {
    return {
      listSiswa: [],
      loading: false,
      error: '',
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
        this.error = err.message || 'Gagal memuat data siswa'
      } finally {
        this.loading = false
      }
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
    async hapus(id) {
      if (!confirm('Yakin ingin menghapus siswa ini?')) return
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
