<template>
  <div class="page">
    <div class="card kolom">
      <div class="h display">Rekening tujuan top-up</div>
      <div class="rek">
        <template v-if="info">
          <div><span>Bank</span><b>{{ info.rekening.bank }}</b></div>
          <div><span>Nomor rekening</span><b class="num">{{ info.rekening.nomor }}</b></div>
          <div><span>Atas nama</span><b>{{ info.rekening.atas_nama }}</b></div>
        </template>
        <div v-else><span>Memuat…</span></div>
      </div>
      <p class="catatan">Rekening diatur lewat environment server (<code>REKENING_BANK</code>, <code>REKENING_NOMOR</code>, <code>REKENING_ATAS_NAMA</code>). Ubah di hosting lalu restart backend.</p>

      <div class="h display">Aturan kode unik</div>
      <div class="aturan">
        <div v-for="a in aturan" :key="a.label" class="aturan__row">
          <div>
            <div class="aturan__label">{{ a.label }}</div>
            <div class="aturan__ket">{{ a.ket }}</div>
          </div>
          <b class="display num">{{ a.nilai }}</b>
        </div>
      </div>
    </div>

    <div class="card kolom">
      <div v-if="error" class="error">{{ error }}</div>
      <div class="kolom__head">
        <span class="h display">Akun PIC &amp; hak akses</span>
        <nuxt-link v-if="admin" to="/admin/siswa" class="btn-sm">Kelola akun</nuxt-link>
      </div>
      <div v-for="u in akun" :key="u.nama" class="akun">
        <span class="av">{{ inisial(u.nama) }}</span>
        <span class="akun__id">
          <b>{{ u.nama }}</b>
          <i>{{ label(u) }}</i>
        </span>
        <span class="badge badge--ok">Aktif</span>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'
export default {
  middleware: ['auth', 'admin'],layout:'admin',data(){return{akun:[],error:'',aturan:[{label:'Kode unik',ket:'3 digit acak, tidak bentrok dengan permintaan menunggu lain',nilai:'100–999'},{label:'Nominal transfer',ket:'Harus sama persis dengan nominal + kode unik',nilai:'Persis'},{label:'Verifikasi',ket:'Manual oleh admin dengan mencocokkan mutasi rekening',nilai:'Manual'}]}},computed:{admin(){return this.$store.getters['admin/admin']},info(){return this.$store.state.infoPembayaran}},async mounted(){this.$store.dispatch('muatInfoPembayaran').catch(()=>{});try{const d=await api.adminUsers();this.akun=(d.users||d||[]).filter(u=>['admin','pic'].includes(u.role))}catch(e){this.error=e.message}},methods:{inisial(n){return String(n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()},label(u){if(u.role==='admin')return'Admin Yayasan';return'PIC · '+({kantin_utama:'Kantin Utama',kantin_b:'Kantin Blok B',koperasi:'Koperasi Sekolah'}[u.outlet]||u.outlet||'Outlet')}}}
</script>

<style scoped>
.page { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.kolom { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.kolom__head { display: flex; align-items: center; justify-content: space-between; }
.h { font: 700 14px var(--font-display); }
.btn-sm { border: none; background: var(--blue); color: #fff; font: 600 12.5px var(--font-body); padding: 9px 15px; border-radius: var(--r-sm); cursor: pointer; }

.catatan { margin: -6px 0 0; font: 400 11.5px/1.5 var(--font-body); color: var(--muted); }
.rek { border: 1px solid var(--line); border-radius: var(--r-md); padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.rek div, .aturan__row { display: flex; justify-content: space-between; }
.rek span { font: 400 12.5px var(--font-body); color: var(--muted); }
.rek b { font: 600 12.5px var(--font-body); }

.aturan { display: flex; flex-direction: column; gap: 12px; }
.aturan__row { align-items: center; border: 1px solid var(--line); border-radius: var(--r-sm); padding: 13px 16px; }
.aturan__label { font: 600 12.5px var(--font-body); }
.aturan__ket { font: 400 11.5px var(--font-body); color: var(--muted); margin-top: 2px; }
.aturan__row b { font: 700 13px var(--font-display); color: var(--blue); }

.akun { display: flex; align-items: center; gap: 13px; border: 1px solid var(--line); border-radius: var(--r-sm); padding: 13px 16px; }
.av { width: 34px; height: 34px; border-radius: var(--r-pill); background: var(--blue-soft); color: var(--blue); display: flex; align-items: center; justify-content: center; font: 700 12px var(--font-display); flex: none; }
.akun__id { flex: 1; }
.akun__id b { display: block; font: 600 13px var(--font-body); }
.akun__id i { display: block; font: 400 11.5px var(--font-body); color: var(--muted); font-style: normal; margin-top: 1px; }
</style>
<style scoped>.error{color:var(--coral);font:400 12px var(--font-body)}.btn-sm{display:inline-flex;align-items:center}</style>

