<template>
  <div class="wrap">
    <ScreenHeader title="Kontrol Orang Tua" to="/ortu" />
    <div class="body">
      <div class="card anak">
        <div class="av">{{ aktif.inisial }}</div>
        <div class="anak__id">
          <div class="anak__nama">{{ aktif.nama }}</div>
          <div class="anak__sub">{{ aktif.kelas }} · NIS {{ aktif.nis }}</div>
        </div>
        <button class="link" @click="ganti">Ganti</button>
      </div>

      <div class="card blok">
        <div class="blok__head">
          <div>
            <div class="blok__judul display">Limit belanja harian</div>
            <div class="blok__ket">Reset otomatis pukul 00.00 WIB</div>
          </div>
          <ToggleSwitch :value="limitOn" @input="setLimitOn" />
        </div>
        <div v-if="limitOn" class="limit">
          <div class="limit__nilai display num">{{ limit | rp }}<span> / hari</span></div>
          <div class="chips">
            <button
              v-for="n in limitOpsi"
              :key="n"
              class="chip num"
              :class="n === limit ? 'chip--on' : ''"
              @click="setLimit(n)"
            >{{ n | num }}</button>
          </div>
          <div>
            <div class="bar"><i :style="'width:' + pakaiPct + '%'"></i></div>
            <div class="bar__ket">
              <span>Terpakai hari ini {{ pakai | rp }}</span>
              <b>sisa {{ sisa | rp }}</b>
            </div>
          </div>
        </div>
      </div>

      <div class="card blok" :class="blokir ? 'blok--danger' : ''">
        <div class="blok__head">
          <div>
            <div class="blok__judul display">Blokir kartu &amp; QR</div>
            <div class="blok__ket">{{ blokir ? 'Kartu dan QR nonaktif' : 'Gunakan bila kartu hilang. Berlaku seketika.' }}</div>
          </div>
          <ToggleSwitch :value="blokir" danger @input="setBlokir" />
        </div>
        <div v-if="blokir" class="warn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" stroke-width="1.9"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>
          <p>Kartu diblokir. Semua transaksi kantin dan koperasi ditolak sampai Anda membuka blokir.</p>
        </div>
      </div>

      <div class="card blok">
        <div class="blok__head">
          <div>
            <div class="blok__judul display">PIN belanja anak</div>
            <div class="blok__ket">Gunakan bila PIN lupa atau terkunci. PIN lama langsung tidak berlaku.</div>
          </div>
          <button class="link" :disabled="resetPin.loading" @click="buatPinBaru">{{ resetPin.loading ? 'Memproses…' : 'Buat PIN baru' }}</button>
        </div>
        <div v-if="resetPin.pin" class="warn pin-ok">
          <p>PIN baru untuk {{ resetPin.nama }}: <b class="num" style="font-size:20px;letter-spacing:3px">{{ resetPin.pin }}</b><br>Catat dan sampaikan ke anak. PIN hanya ditampilkan sekali.</p>
        </div>
        <p v-if="resetPin.error" class="galat">{{ resetPin.error }}</p>
      </div>

      <p v-if="error" class="galat">{{ error }}</p>
    </div>
    <OrtuTabBar />
  </div>
</template>

<script>
import { api } from '~/plugins/api'

