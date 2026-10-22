<template>
  <div class="wrap">
    <ScreenHeader title="Riwayat Transaksi" to="/pic" />

    <div class="sheet">
      <div v-if="!hari.length" class="kosong">
        <span>Belum ada transaksi di {{ namaOutlet }} hari ini.</span>
      </div>
      <div v-for="h in hari" :key="h.tanggal" class="hari">
        <div class="hari__label">{{ h.tanggal }}</div>
        <div v-for="t in h.items" :key="t.id" class="row">
          <div class="ik">{{ inisial(t) }}</div>
          <div class="body">
            <div class="judul">{{ namaSiswa(t) }}</div>
            <div class="meta">{{ t.meta }}</div>
          </div>
          <div class="kanan">
            <div class="nominal num">− {{ Math.abs(t.nominal) | num }}</div>
            <div class="sisa num">sisa {{ t.sisa | num }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { OUTLET_INFO } from '~/store/pos.js'

export default {
  layout: 'phone',
  computed: {
    outlet() { return this.$store.state.pos.outlet },
    namaOutlet() { return OUTLET_INFO[this.outlet].nama },
    trxOutlet() {
      return this.$store.state.trx.filter((t) => t.outlet === this.namaOutlet && t.nominal < 0)
    },
    hari() {
      const out = []
      this.trxOutlet.forEach((t) => {
        let g = out.find((x) => x.tanggal === t.hari)
        if (!g) { g = { tanggal: t.hari, items: [] }; out.push(g) }
        g.items.push(t)
      })
      return out
    }
  },
  methods: {
    siswa(t) { return this.$store.state.siswa[t.anak] },
    namaSiswa(t) {
      const s = this.siswa(t)
      return s ? s.nama + ' · ' + s.kelas : 'Siswa'
    },
    inisial(t) {
      const s = this.siswa(t)
      return s ? s.inisial : '?'
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
.sheet { flex: 1; overflow-y: auto; padding: 14px 18px 20px; display: flex; flex-direction: column; gap: 18px; }
.kosong { padding: 30px 4px; text-align: center; font: 400 12.5px var(--font-body); color: var(--muted); }
.hari { display: flex; flex-direction: column; }
.hari__label { font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .04em; margin-bottom: 10px; }

.row { display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid var(--bg); }
.ik {
  width: 34px; height: 34px; border-radius: var(--r-pill); flex: none;
  background: var(--blue-soft); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font: 700 12px var(--font-display);
}
.body { flex: 1; min-width: 0; }
.judul { font: 600 13.5px var(--font-body); color: var(--ink); }
.meta { font: 400 11.5px var(--font-body); color: var(--muted); margin-top: 1px; }
.kanan { text-align: right; }
.nominal { font: 700 13.5px var(--font-body); color: var(--ink); }
.sisa { font: 400 11px var(--font-body); color: var(--muted); margin-top: 1px; }
</style>
