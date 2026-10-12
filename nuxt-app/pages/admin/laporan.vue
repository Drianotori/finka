<template>
  <div class="page">
    <div class="toolbar card">
      <div><div class="h display">Rekonsiliasi harian</div><div class="sub">Semua angka diambil langsung dari ledger dan transaksi tagihan.</div></div>
      <input v-model="tanggal" type="date" class="date" @change="muat">
    </div>
    <div v-if="error" class="error card">{{ error }}</div>
    <div class="kpi">
      <div v-for="k in kpi" :key="k.label" class="card kpi__box">
        <div class="kpi__label">{{ k.label }}</div><div class="kpi__nilai display num" :style="'color:' + k.fg">{{ k.nilai }}</div><div class="kpi__ket">{{ k.ket }}</div>
      </div>
    </div>
    <div class="card status" :class="ringkasan.selisih === 0 ? 'status--ok' : 'status--bad'">
      <div><b class="display">{{ ringkasan.selisih === 0 ? 'Rekonsiliasi seimbang' : 'Ada selisih yang harus ditelusuri' }}</b><span>Uang masuk − uang keluar − perubahan saldo agregat</span></div>
      <strong class="display num">{{ $rp(ringkasan.selisih) }}</strong>
      <nuxt-link to="/admin/audit" class="link">Lihat audit</nuxt-link>
    </div>
    <div class="card ekspor">
      <div><div class="h display">Ekspor untuk bendahara / auditor</div><div class="sub">CSV pemisah titik koma (langsung terbuka rapi di Excel Indonesia). Tercatat di audit log.</div></div>
      <div class="ekspor__form">
        <label>Dari<input v-model="dari" type="date" class="date"></label>
        <label>Sampai<input v-model="sampai" type="date" class="date"></label>
        <label>Bulan tagihan<input v-model="bulan" type="month" class="date"></label>
      </div>
      <div class="ekspor__aksi">
        <button class="btn-ekspor" :disabled="eksporBusy" @click="unduh('/admin/ekspor/transaksi.csv?dari=' + dari + '&sampai=' + sampai, 'finka-transaksi-' + dari + '_' + sampai + '.csv')">Transaksi</button>
        <button class="btn-ekspor" :disabled="eksporBusy" @click="unduh('/admin/ekspor/rekap-harian.csv?dari=' + dari + '&sampai=' + sampai, 'finka-rekap-harian-' + dari + '_' + sampai + '.csv')">Rekap harian</button>
        <button class="btn-ekspor" :disabled="eksporBusy" @click="unduh('/admin/ekspor/tagihan.csv' + (bulan ? '?bulan=' + bulan : ''), 'finka-tagihan-' + (bulan || 'semua') + '.csv')">Tagihan</button>
        <button class="btn-ekspor" :disabled="eksporBusy" @click="unduh('/admin/ekspor/saldo-siswa.csv', 'finka-saldo-siswa.csv')">Saldo semua siswa</button>
      </div>
      <div v-if="eksporError" class="error">{{ eksporError }}</div>
    </div>
    <div class="card tabel">
      <div class="tabel__head"><div><div class="h display">Arus 14 hari terakhir</div><div class="sub">Nilai aktual, tanpa angka contoh.</div></div></div>
      <div class="baris head"><div>TANGGAL</div><div>UANG MASUK</div><div>UANG KELUAR</div><div>PERUBAHAN SALDO</div><div>SELISIH</div></div>
      <div v-for="r in chart" :key="r.tanggal" class="baris"><div>{{ r.tanggal }}</div><div class="num">{{ $rp(r.masuk) }}</div><div class="num">{{ $rp(r.keluar) }}</div><div class="num">{{ $rp(r.perubahan_saldo) }}</div><div class="num" :class="r.masuk-r.keluar-r.perubahan_saldo===0 ? 'ok':'bad'">{{ $rp(r.masuk-r.keluar-r.perubahan_saldo) }}</div></div>
      <div v-if="!chart.length" class="empty">Belum ada transaksi pada periode ini.</div>
    </div>
  </div>
