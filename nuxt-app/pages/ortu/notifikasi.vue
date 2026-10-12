<template>
  <div class="wrap">
    <ScreenHeader title="Notifikasi" to="/ortu" />
    <div class="body">
      <div v-if="memuat" class="kosong">Memuat notifikasi…</div>
      <div v-else-if="!semuaNotifikasi.length" class="kosong">Tidak ada tagihan mendesak atau status pembayaran baru.</div>
      <div v-else v-for="(n, i) in semuaNotifikasi" :key="i" class="card notif" :class="n.baru ? 'notif--baru' : ''">
        <span class="dot"></span>
        <div class="notif__body">
          <div class="notif__head">
            <span class="notif__judul display">{{ n.judul }}</span>
            <span class="notif__waktu">{{ n.waktu | waktu }}</span>
          </div>
          <p>{{ n.isi }}</p>
        </div>
      </div>
    </div>
    <OrtuTabBar />
  </div>
</template>

<script>
export default {
  layout: 'phone',
  middleware: ['auth', 'ortu'],
  async mounted() {
    await this.$store.dispatch('ortu/muatAnak')
    const anak = this.$store.state.ortu.anak
    await Promise.all(anak.map((a) => this.$store.dispatch('ortu/muatTagihan', a.id)))
    await this.$store.dispatch('ortu/muatPembayaran')
  },
  computed: {
    notifikasi() { return this.$store.getters['ortu/notifikasi'] },
    semuaNotifikasi() { return this.$store.getters['ortu/semuaNotifikasi'] },
    memuat() { return this.$store.state.ortu.memuatAnak }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: var(--bg); min-height: 0; }
.body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
.kosong { margin: 20px 0; padding: 24px 18px; text-align: center; color: var(--muted); font: 500 13px/1.5 var(--font-body); }
.notif { padding: 14px; display: flex; gap: 12px; }
.notif--baru { border-color: var(--blue); }
.dot { width: 8px; height: 8px; border-radius: var(--r-pill); background: var(--line); margin-top: 6px; flex: none; }
.notif--baru .dot { background: var(--blue); }
.notif__body { flex: 1; }
.notif__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.notif__judul { font: 700 13.5px var(--font-display); }
.notif__waktu { font: 400 11px var(--font-body); color: var(--muted); white-space: nowrap; }
.notif__body p { margin: 3px 0 0; font: 400 12.5px/1.5 var(--font-body); color: var(--muted); text-wrap: pretty; }
</style>

