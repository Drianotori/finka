<template>
  <div class="page">
    <div v-if="error" class="alert alert--bad"><div class="alert__ik">!</div><div class="alert__body"><div class="alert__judul display">Dashboard tidak dapat dimuat</div><div class="alert__ket">{{ error }}</div></div><button class="alert__aksi" @click="muatSemua">Coba lagi</button></div>
    <div v-else class="alert" :class="data && data.selisih === 0 ? 'alert--ok' : 'alert--bad'">
      <div class="alert__ik">{{ data && data.selisih === 0 ? '✓' : '!' }}</div><div class="alert__body"><div class="alert__judul display">{{ data && data.selisih === 0 ? 'Rekonsiliasi hari ini seimbang' : 'Rekonsiliasi hari ini memiliki selisih' }}</div><div class="alert__ket">{{ data ? 'Selisih: ' + $rp(data.selisih) + ' · Uang masuk − uang keluar − perubahan saldo agregat' : 'Memuat data…' }}</div></div><nuxt-link to="/admin/laporan" class="alert__aksi">Laporan</nuxt-link>
    </div>

    <div class="kpi">
      <div v-for="k in kpi" :key="k.label" class="card kpi__box">
        <div class="kpi__head">
          <span>{{ k.label }}</span>
          <i :style="'background:' + k.bg"></i>
        </div>
        <div class="kpi__nilai display num">{{ k.nilai }}</div>
        <div class="kpi__delta"><b :style="'color:' + (k.hijau ? 'var(--green)' : 'var(--muted)')">{{ k.delta }}</b> {{ k.ket }}</div>
      </div>
    </div>

    <div class="split">
      <div class="card chart">
        <div class="chart__head">
          <div>
            <div class="h display">Arus uang 14 hari terakhir</div>
            <div class="sub">Uang masuk dan keluar aktual · 14 hari</div>
          </div>
          <div class="legend">
            <span><i style="background: var(--blue)"></i>Masuk</span>
            <span><i style="background: var(--sand)"></i>Keluar</span>
          </div>
        </div>
        <div v-if="chart.length" class="bars">
          <div v-for="(c, i) in chart" :key="c.tanggal" class="bar" :title="c.tooltip">
            <div class="bar__pair">
              <i :style="'height:' + c.masuk + '%; background: var(--blue)'"></i>
              <i :style="'height:' + c.keluar + '%; background: var(--sand)'"></i>
            </div>
            <span class="num">{{ c.hari }}</span>
          </div>
        </div>
        <div v-else class="chart-empty">Belum ada transaksi pada periode 14 hari ini.</div>
      </div>

      <div class="kolom">
        <div class="card panel">
          <div class="panel__head">
            <span class="h display">Verifikasi pembayaran</span>
            <nuxt-link to="/admin/verifikasi" class="link">Buka</nuxt-link>
          </div>
          <div class="panel__angka">
            <b class="display num">{{ menunggu.length }}</b>
            <span>permintaan menunggu</span>
          </div>
          <div class="antrean">
            <div v-for="a in menunggu.slice(0, 3)" :key="a.id" class="antrean__row">
              <span class="av">{{ inisial(a.siswa) }}</span>
              <span class="antrean__id"><b>{{ a.siswa }}</b><i>{{ a.waktu | waktu }}</i></span>
              <b class="num">{{ (a.dasar + a.kode) | rp }}</b>
            </div>
          </div>
        </div>

        <div class="card panel">
          <div class="panel__head"><span class="h display">Transaksi per outlet hari ini</span><nuxt-link to="/admin/outlet" class="link">Buka</nuxt-link></div>
          <div v-for="o in outlets" :key="o.nama" class="outlet">
            <div class="outlet__row"><span>{{ o.nama }}</span><b class="num">{{ o.nilai | rp }}</b></div>
            <div class="outlet__meta"><span>{{ o.transaksi }} transaksi</span><span>{{ o.pct }}%</span></div>
            <div class="progress"><i :style="'width:' + o.pct + '%'"></i></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'
