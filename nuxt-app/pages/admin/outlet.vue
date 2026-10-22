<template>
  <div class="page">
    <div class="kiri">
      <button
        v-for="(o, i) in outlets"
        :key="o.nama"
        class="card outlet"
        :class="outlet === i ? 'is-on' : ''"
        @click="setOutlet(i)"
      >
        <div class="outlet__top">
          <div>
            <div class="outlet__nama display">{{ o.nama }}</div>
            <div class="outlet__jam">{{ o.jam }} · PIC {{ o.pic }}</div>
          </div>
          <span class="badge" :class="o.buka ? 'badge--ok' : 'badge--off'">{{ o.buka ? 'Sesi buka' : 'Tutup' }}</span>
        </div>
        <div class="outlet__stat">
          <div><span>Transaksi</span><b class="display num">{{ o.trx }}</b></div>
          <div><span>Omzet hari ini</span><b class="display num">{{ o.omzet | rp }}</b></div>
        </div>
      </button>
    </div>

    <div class="card tabel">
      <div class="tabel__head">
        <div>
          <div class="h display">{{ outlets[outlet].nama }}</div>
          <div class="sub">Katalog produk dan paket</div>
        </div>
        <button v-if="admin" type="button" class="btn-sm" @click="bukaTambah">Tambah produk</button>
      </div>
      <div class="baris baris--head" :class="admin ? 'baris--aksi' : ''">
        <div>NAMA</div><div>KATEGORI</div><div>HARGA JUAL</div><div>STOK</div><div>STATUS</div>
        <div v-if="admin" class="kanan">AKSI</div>
      </div>
      <div v-if="!produk.length" class="kosong">
        <b>Belum ada produk di katalog ini.</b>
        <span v-if="admin">Klik “Tambah produk” untuk mulai mengisi katalog.</span>
      </div>
      <div v-for="p in produk" :key="p.id" class="baris" :class="admin ? 'baris--aksi' : ''">
        <div class="nama">
          <span class="tile">{{ p.tile }}</span>
          <span><b>{{ p.nama }}</b><i>{{ p.ket }}</i></span>
        </div>
        <div class="muted">{{ p.kategori }}</div>
        <div class="num tebal">{{ p.harga | rp }}</div>
        <div class="num tebal" :style="'color:' + stokWarna(p.stok)">{{ p.stok === 0 ? 'Habis' : p.stok }}</div>
        <div><span class="badge" :class="p.stok === 0 ? 'badge--off' : 'badge--ok'">{{ p.stok === 0 ? 'Nonaktif' : 'Aktif' }}</span></div>
        <div v-if="admin" class="aksi">
          <button type="button" class="ikon" :aria-label="'Ubah ' + p.nama" title="Ubah" @click="bukaUbah(p)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
          </button>
          <button type="button" class="ikon ikon--bahaya" :aria-label="'Hapus ' + p.nama" title="Hapus" @click="hapus = p">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" /><path d="M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" /><path d="M10 11v6M14 11v6" /></svg>
          </button>
        </div>
      </div>
    </div>

    <FormProdukModal
      v-if="formOn"
      :key="edit ? edit.id : 'baru'"
      :produk="edit"
      :outlet-nama="outlets[outlet].nama"
      :outlet-id="produkOutletId"
      :contoh-kategori="produkOutletId === 1 ? 'ATK' : 'Minuman'"
      @tutup="tutupForm"
      @berhasil="produkTersimpan"
    />
    <KonfirmasiHapusModal
      v-if="hapus"
      judul="Hapus produk?"
      tombol="Hapus produk"
      @tutup="hapus = null"
      @hapus="hapusProduk"
    >
      <b>{{ hapus.nama }}</b> akan dihapus dari katalog {{ outlets[outlet].nama }} dan tidak muncul lagi di kasir. Tindakan ini tidak bisa dibatalkan.
    </KonfirmasiHapusModal>
    <ToastNotif v-if="toast" :key="toast.id" :pesan="toast.pesan" @tutup="toast = null" />
  </div>
</template>

