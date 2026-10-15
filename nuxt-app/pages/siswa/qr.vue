<template>
  <div class="wrap">
    <ScreenHeader title="QR Saya" to="/siswa" dark />
    <div class="stage">
      <div class="kartu">
        <div class="kartu__who">
          <div class="av">{{ siswa.inisial }}</div>
          <div>
            <div class="nama display">{{ siswa.nama }}</div>
            <div class="sub">{{ siswa.kelas }} · Saldo {{ saldo | rp }}</div>
          </div>
        </div>
        <div class="qr"><canvas ref="qr"></canvas></div>
        <div class="garis"></div>
        <div class="timer">
          <i></i><span class="num">Kode berganti dalam {{ detik }} detik</span>
        </div>
      </div>
      <div class="pinnote">🔒 <span>Setelah scan, kantin tetap meminta PIN 6 digit kamu</span></div>
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcode'
import { api } from '~/plugins/api'

export default {
  layout: 'phone',
  middleware: ['auth', 'siswa'],
  data() {
    return {
      detik: 0,
      timer: null,
      token: null,
      error: '',
      memuat: false,
      errorCount: 0 // Counter untuk menghentikan polling jika terjadi error berulang
    }
  },
  computed: {
    siswa() { return this.$store.state.siswa.profil || { inisial: '', nama: '', kelas: '' } },
    saldo() { return this.$store.state.siswa.saldo }
  },
  async mounted() {
    await this.$store.dispatch('siswa/muat')
    await this.refreshQr()
    this.startTimer()
  },
  beforeDestroy() {
    this.stopTimer()
  },
  methods: {
    startTimer() {
      this.stopTimer()
      this.timer = setInterval(() => {
        if (this.detik <= 1) {
          this.refreshQr()
        } else {
          this.detik--
        }
      }, 1000)
    },
    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    async refreshQr() {
      if (this.memuat) return
      this.memuat = true
      this.error = ''

      try {
        const data = await api.qrSiswa()
        this.token = data.token
        this.detik = data.expires_in
        this.errorCount = 0 // Reset hitungan error jika request berhasil

        if (this.$refs.qr) {
          await QRCode.toCanvas(this.$refs.qr, data.token, {
            width: 224,
            margin: 1,
            errorCorrectionLevel: 'M'
          })
        }
      } catch (e) {
        this.errorCount++
        this.error = e.message || 'QR gagal dimuat'

        // Hentikan interval timer jika mengalami error berulang (maksimal 3 kali berturut-turut)
        if (this.errorCount >= 3) {
          this.stopTimer()
          this.error = (e.message || 'QR gagal dimuat') + '. Polling dihentikan.'
        }
      } finally {
        this.memuat = false
      }
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 0 22px 30px; }
.kartu { background: #fff; border-radius: var(--r-lg); padding: 22px; display: flex; flex-direction: column; align-items: center; gap: 16px; width: 294px; }
.kartu__who { display: flex; align-items: center; gap: 10px; align-self: stretch; }
.av {
  width: 38px; height: 38px; border-radius: var(--r-pill);
  background: var(--blue-soft); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font: 700 13px var(--font-display);
}
.nama { font: 700 14px var(--font-display); }
.sub { font: 400 11.5px var(--font-body); color: var(--muted); }
.qr { width: 230px; height: 230px; display: flex; align-items: center; justify-content: center; }
.garis { align-self: stretch; height: 1px; background: var(--line); }
.timer { display: flex; align-items: center; gap: 9px; font: 500 12px var(--font-body); color: var(--muted); }
.timer i { width: 7px; height: 7px; border-radius: var(--r-pill); background: var(--green); animation: fkPulse 1.6s ease-in-out infinite; }
.pinnote {
  display: flex; align-items: center; gap: 99px;
  background: rgba(255,255,255,.08); border-radius: var(--r-pill); padding: 9px 16px;
  font: 400 12px var(--font-body); color: rgba(255,255,255,.7);
}
.error { color: var(--coral, #ff6b6b); font: 500 12px var(--font-body); text-align: center; }
</style>
