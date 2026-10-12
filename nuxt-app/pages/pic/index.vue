<template>
  <div class="wrap">
    <header class="head">
      <div>
        <div class="outlet display">{{ outletNama }}</div>
        <div class="sesi">{{ userNama }} · akses terbatas untuk outlet ini</div>
      </div>
      <div class="kanan">
        <span class="head-link"><nuxt-link to="/pic/riwayat" class="link-riwayat">Riwayat &amp; tutup kas</nuxt-link></span>
        <span class="kas num" style="cursor:pointer" title="Klik untuk mengatur kas awal hari ini" @click="aturKas">Kas tunai {{ kasSesi === null ? "belum diisi" : $rp(kasSesi) }}</span>
      </div>
    </header>


    <div class="product-head"><div><b class="display">Produk {{ outletNama }}</b><span>Hanya produk dari outlet akun ini</span></div><div class="head-aksi"><button class="btn-ghost" @click="bukaKelola">Kelola</button><button class="btn-add" @click="bukaTambah">+ Tambah produk</button></div></div>

    <div class="grid">
      <button v-for="p in produk" :key="p.id" class="prod" :class="cart[p.id] ? 'prod--on' : ''" @click="tambah(p.id)">
        <div class="prod__top">
          <span class="tile">{{ p.tile }}</span>
          <span v-if="cart[p.id]" class="qty-wrap" @click.stop>
            <button class="qty-btn" @click="kurangi(p.id)">−</button>
            <span class="qty">{{ cart[p.id] }}</span>
            <button class="qty-btn" @click="tambah(p.id)">+</button>
          </span>
        </div>
        <div class="prod__body">
          <div class="prod__nama">{{ p.nama }}</div>
          <div class="prod__ket">{{ p.ket }}</div>
        </div>
        <div class="prod__harga display num">{{ p.harga | rp }}</div>
      </button>
    </div>

    <footer class="foot">
      <div class="foot__row">
        <span class="foot__count">{{ jumlah }} item</span>
        <button class="kosong" :class="total ? '' : 'is-off'" @click="kosongkan">Reset</button>
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

    <div v-if="kelola.buka" class="modal-overlay" @click.self="kelola.buka = false">
      <div class="modal modal--lebar">
        <h2 class="display">Kelola Produk</h2>
        <p class="modal-sub">Ubah harga atau hapus produk {{ outletNama }}. Transaksi yang sudah terjadi tidak berubah.</p>
        <p v-if="kelola.error" class="error">{{ kelola.error }}</p>
        <div v-if="!kelola.daftar.length" class="modal-sub">Belum ada produk.</div>
        <div v-for="k in kelola.daftar" :key="k.id" class="kelola-baris">
          <input v-model="k.nama" class="input" aria-label="Nama produk" />
          <input v-model.number="k.harga" type="number" min="1" class="input input--harga" aria-label="Harga" />
          <button class="btn-add" :disabled="kelola.sibuk" @click="simpanUbah(k)">Simpan</button>
          <button class="btn-bahaya" :disabled="kelola.sibuk" @click="hapus(k)">Hapus</button>
        </div>
        <div class="modal-actions" style="margin-top:14px"><button type="button" class="btn-cancel" @click="kelola.buka = false">Tutup</button></div>
      </div>
    </div>

    <div v-if="modal" class="modal-overlay" @click.self="modal = false">
      <div class="modal">
        <h2 class="display">Tambah Produk</h2>
        <p class="modal-sub">Produk akan otomatis masuk ke {{ outletNama }}.</p>
        <form @submit.prevent="simpanProduk">
          <label>Nama produk<input v-model="form.nama" class="input" required placeholder="Contoh: Roti cokelat" /></label>
          <label>Harga jual<input v-model.number="form.harga" type="number" min="1" class="input" required placeholder="5000" /></label>
          <p v-if="error" class="error">{{ error }}</p>
          <div class="modal-actions"><button type="button" class="btn-cancel" @click="modal=false">Batal</button><button class="btn-add" type="submit" :disabled="loading">{{ loading ? 'Menyimpan…' : 'Simpan Produk' }}</button></div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'

