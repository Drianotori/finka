<template>
  <div class="wrap">
    <ScreenHeader title="Scan Barcode" :to="kembali" dark />
    <div class="stage">
      <div class="viewfinder">
        <i class="c c--tl"></i><i class="c c--tr"></i><i class="c c--bl"></i><i class="c c--br"></i>
        <video ref="video" class="kamera" autoplay muted playsinline></video><canvas ref="canvas" class="hidden-canvas"></canvas><span v-if="!kameraAktif" class="ph">Kamera belum aktif<br />gunakan tombol di bawah</span>
        <i class="laser"></i>
      </div>
      <p class="hint">Arahkan kamera ke QR dinamis siswa. QR berlaku singkat dan setelah scan tetap wajib PIN.</p><button class="kamera-btn" @click="mulaiKamera">{{ kameraAktif ? "Kamera aktif" : "Buka kamera" }}</button><div v-if="error" class="error">{{ error }}</div>

    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'

export default {
  layout: 'phone', middleware: ['auth', 'pic'],
  data() { return { kameraAktif: false, stream: null, frame: null, error: '' } },
  async mounted() { await this.$store.dispatch('muatSiswa') },
  beforeDestroy() { this.stopKamera() },
  computed: {
    total() { return this.$store.getters['pos/total'] },
    kembali() { return this.$store.state.pos.mode === 'tunai' ? '/pic/tunai' : '/pic' }
  },
  methods: {
    async mulaiKamera() {
      if (this.kameraAktif) return
      this.error = ''
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        this.$refs.video.srcObject = this.stream
        await this.$refs.video.play()
        this.kameraAktif = true
        this.loopScan()
      } catch (e) { this.error = 'Kamera tidak bisa dibuka. Pastikan izin kamera diberikan.' }
    },
    stopKamera() { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.stream = null; this.kameraAktif = false },
    async loopScan() {
      if (!this.kameraAktif) return
      const video=this.$refs.video, canvas=this.$refs.canvas
      if (video.videoWidth && video.videoHeight) {
        canvas.width=video.videoWidth; canvas.height=video.videoHeight
        const ctx=canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(video,0,0,canvas.width,canvas.height)
        try {
          if ('BarcodeDetector' in window) {
            const detector=new window.BarcodeDetector({ formats: ['qr_code'] }); const codes=await detector.detect(video)
            if (codes.length && codes[0].rawValue) return this.prosesToken(codes[0].rawValue)
          } else {
            const jsqr=(await import('jsqr')).default; const result=jsqr(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)
            if (result && result.data) return this.prosesToken(result.data)
          }
        } catch (_) {}
      }
      this.frame=requestAnimationFrame(this.loopScan)
    },
    async prosesToken(token) {
      if (!token || !this.kameraAktif) return
      try {
        const data=await api.resolveQr(token)
        this.stopKamera()
        this.$store.commit('pos/setScan', data.siswa.id)
        this.$store.commit('pos/setQrToken', data.token)
        const list = this.$store.state.siswaList.map((s) => Number(s.id) === Number(data.siswa.id) ? Object.assign({}, s, data.siswa) : s)
        this.$store.commit('setSiswa', list)
        this.$router.push('/pic/konfirmasi')
      } catch (e) { this.error=e.message || 'QR tidak valid'; setTimeout(() => { if (this.kameraAktif) this.frame=requestAnimationFrame(this.loopScan) }, 1500) }
    },
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: var(--navy); min-height: 0; }
.stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 0 22px 26px; }

.viewfinder {
  width: 250px; height: 250px; border-radius: var(--r-lg);
  background: rgba(255,255,255,.05); position: relative;
  display: flex; align-items: center; justify-content: center;
}
.c { position: absolute; width: 44px; height: 44px; border: 0 solid var(--sand); }
.c--tl { top: 0; left: 0; border-top-width: 3px; border-left-width: 3px; border-radius: 16px 0 0 0; }
.c--tr { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; border-radius: 0 16px 0 0; }
.c--bl { bottom: 0; left: 0; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 16px; }
.c--br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 16px 0; }
.kamera { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.hidden-canvas { display:none; }
.kamera-btn { border:0; border-radius:12px; padding:11px 18px; background:var(--sand); color:var(--navy); font-weight:700; }
.error { color:var(--coral); font:500 12px var(--font-body); text-align:center; }
.ph { font: 400 11.5px/1.5 var(--font-body); color: rgba(255,255,255,.35); text-align: center; padding: 0 30px; }
.laser { position: absolute; left: 14px; right: 14px; height: 2px; background: var(--sand); animation: fkPulse 1.4s ease-in-out infinite; }

.hint { margin: 0; font: 400 12.5px var(--font-body); color: rgba(255,255,255,.6); text-align: center; }
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
</style>

