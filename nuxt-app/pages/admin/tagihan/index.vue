<template>
  <div class="page">
    <div v-if="error" class="error">{{ error }}</div>
    <div class="kpi">
      <div v-for="k in kpi" :key="k.label" class="card kpi__box">
        <div class="kpi__label">{{ k.label }}</div>
        <div class="kpi__nilai display num" :style="'color:' + k.fg">{{ k.nilai }}</div>
        <div class="kpi__ket">{{ k.ket }}</div>
      </div>
    </div>

    <div class="card tabel">
      <div class="tabel__head">
        <span class="h display">Tunggakan per kelas — {{ bulanLabel }}</span>
        <div class="tabel__aksi">
          <nuxt-link to="/admin/laporan" class="btn-sm btn-sm--ghost">Lihat laporan</nuxt-link>
          <nuxt-link v-if="admin" to="/admin/tagihan/buat" class="btn-sm btn-sm--primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Buat tagihan
          </nuxt-link>
        </div>
      </div>

      <div class="baris baris--head">
        <div>KELAS</div><div>SISWA</div><div>SUDAH LUNAS</div><div>NILAI TUNGGAKAN</div><div>STATUS</div>
      </div>
      <div v-for="k in kelas" :key="k.kelas" class="baris">
        <div class="kelas">{{ k.kelas }}</div>
        <div class="muted num">{{ k.n }}</div>
        <div class="lunas">
          <span class="progress"><i :style="'width:' + k.lunas + '%; background:' + warna(k.lunas)"></i></span>
          <b class="num">{{ k.lunas }}%</b>
        </div>
        <div class="num nilai" :style="'color:' + (k.lunas >= 80 ? 'var(--ink)' : 'var(--coral)')">{{ k.tunggakan | rp }}</div>
        <div><span class="badge" :class="badge(k.lunas)">{{ statusLabel(k.lunas) }}</span></div>
      </div>
    </div>

    <div class="card tabel">
      <div class="tabel__head">
        <span class="h display">Daftar tagihan</span>
        <div class="tabel__aksi">
          <input v-model="q" class="cari" placeholder="Cari siswa / nama tagihan" @keyup.enter="muatDaftar" />
          <select v-model="filterStatus" class="cari" @change="muatDaftar">
            <option value="">Semua status</option><option value="belum_bayar">Belum bayar</option><option value="lunas">Lunas</option><option value="batal">Dibatalkan</option>
          </select>
          <button class="btn-sm btn-sm--ghost" @click="muatDaftar">Cari</button>
        </div>
      </div>
      <div v-if="pesan" class="ok-msg">{{ pesan }}</div>
      <div class="baris2 baris--head"><div>SISWA</div><div>TAGIHAN</div><div>NOMINAL</div><div>STATUS</div><div></div></div>
      <div v-if="!daftar.length" class="kosong">Tidak ada tagihan yang cocok.</div>
      <div v-for="t in daftar" :key="t.id" class="baris2">
        <div><b>{{ t.siswa }}</b><div class="muted">{{ t.kelas || '—' }}</div></div>
        <div>{{ t.nama }}<div class="muted">Jatuh tempo {{ tgl(t.jatuh_tempo) }}</div></div>
        <div class="num">{{ t.nominal | rp }}</div>
        <div><span class="badge" :class="t.status === 'lunas' ? 'badge--ok' : t.status === 'batal' ? 'badge--warn' : 'badge--bad'">{{ t.status === 'lunas' ? 'Lunas' : t.status === 'batal' ? 'Dibatalkan' : (t.menunggu_verifikasi ? 'Menunggu verifikasi' : 'Belum bayar') }}</span><div v-if="t.batal_alasan" class="muted">{{ t.batal_alasan }}</div></div>
        <div class="aksi-baris"><button v-if="admin && t.status === 'belum_bayar'" class="btn-sm btn-sm--ghost" :disabled="t.menunggu_verifikasi" @click="bukaUbah(t)">Ubah</button><button v-if="admin && t.status === 'belum_bayar'" class="btn-sm btn-sm--ghost" :disabled="t.menunggu_verifikasi" :title="t.menunggu_verifikasi ? 'Proses dulu pembayaran yang menunggu verifikasi' : ''" @click="batalkan(t)">Batalkan</button></div>
      </div>
      <div v-if="daftar.length >= 200" class="muted" style="padding:10px 20px">Menampilkan 200 tagihan terbaru. Persempit dengan pencarian.</div>
    </div>

    <div v-if="ubah.buka" class="overlay" @click.self="ubah.buka = false">
      <form class="modal" @submit.prevent="simpanUbah">
        <h2 class="display">Ubah tagihan</h2>
        <p class="muted">{{ ubah.siswa }} · hanya tagihan yang belum dibayar dan tidak sedang menunggu verifikasi.</p>
        <label>Nama tagihan<input v-model="ubah.nama" class="cari" required maxlength="120"></label>
        <label>Nominal (Rp)<input v-model.number="ubah.nominal" type="number" min="1" class="cari" required></label>
        <label>Jatuh tempo<input v-model="ubah.jatuh_tempo" type="date" class="cari" required></label>
        <p v-if="ubah.error" class="error">{{ ubah.error }}</p>
        <div class="modal__aksi"><button type="button" class="btn-sm btn-sm--ghost" @click="ubah.buka = false">Batal</button><button class="btn-sm btn-sm--primary" :disabled="ubah.loading">{{ ubah.loading ? 'Menyimpan…' : 'Simpan perubahan' }}</button></div>
      </form>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'
