<template>
  <div class="wrap">
    <div class="stage">
      <div class="cek">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </div>
      <div class="judul display">{{ tunai ? 'Penarikan berhasil' : 'Transaksi berhasil' }}</div>
      <div class="nominal display num">{{ total | rp }}</div>
      <div v-if="tunai" class="serahkan display">Serahkan uang tunai {{ total | rp }}</div>

      <div class="rincian">
        <div><span>Siswa</span><b>{{ nama }}</b></div>
        <div v-if="tunai"><span>Metode</span><b>Tunai dari saldo</b></div>
        <div><span>Saldo sebelum</span><b class="num">{{ sebelum | rp }}</b></div>
        <div><span>Sisa saldo</span><b class="display num is-ok">{{ sisa | rp }}</b></div>
        <div v-if="tunai && kasSesi !== null"><span>Kas laci</span><b class="num">{{ kasSesi | rp }}</b></div>
        <div><span>ID transaksi</span><b class="num">{{ ledgerId ? 'TRX-' + ledgerId : '—' }}</b></div>
      </div>

      <div class="note">
        <i></i>
        <span>Struk terkirim ke siswa dan orang tua</span>
      </div>
    </div>
    <button class="btn btn--primary" @click="lagi">Transaksi berikutnya</button>
  </div>
</template>

<script>
export default {
  middleware: ['auth', 'pic'],
  layout: 'phone',
  data() {
    return { snapshot: null }
  },
  computed: {
    tunai() { return this.snapshot ? this.snapshot.tunai : false },
    total() { return this.snapshot ? this.snapshot.total : 0 },
    nama() { return this.snapshot ? this.snapshot.nama : '' },
    sisa() { return this.snapshot ? this.snapshot.sisa : 0 },
    sebelum() { return this.sisa + this.total },
    kasSesi() { return this.$store.state.pos.kasSesi },
    ledgerId() { return this.$store.state.pos.lastLedgerId }
  },
  created() {
    const s = this.$store.getters['pos/siswaScan']
    if (!s) return
    this.snapshot = {
      tunai: this.$store.state.pos.mode === 'tunai',
      total: this.$store.getters['pos/total'],
      nama: s.nama + ' · ' + s.kelas,
      sisa: s.saldo
    }
  },
  mounted() {
    if (!this.snapshot) this.$router.replace('/pic')
  },
  methods: {
    lagi() {
      this.$store.commit('pos/reset')
      this.$router.push('/pic')
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: #fff; padding: 26px 22px; min-height: 0; overflow-y: auto; }
.stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
.cek { width: 74px; height: 74px; border-radius: var(--r-pill); background: rgba(26,128,64,.12); display: flex; align-items: center; justify-content: center; }
.judul { font: 700 21px var(--font-display); }
.nominal { font: 800 34px var(--font-display); letter-spacing: -.03em; }
.serahkan { background: var(--sand); color: var(--navy); font: 700 13px var(--font-display); padding: 10px 16px; border-radius: var(--r-pill); }

.rincian { width: 100%; background: var(--bg); border-radius: var(--r-md); padding: 18px; display: flex; flex-direction: column; gap: 11px; }
.rincian div { display: flex; justify-content: space-between; gap: 12px; }
.rincian span { font: 400 12.5px var(--font-body); color: var(--muted); }
.rincian b { font: 600 12.5px var(--font-body); }
.rincian b.is-ok { font: 700 14px var(--font-display); color: var(--green); }

.note { display: flex; align-items: center; gap: 8px; font: 400 12px var(--font-body); color: var(--muted); }
.note i { width: 6px; height: 6px; border-radius: var(--r-pill); background: var(--green); }
</style>