export default {
  layout: 'phone',
  middleware: ['auth', 'pic'],
  data() { return { modal: false, loading: false, error: '', form: { nama: '', harga: null }, kelola: { buka: false, sibuk: false, error: '', daftar: [] } } },
  async mounted() { await this.$store.dispatch('muatData'); this.$store.dispatch('pos/muatKas').catch(() => {}) },
  computed: {
    user() { return this.$store.state.auth.user || {} },
    userNama() { return this.user.nama || 'PIC' },
    outletKey() { return this.user.outlet },
    outletNama() {
      return ({ kantin_utama: 'Kantin Utama', kantin_b: 'Kantin Blok B', koperasi: 'Koperasi Sekolah' })[this.outletKey] || 'Outlet'
    },
    cart() { return this.$store.state.pos.cart },
    kasSesi() { return this.$store.state.pos.kasSesi },
    produk() { return this.$store.state.produk },
    total() { return this.$store.getters['pos/totalBelanja'] },
    jumlah() { return this.$store.getters['pos/jumlahItem'] }
  },
  methods: {
    async aturKas() {
      const v = window.prompt('Kas awal di laci hari ini (Rp)', this.$store.state.pos.kasAwal === null ? '' : String(this.$store.state.pos.kasAwal))
      if (v === null) return
      const n = this.$parseRp(v)
      try { this.$store.commit('pos/setKas', await api.setKas(n)) } catch (e) { window.alert(e.message) }
    },
    tambah(id) { this.$store.commit('pos/tambah', id) },
    kurangi(id) { this.$store.commit('pos/kurangi', id) },
    kosongkan() { this.$store.commit('pos/kosongkan') },
    bukaKelola() { this.kelola = { buka: true, sibuk: false, error: '', daftar: this.produk.map((x) => ({ id: x.id, nama: x.nama, harga: x.harga })) } },
    async simpanUbah(k) {
      this.kelola.error = ''; this.kelola.sibuk = true
      try { await this.$store.dispatch('ubahProduk', { id: k.id, nama: k.nama, harga: k.harga }) } catch (e) { this.kelola.error = e.message } finally { this.kelola.sibuk = false }
    },
    async hapus(k) {
      if (!window.confirm('Hapus produk "' + k.nama + '"?')) return
      this.kelola.error = ''; this.kelola.sibuk = true
      try { await this.$store.dispatch('hapusProduk', k.id); this.kelola.daftar = this.kelola.daftar.filter((x) => x.id !== k.id); this.$store.commit('pos/hapusItem', k.id) } catch (e) { this.kelola.error = e.message } finally { this.kelola.sibuk = false }
    },
    bukaTambah() { this.form = { nama: '', harga: null }; this.error = ''; this.modal = true },
    async simpanProduk() {
      this.error = ''; this.loading = true
      try {
        const data = await this.$store.dispatch('tambahProduk', { nama: this.form.nama, harga: this.form.harga })
        if (!data) throw new Error('Produk gagal ditambahkan')
        this.modal = false
      } catch (e) { this.error = e.message || 'Gagal menambahkan produk' } finally { this.loading = false }
    },
    scan() {
      if (!this.total) return
      this.$store.commit('pos/setMode', 'belanja')
      this.$router.push('/pic/scan')
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: #fff; min-height: 0; }
.head { padding: 8px 18px 14px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex: none; }
.outlet { font: 700 15px var(--font-display); }
.sesi { font: 400 11.5px var(--font-body); color: var(--muted); margin-top: 2px; }
.kanan { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.link-riwayat { font: 600 11.5px var(--font-body); color: var(--blue); text-decoration: none; }
.kas { font: 400 10.5px var(--font-body); color: var(--muted); }

.grid { flex: 1; overflow-y: auto; padding: 6px 18px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-content: start; }
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
.qty-wrap { display:flex; align-items:center; gap:3px; }
.qty-btn { width:22px; height:22px; border:1px solid var(--line); border-radius:var(--r-pill); background:#fff; color:var(--ink); cursor:pointer; font:700 13px var(--font-body); line-height:1; padding:0; }
.qty {
  min-width: 22px; height: 22px; border-radius: var(--r-pill);
  background: var(--blue); color: #fff; font: 700 11.5px var(--font-body);
  display: flex; align-items: center; justify-content: center; padding: 0 6px;
}
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

.product-head { padding: 12px 18px 4px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.product-head b { display:block; font-size:13px; }
.product-head span { display:block; margin-top:2px; font:400 11px var(--font-body); color:var(--muted); }
.btn-add { border:none; background:var(--blue); color:#fff; padding:9px 13px; border-radius:var(--r-sm); font:600 12px var(--font-body); cursor:pointer; }
.head-aksi { display:flex; gap:8px; }
.btn-ghost { border:1px solid var(--line); background:#fff; color:var(--ink); padding:9px 13px; border-radius:var(--r-sm); font:600 12px var(--font-body); cursor:pointer; }
.btn-bahaya { border:1px solid var(--coral); background:#fff; color:var(--coral); padding:9px 11px; border-radius:var(--r-sm); font:600 12px var(--font-body); cursor:pointer; }
.btn-bahaya:disabled { opacity:.6; cursor:not-allowed; }
.modal--lebar { width:min(520px,100%); max-height:calc(100vh - 40px); overflow-y:auto; }
.kelola-baris { display:flex; gap:6px; align-items:center; margin-bottom:8px; }
.kelola-baris .input { min-width:0; flex:1; }
.kelola-baris .input--harga { flex:0 0 92px; }
.btn-add:disabled { opacity:.6; cursor:not-allowed; }
.modal-overlay { position:fixed; inset:0; background:rgba(11,25,43,.45); display:flex; align-items:center; justify-content:center; padding:20px; z-index:20; }
.modal { width:min(420px,100%); background:#fff; border-radius:var(--r-lg); padding:22px; box-shadow:0 20px 60px rgba(0,0,0,.18); }
.modal h2 { margin:0; font-size:18px; }
.modal-sub { margin:5px 0 18px; font:400 12px/1.5 var(--font-body); color:var(--muted); }
.modal form { display:flex; flex-direction:column; gap:14px; }
.modal label { display:flex; flex-direction:column; gap:6px; font:600 12px var(--font-body); }
.input { border:1px solid var(--line); border-radius:var(--r-sm); padding:11px 12px; font:500 13px var(--font-body); outline:none; }
.input:focus { border-color:var(--blue); }
.error { margin:0; color:var(--coral); font:500 12px var(--font-body); }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; }
.btn-cancel { border:1px solid var(--line); background:#fff; padding:9px 13px; border-radius:var(--r-sm); font:600 12px var(--font-body); cursor:pointer; }
</style>

