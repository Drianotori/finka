<template>
  <div class="wrap">
    <ScreenHeader title="Detail Tagihan" to="/ortu/tagihan" />
    <div v-if="!bill" class="body"><div class="muat">Memuat…</div></div>
    <div v-else class="body">
      <div class="head">
        <div class="periode">{{ bill.anakNama }}</div>
        <div class="nama display">{{ bill.nama }}</div>
        <div class="nominal display num">{{ bill.nominal | rp }}</div>
      </div>

      <div class="card rincian">
        <div><span>Siswa</span><b>{{ bill.anakNama }}</b></div>
        <div><span>Jatuh tempo</span><b class="due">{{ tanggalIndo(bill.jatuh_tempo) }}</b></div>
        <div><span>Status</span><b>{{ bill.status === 'lunas' ? 'Lunas' : 'Belum Bayar' }}</b></div>
      </div>

      <div class="cara">
        <div class="cara__judul display">Cara bayar</div>
        <p>Transfer ke rekening yayasan dengan nominal berkode unik, lalu unggah bukti. Tagihan menjadi lunas setelah admin memverifikasi — tidak memotong saldo saku.</p>
      </div>

      <div class="spacer"></div>
      <button v-if="bill.status !== 'lunas' && !pembayaranPending" class="btn btn--primary" @click="bayar">Bayar tagihan ini</button>
      <div v-else-if="pembayaranPending" class="pending-note">Pembayaran tagihan ini sedang menunggu verifikasi admin.</div>
      <div v-else class="lunas-note">Tagihan ini sudah lunas.</div>
    </div>
  </div>
</template>

<script>
import { tanggalIndo } from '~/utils/adapt'

export default {
  layout: 'phone',
  middleware: ['auth', 'ortu'],
  computed: {
    bill() {
      return this.$store.getters['ortu/tagihanSemua'].find((t) => String(t.id) === this.$route.params.id)
    },
    pembayaranPending() {
      return this.$store.state.ortu.riwayatPembayaran.some(
        (r) => Number(r.tagihan_id) === Number(this.$route.params.id) && r.status === 'menunggu'
      )
    }
  },
  async mounted() {
    await this.$store.dispatch('ortu/muatAnak')
    const anak = this.$store.state.ortu.anak
    await Promise.all(anak.map((a) => this.$store.dispatch('ortu/muatTagihan', a.id)))
    await this.$store.dispatch('ortu/muatPembayaran')
  },
  methods: {
    tanggalIndo,
    bayar() {
      this.$store.commit('topup/reset')
      this.$store.commit('topup/setAnak', this.bill.siswa_id)
      this.$store.commit('topup/setNominal', this.bill.nominal)
      this.$store.commit('topup/setTagihan', this.bill.id)
      this.$router.push('/ortu/isi-saldo')
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
.body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 18px; }
.muat { padding: 40px 20px; text-align: center; font: 500 13px var(--font-body); color: var(--muted); }
.head { display: flex; flex-direction: column; gap: 6px; }
.periode { font: 600 12px var(--font-body); color: var(--muted); }
.nama { font: 700 19px var(--font-display); }
.nominal { font: 800 32px var(--font-display); letter-spacing: -.02em; margin-top: 6px; }

.rincian { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.rincian div { display: flex; justify-content: space-between; }
.rincian span { font: 400 12.5px var(--font-body); color: var(--muted); }
.rincian b { font: 600 12.5px var(--font-body); }
.due { color: var(--coral); }

.cara { background: var(--blue-soft); border-radius: var(--r-md); padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.cara__judul { font: 700 12.5px var(--font-display); }
.cara p { margin: 0; font: 400 12.5px/1.5 var(--font-body); color: var(--muted); text-wrap: pretty; }
.spacer { flex: 1; }
.pending-note { text-align: center; font: 500 13px var(--font-body); color: var(--sand-ink); padding: 13px; background: rgba(192,169,127,.12); border-radius: var(--r-sm); }
.lunas-note { text-align: center; font: 500 13px var(--font-body); color: var(--green); padding: 13px; background: rgba(26,128,64,.08); border-radius: var(--r-sm); }
</style>

