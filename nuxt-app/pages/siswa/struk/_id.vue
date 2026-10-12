<template>
  <div class="wrap">
    <ScreenHeader title="Struk Digital" to="/siswa/riwayat" dark />
    <div v-if="trx" class="sheet">
      <div class="head">
        <div class="cek">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <div class="judul display">{{ trx.judul }}</div>
        <div class="nominal display num">{{ Math.abs(trx.nominal) | rp }}</div>
        <div class="waktu">{{ trx.hari }} · {{ jam }} WIB</div>
      </div>

      <div class="putus"></div>
      <div class="items">
        <div v-for="(i, k) in trx.items" :key="k" class="item">
          <span>{{ i.nama }}</span>
          <b class="num">{{ i.harga | rp }}</b>
        </div>
      </div>

      <div class="putus"></div>
      <div class="meta">
        <div><span>Outlet</span><b>{{ trx.outlet }}</b></div>
        <div><span>Kasir</span><b>{{ trx.kasir }}</b></div>
        <div><span>Saldo sebelum</span><b class="num">{{ sebelum | rp }}</b></div>
        <div><span>Saldo sesudah</span><b class="num">{{ trx.sisa | rp }}</b></div>
        <div><span>ID transaksi</span><b class="num">{{ idTrx }}</b></div>
      </div>
      <button class="cetak" @click="cetak">Cetak / simpan PDF</button>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'phone',
  middleware: ['auth', 'siswa'],
  computed: {
    row() { return this.$store.state.siswa.riwayat.find((x) => Number(x.id) === Number(this.$route.params.id)) || null },
    trx() {
      if (!this.row) return null
      const w = this.$store.getters['siswa/transaksi'].find((x) => Number(x.id) === Number(this.row.id))
      return w ? Object.assign({}, w, { hari: w.tanggalLabel, outlet: this.row.tipe === 'topup' ? 'Saldo Finka' : 'Kantin / Koperasi', kasir: w.kasir, items: [{ nama: this.row.keterangan || w.judul, harga: Math.abs(w.nominal) }] }) : null
    },
    jam() { return this.trx ? this.trx.meta.split(' · ')[0] : '' },
    sebelum() { return this.trx ? this.trx.sisa - this.trx.nominal : 0 },
    idTrx() { return this.trx ? 'TRX-' + this.trx.id : '' }
  },
  methods: { cetak() { window.print() } },
  async mounted() { await this.$store.dispatch('siswa/muat') }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; overflow-y: auto; min-height: 0; }
.sheet { flex: 1; background: #fff; border-radius: 24px 24px 0 0; padding: 26px 22px; display: flex; flex-direction: column; gap: 20px; }
.head { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.cek { width: 48px; height: 48px; border-radius: var(--r-pill); background: rgba(26,128,64,.12); display: flex; align-items: center; justify-content: center; }
.judul { font: 700 16px var(--font-display); }
.nominal { font: 800 30px var(--font-display); letter-spacing: -.02em; }
.waktu { font: 400 12px var(--font-body); color: var(--muted); }
.putus { border-top: 1px dashed var(--line); }
.items { display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; justify-content: space-between; gap: 12px; font: 400 13px var(--font-body); }
.item b { font-weight: 600; white-space: nowrap; }
.meta { display: flex; flex-direction: column; gap: 9px; }
.meta div { display: flex; justify-content: space-between; }
.meta span { font: 400 12.5px var(--font-body); color: var(--muted); }
.meta b { font: 600 12.5px var(--font-body); }
.cetak { margin-top: auto; border: 1px solid var(--line); background: #fff; border-radius: var(--r-pill); padding: 12px; font: 600 13px var(--font-body); cursor: pointer; }
@media print {
  .cetak { display: none; }
  .sheet { border-radius: 0; padding: 0; }
}
</style>
