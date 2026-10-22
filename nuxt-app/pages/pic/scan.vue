<template>
  <div class="wrap">
    <ScreenHeader title="Scan Barcode" :to="kembali" dark />
    <div class="stage">
      <div class="viewfinder">
        <video ref="video" v-show="kameraOn" class="video" autoplay playsinline muted></video>
        <span v-if="!kameraOn" class="ph">{{ kameraError ? 'kamera tidak aktif' : 'membuka kamera…' }}</span>
        <i class="c c--tl"></i><i class="c c--tr"></i><i class="c c--bl"></i><i class="c c--br"></i>
        <i v-if="kameraOn" class="laser"></i>
      </div>

      <p class="hint">
        {{ kameraError || (kameraOn ? 'Arahkan kamera ke QR di layar HP siswa' : 'Arahkan ke QR di HP siswa atau kartu fisik') }}
      </p>

      <div class="simulasi">
        <div class="simulasi__label">SIMULASI SCAN</div>
        <button v-for="s in siswa" :key="s.id" class="kandidat" @click="pilih(s.id)">
          <span class="av">{{ s.inisial }}</span>
          <span class="kandidat__id">
            <b>{{ s.nama }}</b>
            <i>{{ s.kelas }} · saldo {{ s.saldo | rp }}{{ s.saldo >= total ? '' : ' — kurang' }}</i>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>

      <canvas ref="canvas" class="canvas-tersembunyi"></canvas>
    </div>
  </div>
</template>

<script>
import jsQR from 'jsqr'
import { decodeSiswaQr } from '~/components/QrCode.vue'

export default {
  layout: 'phone',
  data() {
    return {
      kameraOn: false,
      kameraError: '',
      stream: null,
      rafId: null
    }
  },
  computed: {
    siswa() { return this.$store.state.siswa },
    total() { return this.$store.getters['pos/total'] },
    kembali() { return this.$store.state.pos.mode === 'tunai' ? '/pic/tunai' : '/pic' }
  },
  mounted() {
    this.mulaiKamera()
  },
  beforeDestroy() {
    this.berhentiKamera()
  },
  methods: {
    async mulaiKamera() {
      this.kameraError = ''
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.kameraError = 'Perangkat/browser ini tidak mendukung kamera. Gunakan simulasi di bawah.'
        return
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        this.$refs.video.srcObject = this.stream
        await this.$refs.video.play()
        this.kameraOn = true
        this.tick()
      } catch (e) {
        this.kameraError = 'Kamera tidak dapat diakses (izin ditolak?). Gunakan simulasi di bawah.'
        this.kameraOn = false
      }
    },
    berhentiKamera() {
      this.kameraOn = false
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null }
      if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null }
    },
    // Loop baca frame kamera dan coba decode QR tiap frame (via jsQR)
    tick() {
      if (!this.kameraOn) return
      const video = this.$refs.video
      const canvas = this.$refs.canvas
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const kode = jsQR(frame.data, frame.width, frame.height)
        if (kode && kode.data) {
          const info = decodeSiswaQr(kode.data)
          const match = info && this.siswa.find((s) => s.nis === info.nis)
          if (match) {
            this.berhentiKamera()
            this.pilih(match.id)
            return
          }
        }
      }
      this.rafId = requestAnimationFrame(this.tick)
    },
    pilih(id) {
      this.berhentiKamera()
      this.$store.commit('pos/setScan', id)
      this.$router.push('/pic/konfirmasi')
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: var(--navy); min-height: 0; }
.stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 0 22px 26px; overflow-y: auto; }

.viewfinder {
  width: 250px; height: 250px; border-radius: var(--r-lg);
  background: rgba(255,255,255,.05); position: relative;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex: none;
}
.video { width: 100%; height: 100%; object-fit: cover; }
.c { position: absolute; width: 44px; height: 44px; border: 0 solid var(--sand); pointer-events: none; }
.c--tl { top: 0; left: 0; border-top-width: 3px; border-left-width: 3px; border-radius: 16px 0 0 0; }
.c--tr { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; border-radius: 0 16px 0 0; }
.c--bl { bottom: 0; left: 0; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 16px; }
.c--br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 16px 0; }
.ph { font: 400 11.5px/1.5 var(--font-body); color: rgba(255,255,255,.35); text-align: center; padding: 0 30px; }
.laser { position: absolute; left: 14px; right: 14px; height: 2px; background: var(--sand); animation: fkPulse 1.4s ease-in-out infinite; }

.hint { margin: 0; font: 400 12.5px var(--font-body); color: rgba(255,255,255,.6); text-align: center; text-wrap: pretty; }
.simulasi { display: flex; flex-direction: column; gap: 9px; width: 100%; }
.simulasi__label { font: 500 11px var(--font-body); color: rgba(255,255,255,.35); letter-spacing: .08em; text-align: center; }
.kandidat {
  border: none; background: rgba(255,255,255,.08); border-radius: var(--r-sm);
  padding: 13px 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; width: 100%;
}
.kandidat:hover { background: rgba(255,255,255,.14); }
.av {
  width: 32px; height: 32px; border-radius: var(--r-pill);
  background: rgba(255,255,255,.14); color: #fff;
  display: flex; align-items: center; justify-content: center; font: 700 12px var(--font-display);
}
.kandidat__id { flex: 1; text-align: left; }
.kandidat__id b { display: block; font: 600 13px var(--font-body); color: #fff; }
.kandidat__id i { display: block; font: 400 11px var(--font-body); color: rgba(255,255,255,.5); font-style: normal; }

.canvas-tersembunyi { display: none; }
</style>
