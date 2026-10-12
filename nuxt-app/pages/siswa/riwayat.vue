<template>
  <div class="wrap">
    <ScreenHeader title="Riwayat" to="/siswa" dark />
    <div class="sheet">
      <div v-for="h in hari" :key="h.tanggal" class="hari">
        <div class="hari__label">{{ h.tanggal }}</div>
        <TrxRow v-for="t in h.items" :key="t.id" :trx="t" :to="'/siswa/struk/' + t.id" show-sisa />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'phone',
  middleware: ['auth', 'siswa'],
  computed: {
    hari() {
      const out = []
      this.$store.getters['siswa/transaksi'].forEach((t) => {
        let g = out.find((x) => x.tanggal === t.tanggalLabel)
        if (!g) { g = { tanggal: t.tanggalLabel, items: [] }; out.push(g) }
        g.items.push(t)
      })
      return out
    }
  },
  async mounted() { await this.$store.dispatch('siswa/muat') }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; overflow-y: auto; min-height: 0; }
.sheet { flex: 1; background: #fff; border-radius: 24px 24px 0 0; padding: 20px; display: flex; flex-direction: column; gap: 18px; }
.hari { display: flex; flex-direction: column; }
.hari__label { font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .04em; margin-bottom: 10px; }
</style>

