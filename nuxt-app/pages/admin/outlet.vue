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
        </div>
        <div class="outlet__stat">
          <div><span>Transaksi</span><b class="display num">{{ o.trx }}</b></div>
          <div><span>Omzet hari ini</span><b class="display num">{{ o.omzet | rp }}</b></div>
        </div>
      </button>
    </div>

    <div class="kanan">
    <div class="card tabel">
      <div class="tabel__head">
        <div>
          <div class="h display">{{ outlets[outlet].nama }}</div>
          <div class="sub">Katalog produk dan paket</div>
        </div>
        <button v-if="admin" class="btn-sm" @click="tambahProduk">Tambah produk</button>
      </div>
      <div class="baris baris--head">
        <div>NAMA</div><div>KATEGORI</div><div>HARGA JUAL</div><div v-if="admin"></div>
      </div>
      <div v-for="p in produk" :key="p.id" class="baris">
        <div class="nama">
          <span class="tile">{{ p.tile }}</span>
          <span><b>{{ p.nama }}</b><i>{{ p.ket }}</i></span>
        </div>
        <div class="muted">{{ p.kategori }}</div>
        <div class="num tebal">{{ p.harga | rp }}</div>
        <div v-if="admin" class="aksi"><button class="btn-mini" @click="ubahProduk(p)">Ubah</button><button class="btn-mini btn-mini--bahaya" @click="hapusProduk(p)">Hapus</button></div>
      </div>
      <div v-if="!produk.length" class="kosong">Belum ada produk di outlet ini.</div>
    </div>

    <div class="card tabel kas">
      <div class="tabel__head"><div><div class="h display">Tutup kas hari ini</div><div class="sub">Hitungan uang fisik di laci yang dikirim kasir tiap outlet.</div></div></div>
      <div class="baris baris--kas baris--head"><div>OUTLET</div><div>DIHARAPKAN</div><div>FISIK</div><div>SELISIH</div></div>
      <div v-for="k in tutupKas" :key="k.outlet" class="baris baris--kas">
        <div class="nama"><b>{{ k.nama_outlet }}</b></div>
        <template v-if="k.ditutup"><div class="num">{{ k.diharapkan | rp }}</div><div class="num">{{ k.kas_fisik | rp }}</div><div class="num tebal" :style="'color:' + (k.selisih === 0 ? 'var(--green)' : 'var(--coral)')">{{ k.selisih === 0 ? 'Pas' : (k.selisih > 0 ? '+' : '−') + 'Rp ' + Math.abs(k.selisih).toLocaleString('id-ID') }}</div></template>
        <div v-else class="muted" style="grid-column: span 3">Belum ditutup</div>
      </div>
    </div>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'
export default {
  middleware: ['auth', 'admin'],layout:'admin',data(){return{tutupKas:[],data:null,users:[],loading:false,error:''}},computed:{admin(){return this.$store.getters['admin/admin']},outlet(){return this.$store.state.admin.outlet},outlets(){const map={kantin_utama:'Kantin Utama',kantin_b:'Kantin Blok B',koperasi:'Koperasi Sekolah'};const d=(this.data&&this.data.outlets)||[];return Object.keys(map).map(k=>{const x=d.find(v=>v.outlet===k)||{nilai:0,transaksi:0};const pic=this.users.find(u=>u.role==='pic'&&u.outlet===k);return{key:k,nama:map[k],jam:'Jam operasional diatur sekolah',pic:pic?pic.nama:'Belum ada PIC',trx:x.transaksi,omzet:x.nilai,buka:true}})},produk(){const key=this.outlets[this.outlet]?.key;return this.$store.state.produk.filter(p=>String(p.outlet)===String(key))}},async mounted(){await this.muat()},methods:{async muat(){this.loading=true;try{const [d,u,tk]=await Promise.all([api.dashboard(),api.adminUsers(),api.tutupKasAdmin()]);this.data=d;this.tutupKas=tk.outlets||[];this.users=u.users||u||[];await this.$store.dispatch('muatProduk')}catch(e){this.error=e.message}finally{this.loading=false}},setOutlet(i){this.$store.commit('admin/setOutlet',i)},stokWarna(s){return s===0?'var(--coral)':s<20?'var(--sand-ink)':'var(--ink)'},async ubahProduk(p){const nama=window.prompt('Nama produk',p.nama);if(nama===null)return;const harga=Number(window.prompt('Harga (rupiah)',p.harga));if(!nama.trim()||!Number.isInteger(harga)||harga<=0){alert('Nama atau harga tidak valid');return}try{await api.ubahProduk(p.id,nama.trim(),harga);await this.muat()}catch(e){alert(e.message)}},async hapusProduk(p){if(!window.confirm('Hapus produk "'+p.nama+'"? Riwayat transaksi lama tidak berubah.'))return;try{await api.hapusProduk(p.id);await this.muat()}catch(e){alert(e.message)}},async tambahProduk(){const nama=window.prompt('Nama produk');if(!nama)return;const harga=Number(window.prompt('Harga (rupiah)'));if(!Number.isInteger(harga)||harga<=0){alert('Harga tidak valid');return}try{await this.$store.dispatch('tambahProduk',{nama,harga,outlet:this.outlets[this.outlet].key});await this.muat()}catch(e){alert(e.message)}}}}
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

.baris--kas { grid-template-columns: 1.4fr 1fr 1fr 1fr; }
.kanan { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.kosong { padding: 18px 20px; color: var(--muted); font: 400 13px var(--font-body); }
.aksi { display: flex; gap: 6px; justify-content: flex-end; }
.btn-mini { border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 5px 10px; font: 600 11.5px var(--font-body); cursor: pointer; color: var(--blue); }
.btn-mini--bahaya { color: var(--coral); }
.baris { display: grid; grid-template-columns: 2fr 1fr 1fr auto; padding: 14px 20px; border-top: 1px solid var(--bg); align-items: center; }
.baris--head { padding: 11px 20px; background: var(--bg); border-top: none; font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .03em; }
.nama { display: flex; align-items: center; gap: 11px; }
.tile { width: 30px; height: 30px; border-radius: var(--r-sm); background: var(--bg); color: var(--muted); display: flex; align-items: center; justify-content: center; font: 700 12px var(--font-display); flex: none; }
.nama b { display: block; font: 600 13px var(--font-body); }
.nama i { display: block; font: 400 11px var(--font-body); color: var(--muted); font-style: normal; margin-top: 1px; }
.muted { font: 400 12.5px var(--font-body); color: var(--muted); }
.tebal { font: 600 13px var(--font-body); }
</style>

