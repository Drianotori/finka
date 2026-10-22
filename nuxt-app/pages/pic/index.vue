<template>
  <div class="wrap">
    <div v-if="konfirmasi" class="dlg" @click.self="konfirmasi = null">
      <div class="dlg__box" role="alertdialog" aria-modal="true" aria-labelledby="dlg-judul">
        <div id="dlg-judul" class="dlg__judul display">Batalkan pesanan?</div>
        <p class="dlg__teks">{{ konfirmasi.nama }} akan dihapus dari pesanan{{ jumlah === 1 ? ', sehingga pesanan menjadi batal' : '' }}.</p>
        <div class="dlg__aksi">
          <button type="button" class="dlg__btn" @click="konfirmasi = null">Tidak</button>
          <button type="button" class="dlg__btn dlg__btn--bahaya" @click="batalkanPesanan">Ya, batalkan</button>
        </div>
      </div>
    </div>
    <header class="head">
      <div>
        <div class="outlet display">{{ info.nama }}</div>
        <div class="sesi">Sesi {{ info.sesi }}</div>
      </div>
      <div class="kanan">
        <div class="kanan__atas">
          <span class="badge badge--ok">Online</span>
          <nuxt-link to="/pic/riwayat" class="riwayat" aria-label="Riwayat transaksi">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8" /><path d="M3 4v4h4" /><path d="M12 7v5l3 2" /></svg>
          </nuxt-link>
        </div>
        <span class="kas num">Kas tunai {{ kasSesi | rp }}</span>
      </div>
    </header>

    <div class="grid">
      <div
        v-for="p in produk"
        :key="p.id"
        class="prod"
        :class="cart[p.id] ? 'prod--on' : ''"
        role="button"
        tabindex="0"
        @click="tambah(p.id)"
        @keydown.enter="tambah(p.id)"
        @keydown.space.prevent="tambah(p.id)"
      >
        <div class="prod__top">
          <span class="tile">{{ p.tile }}</span>
          <div v-if="cart[p.id]" class="stepper" @click.stop>
            <button type="button" class="step" aria-label="Kurangi" @click="kurang(p)">−</button>
            <span class="step__qty num">{{ cart[p.id] }}</span>
            <button type="button" class="step" aria-label="Tambah" @click="tambah(p.id)">+</button>
          </div>
        </div>
        <div class="prod__body">
          <div class="prod__nama">{{ p.nama }}</div>
          <div class="prod__ket">{{ p.ket }}</div>
        </div>
        <div class="prod__harga display num">{{ p.harga | rp }}</div>
      </div>
    </div>

    <footer class="foot">
      <div class="foot__row">
        <span class="foot__count">{{ jumlah }} item</span>
        <button class="kosong" :class="total ? '' : 'is-off'" @click="kosongkan">Kosongkan</button>
      </div>
      <div class="foot__row foot__row--total">
        <span>Total</span>
        <span class="display num">{{ total | rp }}</span>
      </div>
      <div class="foot__aksi">
        <button class="btn" :class="total ? 'btn--primary' : 'btn--off'" :disabled="!total" @click="scan">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18" /></svg>
          Scan siswa
        </button>
        <nuxt-link to="/pic/tunai" class="tunai display">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 12h.01M18 12h.01" /></svg>
          Tunai
        </nuxt-link>
      </div>
    </footer>
  </div>
</template>

<script>
import { OUTLET_INFO } from '~/store/pos.js'

export default {
  layout: 'phone',
  data() {
    return { konfirmasi: null }
  },
  computed: {
    outlet() { return this.$store.state.pos.outlet },
    info() { return OUTLET_INFO[this.outlet] || OUTLET_INFO[0] },
    cart() { return this.$store.state.pos.cart },
    kasSesi() { return this.$store.state.pos.kasSesi },
    produk() { return this.$store.getters.produkOutlet(this.outlet) },
    total() { return this.$store.getters['pos/totalBelanja'] },
    jumlah() { return this.$store.getters['pos/jumlahItem'] }
  },
  methods: {
    tambah(id) { this.$store.commit('pos/tambah', id) },
    // Sisa 1 lalu klik "−" = minta konfirmasi untuk membatalkan pesanan item itu
    kurang(p) {
      if (this.cart[p.id] <= 1) {
        this.konfirmasi = { id: p.id, nama: p.nama }
        return
      }
      this.$store.commit('pos/kurang', p.id)
    },
    batalkanPesanan() {
      if (this.konfirmasi) this.$store.commit('pos/hapusItem', this.konfirmasi.id)
      this.konfirmasi = null
    },
    kosongkan() { this.$store.commit('pos/kosongkan') },
    scan() {
      if (!this.total) return
      this.$store.commit('pos/setMode', 'belanja')
      this.$router.push('/pic/scan')
    }
  }
}
</script>

