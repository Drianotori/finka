<template>
  <div class="wrap">
    <ScreenHeader title="Unggah Bukti Transfer" to="/ortu/isi-saldo/instruksi" />
    <div class="body">
      <div class="ringkas">
        <span>Nominal transfer</span>
        <span class="display num">{{ transfer | rp }}</span>
      </div>

      <input ref="file" class="file-input" type="file" accept="image/jpeg,image/png,image/webp" @change="pilihFile" />
      <button type="button" class="drop" :class="bukti ? 'drop--ok' : ''" @click="pilih">
        <template v-if="bukti">
          <img class="pratinjau" :src="previewUrl" alt="Pratinjau bukti transfer" />
          <div class="ok">{{ namaFile }} · {{ ukuranFile }}</div>
          <div class="ganti">Ganti foto</div>
        </template>
        <template v-else>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.7"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M17 8l-5-5-5 5M12 3v13" /></svg>
          <div class="drop__judul display">Ambil foto atau pilih dari galeri</div>
          <div class="drop__ket">JPG atau PNG, maks 5 MB</div>
        </template>
      </button>

      <div class="spacer"></div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn" :class="bukti && !mengirim ? 'btn--primary' : 'btn--off'" :disabled="!bukti || mengirim" @click="kirim">
        {{ mengirim ? 'Mengunggah…' : 'Kirim untuk verifikasi' }}
      </button>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'

export default {
  layout: 'phone',
  middleware: ['auth', 'ortu'],
  data() {
    return { file: null, previewUrl: '', bukti: false, mengirim: false, error: '' }
  },
  computed: {
    transfer() { return this.$store.getters['topup/transfer'] },
    namaFile() { return this.file ? this.file.name : 'bukti-transfer' },
    ukuranFile() {
      if (!this.file) return ''
      const kb = this.file.size / 1024
      return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB'
    }
  },
  beforeDestroy() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
  },
  methods: {
    pilih() {
      this.$refs.file && this.$refs.file.click()
    },
    pilihFile(event) {
      const file = event.target.files && event.target.files[0]
      if (!file) return
      this.error = ''
      const allowed = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) {
        this.error = 'Pilih file JPG, PNG, atau WEBP.'
        event.target.value = ''
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'Ukuran bukti maksimal 5 MB.'
        event.target.value = ''
        return
      }

      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
      this.file = file
      this.previewUrl = URL.createObjectURL(file)
      this.bukti = true
    },
    bacaSebagaiDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('File tidak dapat dibaca'))
        reader.readAsDataURL(file)
      })
    },
    async kirim() {
      if (!this.file || !this.$store.state.topup.id) return
      this.error = ''
      this.mengirim = true
      try {
        const dataUrl = await this.bacaSebagaiDataUrl(this.file)
        await api.uploadBuktiTopup(
          this.$store.state.topup.id,
          dataUrl,
          this.file.name,
          this.file.type,
          this.file.size
        )
        this.$router.push('/ortu/isi-saldo/status?id=' + this.$store.state.topup.id)
      } catch (e) {
        this.error = e.message || 'Gagal mengunggah bukti transfer.'
      } finally {
        this.mengirim = false
      }
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
.body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 18px; }
.ringkas {
  background: var(--bg); border-radius: var(--r-md); padding: 14px 16px;
  display: flex; align-items: center; justify-content: space-between;
  font: 400 12.5px var(--font-body); color: var(--muted);
}
.ringkas span:last-child { font: 700 15px var(--font-display); color: var(--ink); }

.file-input { display: none; }
.error { margin: 0; color: var(--coral); font: 500 12px var(--font-body); }
.drop {
  border: 1.5px dashed var(--blue); background: var(--blue-soft);
  border-radius: var(--r-md); padding: 28px 20px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%;
}
.drop--ok { border-color: var(--green); background: rgba(26,128,64,.05); }
.drop__judul { font: 600 13.5px var(--font-display); }
.drop__ket { font: 400 11.5px var(--font-body); color: var(--muted); }
.pratinjau {
  width: 150px; height: 196px; background: #fff; border: 1px solid var(--line);
  border-radius: var(--r-sm); display: flex; flex-direction: column;
  object-fit: cover;
  align-items: center; justify-content: center; gap: 8px;
  font: 400 10.5px/1.4 var(--font-body); color: var(--muted); text-align: center; padding: 0 12px;
}
.ok { font: 600 12.5px var(--font-body); color: var(--green); }
.ganti { font: 500 12px var(--font-body); color: var(--blue); }
.spacer { flex: 1; }
</style>

