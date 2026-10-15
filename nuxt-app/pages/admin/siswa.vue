<script>
import siswaService from '~/services/siswaService'

export default {
  middleware: ['auth', 'admin'],
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