export default {
  middleware: ['auth', 'admin'],
  layout:'admin', data(){return{ubah:{buka:false,id:null,siswa:'',nama:'',nominal:null,jatuh_tempo:'',error:'',loading:false},daftar:[],q:'',filterStatus:'',pesan:'',ring:{terbit:0,lunas:0,tunggakan:0,invoice:0,invoice_lunas:0,menunggu_verifikasi:0,permintaan_menunggu:0},kelas:[],error:''}},
  computed:{bulanLabel(){return new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'Asia/Jakarta'})},admin(){return this.$store.getters['admin/admin']},kpi(){const r=this.ring;return[
    {label:'Tagihan terbit',nilai:this.$rp(r.terbit),ket:r.invoice+' invoice',fg:'var(--ink)'},
    {label:'Sudah lunas',nilai:this.$rp(r.lunas),ket:r.invoice?Math.round(r.invoice_lunas/r.invoice*100)+'% invoice':'0%',fg:'var(--green)'},
    {label:'Menunggu verifikasi',nilai:this.$rp(r.menunggu_verifikasi),ket:r.permintaan_menunggu+' permintaan',fg:'var(--sand-ink)'},
    {label:'Tunggakan',nilai:this.$rp(r.tunggakan),ket:r.invoice-r.invoice_lunas+' invoice belum lunas',fg:'var(--coral)'}
  ]}},
  async mounted(){await Promise.all([this.muat(),this.muatDaftar()])},
  methods:{bukaUbah(t){this.ubah={buka:true,id:t.id,siswa:t.siswa,nama:t.nama,nominal:t.nominal,jatuh_tempo:String(t.jatuh_tempo||'').slice(0,10),error:'',loading:false}},async simpanUbah(){const u=this.ubah;u.loading=true;u.error='';try{await api.ubahTagihan(u.id,{nama:u.nama,nominal:u.nominal,jatuh_tempo:u.jatuh_tempo});u.buka=false;this.pesan='Tagihan diperbarui.';await Promise.all([this.muat(),this.muatDaftar()])}catch(e){u.error=e.message}finally{u.loading=false}},tgl(v){if(!v)return '—';const d=new Date(v);return isNaN(d)?String(v).slice(0,10):d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'})},async muatDaftar(){try{const p={};if(this.q.trim())p.q=this.q.trim();if(this.filterStatus)p.status=this.filterStatus;this.daftar=(await api.daftarTagihan(p)).tagihan}catch(e){this.error=e.message}},async batalkan(t){const alasan=window.prompt('Batalkan tagihan "'+t.nama+'" untuk '+t.siswa+' (Rp '+t.nominal.toLocaleString('id-ID')+')?\n\nAlasan pembatalan (wajib, min. 5 karakter):');if(alasan===null)return;this.error='';this.pesan='';try{await api.batalTagihan(t.id,alasan);this.pesan='Tagihan dibatalkan.';await Promise.all([this.muat(),this.muatDaftar()])}catch(e){this.error=e.message}},async muat(){try{const d=await api.tagihanRingkasan();this.ring=d.total;this.kelas=(d.kelas||[]).map(x=>({kelas:x.kelas,n:x.siswa,lunas:x.persen_lunas,tunggakan:x.tunggakan}))}catch(e){this.error=e.message}},warna(p){return p>=80?'var(--green)':p>=50?'var(--sand)':'var(--coral)'},statusLabel(p){return p>=80?'Aman':p>=50?'Perlu perhatian':'Kritis'},badge(p){return p>=80?'badge--ok':p>=50?'badge--warn':'badge--bad'}}
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi__box { padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.kpi__label { font: 500 12px var(--font-body); color: var(--muted); }
.kpi__nilai { font: 800 24px var(--font-display); letter-spacing: -.02em; }
.kpi__ket { font: 400 11.5px var(--font-body); color: var(--muted); }

.tabel { overflow: hidden; }
.tabel__head { padding: 16px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.h { font: 700 14px var(--font-display); }
.tabel__aksi { display: flex; gap: 9px; }
.btn-sm { border: none; border-radius: var(--r-sm); font: 600 12.5px var(--font-body); padding: 8px 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.btn-sm--ghost { background: #fff; border: 1px solid var(--line); color: var(--ink); }
.btn-sm--primary { background: var(--blue); color: #fff; }
.btn-sm--primary:hover { background: var(--blue-dark); color: #fff; }

.aksi-baris { display:flex; gap:6px; }
.overlay { position:fixed; inset:0; background:rgba(11,25,43,.45); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; }
.modal { width:min(420px,100%); background:#fff; border-radius:12px; padding:22px; display:flex; flex-direction:column; gap:12px; box-shadow:0 20px 60px rgba(0,0,0,.18); }
.modal h2 { margin:0; font-size:18px; }
.modal label { display:flex; flex-direction:column; gap:6px; font:600 12px var(--font-body); }
.modal__aksi { display:flex; justify-content:flex-end; gap:8px; }
.cari { border:1px solid var(--line); border-radius:var(--r-sm); padding:8px 10px; font:500 12.5px var(--font-body); }
.ok-msg { padding:10px 20px; background:var(--bg); font:600 12.5px var(--font-body); color:var(--green); }
.kosong { padding:22px 20px; color:var(--muted); font:400 13px var(--font-body); }
.baris2 { display:grid; grid-template-columns:1.2fr 1.4fr .9fr 1.2fr 1.1fr; gap:10px; padding:12px 20px; border-top:1px solid var(--bg); align-items:center; font:400 13px var(--font-body); }
.baris2 .muted { font:400 11.5px var(--font-body); color:var(--muted); }
.baris { display: grid; grid-template-columns: 1fr 1fr 1.2fr 1.2fr 1fr; padding: 14px 20px; border-top: 1px solid var(--bg); align-items: center; }
.baris--head { padding: 11px 20px; background: var(--bg); border-top: none; font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .03em; }
.kelas { font: 600 13px var(--font-body); }
.muted { font: 400 13px var(--font-body); color: var(--muted); }
.lunas { display: flex; align-items: center; gap: 10px; }
.progress { width: 70px; height: 6px; border-radius: var(--r-pill); background: var(--bg); overflow: hidden; }
.progress i { display: block; height: 100%; border-radius: var(--r-pill); }
.lunas b { font: 500 12.5px var(--font-body); }
.nilai { font: 600 13px var(--font-body); }
</style>

<style scoped>.error{padding:12px;color:var(--coral);font:400 12px var(--font-body)}.btn-sm:disabled{opacity:.5;cursor:not-allowed}</style>