<style scoped>
.wrap { position: relative; flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
.head { padding: 8px 18px 14px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex: none; }
.outlet { font: 700 15px var(--font-display); }
.sesi { font: 400 11.5px var(--font-body); color: var(--muted); margin-top: 2px; }
.kanan { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.kanan__atas { display: flex; align-items: center; gap: 8px; }
.kas { font: 400 10.5px var(--font-body); color: var(--muted); }
.riwayat { display: flex; color: var(--muted); padding: 3px; margin: -3px; border-radius: var(--r-pill); }
.riwayat:hover { color: var(--blue); background: var(--blue-soft); }

.grid { flex: 1; overflow-y: auto; padding: 14px 18px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-content: start; }
.prod {
  border: 1px solid var(--line); background: #fff; border-radius: var(--r-md);
  padding: 13px; display: flex; flex-direction: column; gap: 10px;
  cursor: pointer; min-height: 104px; text-align: left;
}
.prod--on { border-color: var(--blue); background: var(--blue-soft); }
.prod__top { display: flex; align-items: flex-start; justify-content: space-between; }
.tile {
  width: 30px; height: 30px; border-radius: var(--r-sm);
  background: var(--bg); color: var(--muted);
  display: flex; align-items: center; justify-content: center; font: 700 12px var(--font-display);
}
.prod--on .tile { background: var(--blue); color: #fff; }
.stepper {
  display: flex; align-items: center; gap: 1px;
  background: var(--blue); border-radius: var(--r-pill); padding: 2px;
}
.step {
  width: 20px; height: 20px; border: none; flex: none;
  background: rgba(255,255,255,.16); color: #fff; border-radius: var(--r-pill);
  display: flex; align-items: center; justify-content: center;
  font: 700 14px var(--font-display); line-height: 1; cursor: pointer; padding: 0;
}
.step:hover { background: rgba(255,255,255,.32); }
.step:active { background: rgba(255,255,255,.42); }
.step__qty { min-width: 16px; text-align: center; color: #fff; font: 700 11.5px var(--font-body); }
.prod__body { flex: 1; }
.prod__nama { font: 600 13px/1.35 var(--font-body); text-wrap: pretty; }
.prod__ket { font: 400 11px var(--font-body); color: var(--muted); margin-top: 2px; }
.prod__harga { font: 700 13.5px var(--font-display); }

.foot { border-top: 1px solid var(--line); padding: 14px 18px 22px; display: flex; flex-direction: column; gap: 12px; flex: none; }
.foot__row { display: flex; align-items: center; justify-content: space-between; font: 400 12.5px var(--font-body); color: var(--muted); }
.foot__row--total { align-items: flex-end; }
.foot__row--total span:last-child { font: 800 26px var(--font-display); color: var(--ink); letter-spacing: -.02em; }
.kosong { border: none; background: none; font: 600 12px var(--font-body); color: var(--coral); cursor: pointer; padding: 0; }
.kosong.is-off { color: var(--disabled); }
.foot__aksi { display: flex; gap: 10px; }
.foot__aksi .btn { flex: 1; }
.tunai {
  flex: none; border: 1.5px solid var(--blue); color: var(--blue);
  font: 700 15px var(--font-display); padding: 16px 18px; border-radius: var(--r-sm);
  display: flex; align-items: center; gap: 9px;
}
.tunai:hover { color: var(--blue); background: var(--blue-soft); }
.dlg { position: absolute; inset: 0; z-index: 20; background: rgba(10, 13, 59, .45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.dlg__box { background: #fff; border-radius: var(--r-md); padding: 20px; width: 100%; box-shadow: 0 16px 40px rgba(10, 13, 59, .3); }
.dlg__judul { font: 700 16px var(--font-display); }
.dlg__teks { margin: 6px 0 16px; font: 400 13px/1.5 var(--font-body); color: var(--muted); }
.dlg__aksi { display: flex; gap: 10px; }
.dlg__btn { flex: 1; padding: 12px; border-radius: var(--r-sm); border: 1px solid var(--line); background: #fff; color: var(--ink); font: 700 13.5px var(--font-display); cursor: pointer; }
.dlg__btn:hover { border-color: #CBD0DB; }
.dlg__btn--bahaya { background: var(--coral); border-color: var(--coral); color: #fff; }
.dlg__btn--bahaya:hover { background: #C73C2B; border-color: #C73C2B; }
</style>