</template>
<script>
import { api } from '~/plugins/api'
export default {
  middleware: ['auth', 'admin'],
  layout:'admin',
  data(){ const d=new Date(); const tanggal=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); return { tanggal, ringkasan:{uang_masuk:0,uang_keluar:0,perubahan_saldo_agregat:0,selisih:0,transaksi_ledger:0,transaksi_tagihan:0}, chart:[], error:'', dari:tanggal, sampai:tanggal, bulan:tanggal.slice(0,7), eksporBusy:false, eksporError:'' } },
  computed:{ kpi(){ return [
    {label:'Uang masuk',nilai:this.$rp(this.ringkasan.uang_masuk),ket:this.ringkasan.transaksi_ledger+' transaksi ledger + '+this.ringkasan.transaksi_tagihan+' pembayaran tagihan',fg:'var(--ink)'},
    {label:'Uang keluar',nilai:this.$rp(this.ringkasan.uang_keluar),ket:'Termasuk settlement tagihan',fg:'var(--ink)'},
    {label:'Perubahan saldo agregat',nilai:this.$rp(this.ringkasan.perubahan_saldo_agregat),ket:'Saldo seluruh dompet siswa',fg:'var(--blue)'},
    {label:'Selisih',nilai:this.$rp(this.ringkasan.selisih),ket:this.ringkasan.selisih===0?'Seimbang':'Perlu ditelusuri',fg:this.ringkasan.selisih===0?'var(--green)':'var(--coral)'}
  ]}},
  async mounted(){ await this.muat() },
  methods:{ async unduh(path,nama){ this.eksporError=''; this.eksporBusy=true; try { await api.unduh(path,nama) } catch(e){ this.eksporError=e.message } finally { this.eksporBusy=false } }, async muat(){ this.error=''; try { const d=await api.laporan(this.tanggal); this.ringkasan=d.ringkasan; this.chart=d.chart||[] } catch(e){this.error=e.message} } }
}
</script>
<style scoped>
.ekspor{padding:16px 20px;display:flex;flex-direction:column;gap:12px}.ekspor__form{display:flex;gap:14px;flex-wrap:wrap}.ekspor__form label{display:flex;flex-direction:column;gap:4px;font:600 11.5px var(--font-body);color:var(--muted)}.ekspor__aksi{display:flex;gap:8px;flex-wrap:wrap}.btn-ekspor{border:1px solid var(--line);background:#fff;border-radius:8px;padding:9px 14px;font:600 12.5px var(--font-body);cursor:pointer}.btn-ekspor:hover{border-color:var(--blue);color:var(--blue)}.btn-ekspor:disabled{opacity:.6;cursor:wait}
.page{display:flex;flex-direction:column;gap:16px}.toolbar{padding:16px 20px;display:flex;align-items:center;justify-content:space-between}.h{font:700 14px var(--font-display)}.sub{font:400 12px var(--font-body);color:var(--muted);margin-top:3px}.date{border:1px solid var(--line);border-radius:8px;padding:9px 11px;font:500 12px var(--font-body)}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.kpi__box{padding:18px;display:flex;flex-direction:column;gap:8px}.kpi__label{font:500 12px var(--font-body);color:var(--muted)}.kpi__nilai{font:800 23px var(--font-display)}.kpi__ket{font:400 11px var(--font-body);color:var(--muted)}.status{padding:16px 20px;display:flex;align-items:center;gap:18px;border-left:4px solid var(--coral)}.status--ok{border-left-color:var(--green)}.status div{flex:1}.status b{display:block;font-size:14px}.status span{display:block;color:var(--muted);font:400 11.5px var(--font-body);margin-top:3px}.status strong{font-size:18px}.link{font:600 12px var(--font-body)}.tabel{overflow:hidden}.tabel__head{padding:16px 20px;border-bottom:1px solid var(--line)}.baris{display:grid;grid-template-columns:1fr 1.2fr 1.2fr 1.3fr 1fr;padding:12px 20px;border-top:1px solid var(--bg);font:400 12px var(--font-body);align-items:center}.head{background:var(--bg);border-top:0;color:var(--muted);font:600 11px var(--font-body)}.ok{color:var(--green)}.bad{color:var(--coral)}.empty,.error{padding:25px;text-align:center;color:var(--muted);font:400 12px var(--font-body)}.error{color:var(--coral)}
</style>

