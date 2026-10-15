<template>
  <div class="wrap">
    <ScreenHeader title="PIN Siswa" to="/pic/konfirmasi" dark />
    <div class="intro">
      <div class="intro__who display">{{ nama }} · {{ total | rp }}</div>
      <p>Serahkan perangkat ke siswa. Masukkan 6 digit PIN.</p>
    </div>

    <div class="dots">
      <span v-for="i in 6" :key="i" class="dot" :class="i <= pin.length ? 'dot--on' : ''"></span>
    </div>
    
    <div v-if="pesan" class="salah">{{ pesan }}</div>
    <div v-else-if="pinGagal > 0" class="salah">
      PIN salah. Sisa percobaan {{ Math.max(0, 3 - pinGagal) }}.
    </div>

    <div class="spacer"></div>
    <div class="pad">
      <NumPad :keys="keypad" :disabled="isSubmitting" @key="tekan" @hapus="hapus" />
    </div>
    <div class="acak">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2">
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 118 0v3" />
      </svg>
      <span>{{ isSubmitting ? 'Memproses transaksi...' : 'Posisi angka diacak setiap transaksi' }}</span>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'phone',
  middleware: ['auth', 'pic'],
  data() {
    return {
      pesan: '',
      isSubmitting: false
    }
  },
  computed: {
    pin() { return this.$store.state.pos.pin },
    pinGagal() { return this.$store.state.pos.pinGagal },
    keypad() { return this.$store.state.pos.keypad },
    total() { return this.$store.getters['pos/total'] },
    nama() {
      const s = this.$store.getters['pos/siswaScan']
      return s ? s.nama : ''
    }
  },
  mounted() {
    if (!this.$store.getters['pos/siswaScan']) this.$router.replace('/pic')
  },
  methods: {
    tekan(d) {
      if (this.isSubmitting) return

      const pin = (this.pin + d).slice(0, 6)
      this.$store.commit('pos/setPin', pin)
      if (pin.length < 6) return

      this.isSubmitting = true
      this.pesan = ''

      setTimeout(async () => {
        try {
          await this.$store.dispatch('pos/selesaikanWithPin', pin)
          this.$store.commit('pos/setPin', '')
          this.$router.push('/pic/sukses')
        } catch (e) {
          this.$store.commit('pos/setPin', '')
          this.$store.commit('pos/gagalPin')
          this.$store.commit('pos/acakKeypad')

          if (this.pinGagal >= 3) {
            this.pesan = 'PIN terblokir, terlalu banyak percobaan salah.'
          } else {
            this.pesan = (e && e.message) || 'PIN salah'
          }
        } finally {
          this.isSubmitting = false
        }
      }, 260)
    },
    hapus() {
      if (this.isSubmitting) return
      this.$store.commit('pos/setPin', this.pin.slice(0, -1))
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: var(--navy); padding-bottom: 26px; min-height: 0; }
.intro { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 6px; padding: 0 22px; }
.intro__who { font: 600 14px var(--font-display); color: #fff; }
.intro p { margin: 0; font: 400 12.5px var(--font-body); color: rgba(255,255,255,.55); text-align: center; max-width: 250px; text-wrap: pretty; }

.dots { display: flex; justify-content: center; gap: 12px; margin-top: 26px; }
.dot { width: 14px; height: 14px; border-radius: var(--r-pill); border: 1.5px solid rgba(255,255,255,.35); }
.dot--on { background: #fff; border-color: #fff; }
.salah { margin-top: 16px; text-align: center; font: 600 12.5px var(--font-body); color: var(--coral); }

.spacer { flex: 1; }
.pad { padding: 0 22px; }
.acak { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; font: 400 11px var(--font-body); color: rgba(255,255,255,.4); }
</style>
