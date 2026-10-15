<template>
  <div class="wrap">
    <ScreenHeader title="Pengaturan" to="/siswa" dark />
    <div class="sheet">
      <div class="card profil">
        <div class="av">{{ siswa.inisial || '-' }}</div>
        <div class="profil__id">
          <div class="nama">{{ siswa.nama || 'Siswa' }}</div>
          <div class="sub">{{ siswa.kelas || '-' }} · NIS {{ siswa.nis || '-' }}</div>
        </div>
      </div>

      <div class="grup">
        <div class="grup__label">Notifikasi</div>
        <div class="card baris">
          <div>
            <div class="baris__judul">Notifikasi transaksi</div>
            <div class="baris__ket">Kirim notifikasi tiap kali saldo terpakai</div>
          </div>
          <ToggleSwitch v-model="notifTrx" />
        </div>
        <div class="card baris">
          <div>
            <div class="baris__judul">Getar saat bayar</div>
            <div class="baris__ket">Getar HP saat QR berhasil dipindai kasir</div>
          </div>
          <ToggleSwitch v-model="getar" />
        </div>
      </div>

      <div class="grup">
        <div class="grup__label">Keamanan</div>
        <button class="card baris baris--tombol" @click="pinOn = !pinOn">
          <div>
            <div class="baris__judul">Ubah PIN pembayaran</div>
            <div class="baris__ket">Verifikasi lewat orang tua terlebih dulu</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <div v-if="pinOn" class="card ubah">
          <template v-if="!pinSelesai">
            <div class="baris__ket">Masukkan 6 digit PIN baru. Perubahan akan diminta konfirmasi orang tua sebelum aktif.</div>
            <input v-model="pinBaru" class="pin-input num" maxlength="6" inputmode="numeric" placeholder="• • • • • •" :disabled="isSubmitting" />
            <div v-if="pesanError" class="pesan-error">{{ pesanError }}</div>
            <div class="ubah__aksi">
              <button class="btn-sm btn-sm--ghost" :disabled="isSubmitting" @click="batalPin">Batal</button>
              <button class="btn-sm btn-sm--primary" :disabled="pinBaru.length !== 6 || isSubmitting" @click="simpanPin">
                {{ isSubmitting ? 'Memproses...' : 'Simpan' }}
              </button>
            </div>
          </template>
          <div v-else class="ubah__ok">Permintaan terkirim. Menunggu konfirmasi orang tua lewat notifikasi.</div>
        </div>
      </div>

      <div class="grup">
        <div class="grup__label">Lainnya</div>
        <div class="card baris">
          <div>
            <div class="baris__judul">Tentang Finka</div>
            <div class="baris__ket">Versi 1.0.0</div>
          </div>
        </div>
        <button class="card baris baris--tombol" @click="keluar">
          <div class="baris__judul baris__judul--bahaya">Keluar</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'phone',
  middleware: ['auth', 'siswa'], // Role guard pengaman halaman
  data() {
    return {
      notifTrx: true,
      getar: true,
      pinOn: false,
      pinBaru: '',
      pinSelesai: false,
      isSubmitting: false,
      pesanError: ''
    }
  },
  computed: {
    siswa() {
      const storeSiswa = this.$store.state.siswa
      if (Array.isArray(storeSiswa) && storeSiswa.length > 0) return storeSiswa[0]
      return storeSiswa.profil || { inisial: '', nama: '', kelas: '', nis: '' }
    }
  },
  async mounted() {
    if (!this.$store.state.siswa.profil && (!Array.isArray(this.$store.state.siswa) || this.$store.state.siswa.length === 0)) {
      try {
        await this.$store.dispatch('siswa/muat')
      } catch (err) {
        console.error('Gagal memuat profil siswa:', err)
      }
    }
  },
  methods: {
    batalPin() {
      this.pinOn = false
      this.pinBaru = ''
      this.pesanError = ''
    },
    async simpanPin() {
      if (this.pinBaru.length !== 6 || this.isSubmitting) return
      this.isSubmitting = true
      this.pesanError = ''

      try {
        if (this.$axios) {
          await this.$axios.$post('/api/siswa/pin', { pinBaru: this.pinBaru })
        }
        this.pinSelesai = true
        setTimeout(() => {
          this.pinOn = false
          this.pinSelesai = false
          this.pinBaru = ''
        }, 2200)
      } catch (e) {
        this.pesanError = (e.response && e.response.data && e.response.data.message) || e.message || 'Gagal menyimpan PIN'
      } finally {
        this.isSubmitting = false
      }
    },
    async keluar() {
      if (confirm('Apakah Anda yakin ingin keluar?')) {
        try {
          await this.$store.dispatch('auth/logout')
        } catch (e) {
          // Fallback hapus token manual
          if (process.client) localStorage.removeItem('token')
        }
        this.$router.push('/login')
      }
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; overflow-y: auto; min-height: 0; }
.sheet { flex: 1; background: #fff; border-radius: 24px 24px 0 0; padding: 20px; display: flex; flex-direction: column; gap: 20px; }

.profil { padding: 16px; display: flex; align-items: center; gap: 13px; }
.av {
  width: 40px; height: 40px; border-radius: var(--r-pill); flex: none;
  background: var(--blue-soft); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font: 700 14px var(--font-display);
}
.profil__id .nama { font: 700 14px var(--font-display); }
.profil__id .sub { font: 400 12px var(--font-body); color: var(--muted); margin-top: 2px; }

.grup { display: flex; flex-direction: column; gap: 10px; }
.grup__label { font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .04em; padding: 0 2px; }

.baris { padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.baris--tombol { width: 100%; text-align: left; cursor: pointer; font-family: inherit; }
.baris__judul { font: 600 13px var(--font-body); }
.baris__judul--bahaya { color: var(--coral); }
.baris__ket { font: 400 11.5px var(--font-body); color: var(--muted); margin-top: 2px; max-width: 230px; text-wrap: pretty; }

.ubah { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.pin-input {
  width: 100%; border: 1px solid var(--line); border-radius: var(--r-sm);
  padding: 12px; font: 700 20px var(--font-display); letter-spacing: .3em; text-align: center;
}
.pin-input:focus { outline: none; border-color: var(--blue); }
.ubah__aksi { display: flex; gap: 10px; }
.ubah__ok { font: 500 12.5px/1.5 var(--font-body); color: var(--green); text-wrap: pretty; }

.pesan-error { font: 500 12px var(--font-body); color: var(--coral); background: #fef2f2; padding: 8px 12px; border-radius: 6px; }

.btn-sm { flex: 1; border: none; border-radius: var(--r-sm); font: 700 13px var(--font-display); padding: 12px; cursor: pointer; }
.btn-sm--primary { background: var(--blue); color: #fff; }
.btn-sm--primary:disabled { background: var(--disabled); cursor: not-allowed; }
.btn-sm--ghost { background: #fff; border: 1px solid var(--line); color: var(--muted); font: 600 13px var(--font-body); }
</style>
