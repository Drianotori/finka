<template>
  <div class="wrap">
    <ScreenHeader title="Riwayat Belanja Anak" to="/ortu" />
    <div class="filter">
      <button
        class="chip chip--pill"
        :class="filterAnakId === null ? 'chip--on' : ''"
        @click="filterAnakId = null"
      >Semua</button>
      <button
        v-for="a in siswa"
        :key="a.id"
        class="chip chip--pill"
        :class="filterAnakId === a.id ? 'chip--on' : ''"
        @click="filterAnakId = a.id"
      >{{ a.nama.split(' ')[0] }}</button>
    </div>
    <div class="body">
      <div v-if="memuat" class="muat">Memuat riwayat…</div>
      <div v-for="h in hari" v-else :key="h.tanggal" class="hari">
        <div class="hari__head">
          <span>{{ h.tanggal }}</span>
          <span class="num">{{ h.total }}</span>
        </div>
        <div class="card">
          <TrxRow v-for="t in h.items" :key="t.id" :trx="t" :to="'/ortu/riwayat#' + t.id" show-sisa />
        </div>
      </div>
      <div v-if="!memuat && !hari.length" class="muat">Belum ada transaksi.</div>
    </div>
    <OrtuTabBar />
  </div>
</template>

<script>
import { trxDariLedger } from '~/utils/adapt'

export default {
  layout: 'phone',
  middleware: ['auth', 'ortu'],
  data() {
    return { filterAnakId: null, memuat: true }
  },
  computed: {
    siswa() { return this.$store.state.ortu.anak },
    daftar() {
      const semua = []
      this.siswa.forEach((a) => {
        const rows = this.$store.state.ortu.riwayat[a.id] || []
        rows.forEach((row) => semua.push(Object.assign(trxDariLedger(row), { siswaId: a.id })))
      })
      semua.sort((a, b) => b.id - a.id)
      return this.filterAnakId === null ? semua : semua.filter((t) => t.siswaId === this.filterAnakId)
    },
    hari() {
      const out = []
      this.daftar.forEach((t) => {
        let g = out.find((x) => x.tanggalKey === t.tanggalKey)
        if (!g) { g = { tanggalKey: t.tanggalKey, tanggal: t.tanggalLabel, keluar: 0, items: [] }; out.push(g) }
        g.items.push(t)
        if (t.nominal < 0) g.keluar += -t.nominal
      })
      return out.map((g) => ({
        tanggal: g.tanggal,
        total: g.keluar ? '− ' + this.$num(g.keluar) : '—',
        items: g.items
      }))
    }
  },
  async mounted() {
    await this.$store.dispatch('ortu/muatAnak')
    await Promise.all(this.siswa.map((a) => this.$store.dispatch('ortu/muatRiwayat', a.id)))
    const q = this.$route.query.anak
    if (q !== undefined) this.filterAnakId = Number(q)
    this.memuat = false
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: var(--bg); min-height: 0; }
.filter { display: flex; gap: 8px; padding: 14px 18px; background: #fff; border-bottom: 1px solid var(--line); flex: none; }
.body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 18px; }
.hari { display: flex; flex-direction: column; gap: 9px; }
.hari__head { display: flex; align-items: center; justify-content: space-between; font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .04em; }
.muat { padding: 40px 20px; text-align: center; font: 500 13px var(--font-body); color: var(--muted); }
</style>