<script>
export default {
  layout: 'admin',
  data() {
    return {
      formOn: false,
      edit: null, // produk yang sedang diubah (null = mode tambah)
      hapus: null, // produk yang menunggu konfirmasi hapus
      toast: null,
      outlets: [
        { nama: 'Kantin Utama', jam: '07.00–14.00', pic: 'Bu Ratna', trx: 214, omzet: 1840000, buka: true },
        { nama: 'Kantin Blok B', jam: '09.00–13.30', pic: 'Bu Lilis', trx: 97, omzet: 760000, buka: false },
        { nama: 'Koperasi Sekolah', jam: '07.00–15.00', pic: 'Pak Yusuf', trx: 36, omzet: 385000, buka: true }
      ]
    }
  },
  computed: {
    admin() { return this.$store.getters['admin/admin'] },
    outlet() { return this.$store.state.admin.outlet },
    produkOutletId() { return this.outlet === 2 ? 1 : 0 },
    produk() { return this.$store.getters.produkOutlet(this.produkOutletId) }
  },
  methods: {
    setOutlet(i) { this.$store.commit('admin/setOutlet', i) },
    stokWarna(s) { return s === 0 ? 'var(--coral)' : s < 20 ? 'var(--sand-ink)' : 'var(--ink)' },
    bukaTambah() {
      this.edit = null
      this.formOn = true
    },
    bukaUbah(p) {
      this.edit = p
      this.formOn = true
    },
    tutupForm() {
      this.formOn = false
      this.edit = null
    },
    produkTersimpan({ nama, mode }) {
      const outlet = this.outlets[this.outlet].nama
      const pesan = mode === 'ubah' ? nama + ' diperbarui.' : nama + ' ditambahkan ke ' + outlet + '.'
      this.toast = { id: Date.now(), pesan }
    },
    hapusProduk() {
      const { id, nama } = this.hapus
      this.$store.dispatch('hapusProduk', id)
      this.hapus = null
      this.toast = { id: Date.now(), pesan: nama + ' dihapus dari ' + this.outlets[this.outlet].nama + '.' }
    }
  }
}
</script>

<style scoped>
.page { display: grid; grid-template-columns: 330px 1fr; gap: 16px; align-items: start; }
.kiri { display: flex; flex-direction: column; gap: 12px; }
.outlet { padding: 16px; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 12px; background: #fff; }
.outlet.is-on { border-color: var(--blue); }
.outlet__top { display: flex; align-items: flex-start; justify-content: space-between; }
.outlet__nama { font: 700 14px var(--font-display); }
.outlet__jam { font: 400 11.5px var(--font-body); color: var(--muted); margin-top: 3px; }
.outlet__stat { display: flex; gap: 20px; }
.outlet__stat span { display: block; font: 400 11px var(--font-body); color: var(--muted); }
.outlet__stat b { display: block; font: 700 14px var(--font-display); margin-top: 2px; }

.tabel { overflow: hidden; }
.tabel__head { padding: 16px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; }
.h { font: 700 14px var(--font-display); }
.sub { font: 400 12px var(--font-body); color: var(--muted); margin-top: 3px; }
.btn-sm { border: none; background: var(--blue); color: #fff; font: 600 12.5px var(--font-body); padding: 9px 15px; border-radius: var(--r-sm); cursor: pointer; }

.baris { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr .8fr; padding: 14px 20px; border-top: 1px solid var(--bg); align-items: center; }
.baris--aksi { grid-template-columns: 2fr 1fr 1fr 1fr .8fr 84px; }
.baris--head { padding: 11px 20px; background: var(--bg); border-top: none; font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .03em; }
.nama { display: flex; align-items: center; gap: 11px; }
.tile { width: 30px; height: 30px; border-radius: var(--r-sm); background: var(--bg); color: var(--muted); display: flex; align-items: center; justify-content: center; font: 700 12px var(--font-display); flex: none; }
.nama b { display: block; font: 600 13px var(--font-body); }
.nama i { display: block; font: 400 11px var(--font-body); color: var(--muted); font-style: normal; margin-top: 1px; }
.muted { font: 400 12.5px var(--font-body); color: var(--muted); }
.tebal { font: 600 13px var(--font-body); }
.kanan { text-align: right; }
.aksi { display: flex; justify-content: flex-end; gap: 4px; }
.ikon {
  width: 30px; height: 30px; border: none; background: transparent; color: var(--muted);
  border-radius: var(--r-sm); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.ikon:hover { background: var(--bg); color: var(--ink); }
.ikon--bahaya:hover { background: rgba(223, 74, 55, .1); color: var(--coral); }
.ikon:focus-visible { outline: 2px solid var(--blue); outline-offset: 1px; }
.kosong { padding: 36px 20px; text-align: center; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--bg); }
.kosong b { font: 600 13px var(--font-body); }
.kosong span { font: 400 12px var(--font-body); color: var(--muted); }
</style>