export default {
  middleware: ['auth', 'ortu'],
  layout: 'phone',
  data() {
    return { limitOpsi: [15000, 25000, 35000, 50000], error: '', menyimpan: false, resetPin: { loading: false, pin: '', nama: '', error: '' } }
  },
  computed: {
    aktif() { return this.$store.state.ortu.anak.find((a) => Number(a.id) === Number(this.$store.state.topup.anakAktifId)) || this.$store.state.ortu.anak[0] || {} },
    limitOn() { return this.$store.state.limitOn },
    limit() { return this.$store.state.limit },
    blokir() { return this.$store.state.blokir },
    pakai() { return this.$store.state.limitPakai },
    sisa() { return this.$store.getters.limitSisa },
    pakaiPct() { return Math.min(100, Math.round((this.pakai / this.limit) * 100)) }
  },
  async mounted() {
    await this.$store.dispatch('ortu/muatAnak')
    await this.muat()
  },
  watch: {
    'aktif.id'() { this.muat() }
  },
  methods: {
    async buatPinBaru() {
      const a = this.aktif
      if (!a.id) return
      if (!window.confirm(`Buat PIN baru untuk ${a.nama}? PIN lama tidak akan berlaku lagi.`)) return
      this.resetPin = { loading: true, pin: '', nama: a.nama, error: '' }
      try {
        const r = await api.resetPinAnak(a.id)
        this.resetPin = { loading: false, pin: r.pin, nama: r.nama, error: '' }
      } catch (e) {
        this.resetPin = { loading: false, pin: '', nama: a.nama, error: e.message || 'Gagal membuat PIN baru' }
      }
    },
    ganti() {
      this.resetPin = { loading: false, pin: '', nama: '', error: '' }
      const anak = this.$store.state.ortu.anak
      if (!anak.length) return
      const ix = anak.findIndex((a) => Number(a.id) === Number(this.$store.state.topup.anakAktifId))
      this.$store.commit('topup/setAnak', anak[(ix + 1) % anak.length].id)
    },
    async muat() {
      if (!this.aktif.id) return
      this.error = ''
      try { await this.$store.dispatch('muatKontrol', this.aktif.id) } catch (e) { this.error = e.message || 'Gagal memuat kontrol' }
    },
    // Setiap perubahan langsung disimpan ke server (berlaku seketika di kasir).
    async simpan(payload) {
      if (!this.aktif.id || this.menyimpan) return
      this.error = ''; this.menyimpan = true
      try { await this.$store.dispatch('simpanKontrol', { siswaId: this.aktif.id, payload }) } catch (e) { this.error = e.message || 'Gagal menyimpan' } finally { this.menyimpan = false }
    },
    setLimitOn(v) { return this.simpan({ limit_aktif: !!v }) },
    setLimit(n) { return this.simpan({ limit: n, limit_aktif: true }) },
    setBlokir(v) { return this.simpan({ kartu_diblokir: !!v }) }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: var(--bg); min-height: 0; }
.body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 14px; }

.anak { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.av {
  width: 36px; height: 36px; border-radius: var(--r-pill); flex: none;
  background: var(--blue-soft); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font: 700 13px var(--font-display);
}
.anak__id { flex: 1; }
.anak__nama { font: 600 14px var(--font-body); }
.anak__sub { font: 400 12px var(--font-body); color: var(--muted); }
.link { border: none; background: none; color: var(--blue); font: 600 12px var(--font-body); cursor: pointer; padding: 0; }

.blok { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
.blok--danger { border-color: var(--coral); }
.blok__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.blok__judul { font: 700 14px var(--font-display); }
.blok__ket { font: 400 12px/1.45 var(--font-body); color: var(--muted); margin-top: 3px; max-width: 230px; text-wrap: pretty; }

.limit { display: flex; flex-direction: column; gap: 14px; }
.limit__nilai { font: 800 28px var(--font-display); letter-spacing: -.02em; }
.limit__nilai span { font: 500 13px var(--font-body); color: var(--muted); }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.bar { height: 7px; border-radius: var(--r-pill); background: var(--bg); overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--blue); border-radius: var(--r-pill); }
.bar__ket { display: flex; justify-content: space-between; margin-top: 7px; font: 400 11.5px var(--font-body); color: var(--muted); }
.bar__ket b { color: var(--blue); font-weight: 600; }

.warn { background: rgba(223,74,55,.08); border-radius: var(--r-sm); padding: 12px; display: flex; gap: 10px; align-items: flex-start; }
.warn svg { flex: none; margin-top: 1px; }
.warn p { margin: 0; font: 400 12px/1.5 var(--font-body); color: var(--coral); text-wrap: pretty; }

.galat { margin: 0; font: 500 12.5px var(--font-body); color: var(--coral); }
.pin-ok { background: #eef0ff; }
.pin-ok p, .pin-ok b { color: #1f2a8a; }
</style>