export default {
  middleware: ['auth', 'admin'],
  layout:'admin',
  data(){return{data:null,loading:false,error:''}},
  computed:{
    menunggu(){return this.$store.getters['admin/menunggu']},
    kpi(){const d=this.data||{};return [
      {label:'Uang masuk hari ini',nilai:this.$rp(d.uang_masuk||0),delta:'Aktual',ket:String(d.transaksi_tagihan||0)+' pembayaran tagihan',hijau:true,bg:'var(--blue-soft)'},
      {label:'Uang keluar hari ini',nilai:this.$rp(d.uang_keluar||0),delta:'Aktual',ket:'Debit ledger + settlement tagihan',bg:'rgba(192,169,127,.2)'},
      {label:'Saldo mengendap',nilai:this.$rp(d.saldo_mengendap||0),delta:'Aktual',ket:'Saldo seluruh siswa',bg:'rgba(26,128,64,.1)'},
      {label:'Transaksi hari ini',nilai:String(d.transaksi_hari_ini||0),delta:'Pembayaran',ket:String(d.antrean_verifikasi||0)+' menunggu',bg:'var(--bg)'}
    ]},
    chart(){const rows=(this.data&&this.data.chart)||[];let max=0;rows.forEach(x=>{max=Math.max(max,Number(x.masuk)||0,Number(x.keluar)||0)});return rows.map(x=>{const masuk=Number(x.masuk)||0,keluar=Number(x.keluar)||0;return{tanggal:x.tanggal,hari:x.tanggal.slice(8),masuk:max?Math.round(masuk/max*100):0,keluar:max?Math.round(keluar/max*100):0,tooltip:x.tanggal+' · Masuk '+this.$rp(masuk)+' · Keluar '+this.$rp(keluar)}})},
    outlets(){const rows=(this.data&&this.data.outlets)||[];const max=Math.max(0,...rows.map(x=>Number(x.nilai)||0));return rows.map(x=>({nama:this.namaOutlet(x.outlet),nilai:Number(x.nilai)||0,transaksi:Number(x.transaksi)||0,pct:max?Math.round((Number(x.nilai)||0)/max*100):0}))}
  },
  async mounted(){await this.muatSemua()},
  methods:{
    async muat(){this.loading=true;this.error='';try{this.data=await api.dashboard()}catch(e){this.error=e.message}finally{this.loading=false}},
    async muatSemua(){this.error='';await Promise.all([this.muat(), this.$store.dispatch('admin/muatAntrean')])},
    namaOutlet(k){return{kantin_utama:'Kantin Utama',kantin_b:'Kantin Blok B',koperasi:'Koperasi Sekolah'}[k]||k},
    inisial(n){return String(n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
  }
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

.alert { background: #fff; border: 1px solid var(--coral); border-radius: var(--r-md); padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
.alert__ik { width: 36px; height: 36px; border-radius: var(--r-pill); background: rgba(223,74,55,.1); display: flex; align-items: center; justify-content: center; flex: none; }
.alert__body { flex: 1; }
.alert__judul { font: 700 13.5px var(--font-display); }
.alert__ket { font: 400 12.5px var(--font-body); color: var(--muted); margin-top: 2px; }
.alert__aksi { border: 1px solid var(--coral); color: var(--coral); background:#fff; font: 600 12.5px var(--font-body); padding: 9px 15px; border-radius: var(--r-sm); cursor:pointer; text-decoration:none; }

.kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi__box { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.kpi__head { display: flex; align-items: center; justify-content: space-between; font: 500 12px var(--font-body); color: var(--muted); }
.kpi__head i { width: 26px; height: 26px; border-radius: var(--r-sm); display: block; }
.kpi__nilai { font: 800 27px var(--font-display); letter-spacing: -.025em; }
.kpi__delta { font: 400 11.5px var(--font-body); color: var(--muted); }
.kpi__delta b { font-weight: 600; }

.split { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }
.chart { padding: 20px; }
.chart__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.h { font: 700 14px var(--font-display); }
.sub { font: 400 12px var(--font-body); color: var(--muted); margin-top: 3px; }
.legend { display: flex; gap: 16px; font: 500 11.5px var(--font-body); color: var(--muted); }
.legend span { display: flex; align-items: center; gap: 7px; }
.legend i { width: 9px; height: 9px; border-radius: 2px; }

.bars { display: flex; align-items: flex-end; gap: 10px; height: 210px; }
.bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
.bar__pair { width: 100%; display: flex; gap: 3px; align-items: flex-end; height: 100%; }
.bar__pair i { flex: 1; border-radius: 3px 3px 0 0; min-height: 0; }
.bar span { font: 500 10.5px var(--font-body); color: var(--muted); }

.kolom { display: flex; flex-direction: column; gap: 16px; }
.panel { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.panel__head { display: flex; align-items: center; justify-content: space-between; }
.link { font: 600 12px var(--font-body); }
.panel__angka { display: flex; align-items: baseline; gap: 10px; font: 400 12.5px var(--font-body); color: var(--muted); }
.panel__angka b { font: 800 34px var(--font-display); color: var(--ink); letter-spacing: -.03em; }
.antrean { display: flex; flex-direction: column; gap: 10px; }
.antrean__row { display: flex; align-items: center; gap: 11px; }
.av { width: 30px; height: 30px; border-radius: var(--r-pill); background: var(--blue-soft); color: var(--blue); display: flex; align-items: center; justify-content: center; font: 700 11px var(--font-display); flex: none; }
.antrean__id { flex: 1; min-width: 0; }
.antrean__id b { display: block; font: 600 12.5px var(--font-body); }
.antrean__id i { display: block; font: 400 11px var(--font-body); color: var(--muted); font-style: normal; }
.antrean__row > b { font: 700 12.5px var(--font-body); }

.outlet { display: flex; flex-direction: column; gap: 7px; }
.outlet__row { display: flex; justify-content: space-between; font: 500 12.5px var(--font-body); }
.outlet__row b { font-weight: 600; }.outlet__meta{display:flex;justify-content:space-between;font:400 10.5px var(--font-body);color:var(--muted)}
.progress { height: 7px; border-radius: var(--r-pill); background: var(--bg); overflow: hidden; }
.progress i { display: block; height: 100%; border-radius: var(--r-pill); }
</style>
<style scoped>
.alert--ok{border-color:var(--green)}.alert--ok .alert__ik{color:var(--green);background:rgba(26,128,64,.1)}.alert--ok .alert__aksi{border-color:var(--green);color:var(--green)}.alert--bad{border-color:var(--coral)}
</style>

<style scoped>.chart-empty{height:210px;display:flex;align-items:center;justify-content:center;color:var(--muted);font:400 12px var(--font-body);border:1px dashed var(--line);border-radius:var(--r-sm)}.alert--bad .alert__aksi{color:var(--coral)}</style>

