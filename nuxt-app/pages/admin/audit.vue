<template>
  <div class="card tabel">
    <div class="tabel__head"><div><div class="h display">Audit log</div><div class="sub">Jejak aksi autentikasi, uang, akun, tagihan, produk, verifikasi, dan POS.</div></div><div class="aksi-head"><button class="btn-sm" @click="muat(true)" :disabled="loading">{{ loading ? 'Memuat…' : 'Refresh' }}</button><button class="btn-sm" @click="ekspor">Ekspor CSV</button></div></div>
    <div class="baris baris--head"><div>WAKTU</div><div>AKTOR</div><div>AKSI</div><div>PERUBAHAN</div><div>REFERENSI</div><div>IP</div></div>
    <div v-for="a in rows" :key="a.id" class="baris"><div class="muted num">{{ a.waktu | waktu }}</div><div><b>{{ a.aktor }}</b><i>{{ a.peran }}</i></div><div><span class="aksi" :class="kelasAksi(a.aksi)">{{ a.aksi }}</span></div><div class="ubah">{{ a.perubahan }}</div><div class="muted num">{{ a.ref_tabel }}{{ a.ref_id ? ' #' + a.ref_id : '' }}</div><div class="muted num">{{ a.ip }}</div></div>
    <div v-if="!loading && !rows.length" class="empty">Belum ada aktivitas tercatat.</div>
    <div v-if="rows.length && hasMore" class="more"><button class="btn-sm" @click="muat(false)" :disabled="loading">Muat lebih lama</button></div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>
<script>
import { api, BASE_URL, getToken } from '~/plugins/api'
export default {
  middleware: ['auth', 'admin'],
  layout:'admin',
  data(){return{rows:[],loading:false,error:'',hasMore:false,nextBeforeId:null,merah:['TOLAK_TOPUP','PIN_GAGAL','BLOKIR_KARTU','LOGIN_GAGAL'],biru:['SETUJUI_TOPUP','UBAH_PRODUK','TERBIT_TAGIHAN','BUAT_AKUN','TRANSAKSI_POS','AMBIL_TUNAI','BAYAR_TAGIHAN','LOGIN_BERHASIL']}},
  async mounted(){await this.muat(true)},
  methods:{
    async muat(reset){
      this.loading=true;this.error='';
      try{
        const d=await api.audit(200,reset?null:this.nextBeforeId);
        const list=d.audit||[];
        this.rows=reset?list:this.rows.concat(list);
        this.hasMore=!!d.has_more;
        this.nextBeforeId=d.next_before_id||null;
      }catch(e){this.error=e.message}finally{this.loading=false}
    },
    kelasAksi(a){if(this.merah.indexOf(a)>=0)return'aksi--merah';if(this.biru.indexOf(a)>=0)return'aksi--biru';return''},
    async ekspor(){const r=await fetch(BASE_URL+'/admin/audit.csv',{headers:{Authorization:'Bearer '+getToken()}});if(!r.ok){this.error='Gagal mengekspor audit log';return}const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='finka-audit-log.csv';a.click();URL.revokeObjectURL(url)}
  }
}
</script>
<style scoped>
.tabel{overflow:hidden}.tabel__head{padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px}.aksi-head{display:flex;gap:8px}.more{padding:14px 20px;text-align:center;border-top:1px solid var(--bg)}.h{font:700 14px var(--font-display)}.sub{font:400 12px var(--font-body);color:var(--muted);margin-top:3px}.btn-sm{border:1px solid var(--line);background:#fff;color:var(--ink);font:600 12.5px var(--font-body);padding:9px 15px;border-radius:var(--r-sm);cursor:pointer}.baris{display:grid;grid-template-columns:.9fr 1.1fr 1.4fr 1.6fr 1fr .8fr;padding:13px 20px;border-top:1px solid var(--bg);align-items:center}.baris--head{padding:11px 20px;background:var(--bg);border-top:none;font:600 11.5px var(--font-body);color:var(--muted)}.muted{font:400 12.5px var(--font-body);color:var(--muted)}.baris b{display:block;font:600 12.5px var(--font-body)}.baris i{display:block;font:400 11px var(--font-body);color:var(--muted);font-style:normal;margin-top:1px}.aksi{background:var(--bg);color:var(--muted);font:600 11px var(--font-body);padding:5px 10px;border-radius:6px}.aksi--merah{background:rgba(223,74,55,.1);color:var(--coral)}.aksi--biru{background:var(--blue-soft);color:var(--blue)}.ubah{font:400 12.5px var(--font-body)}.empty,.error{padding:24px;text-align:center;color:var(--muted);font:400 12px var(--font-body)}.error{color:var(--coral)}
</style>

