<template>
  <div class="page">
    <div class="alert">
      <div class="alert__ik">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" stroke-width="2" stroke-linecap="round"><path d="M12 8v5M12 17h.01" /><circle cx="12" cy="12" r="9.5" /></svg>
      </div>
      <div class="alert__body">
        <div class="alert__judul display">Rekonsiliasi kemarin selisih Rp 24.000</div>
        <div class="alert__ket">Total top-up disetujui tidak cocok dengan perubahan saldo agregat. Perlu ditelusuri di Laporan &amp; Rekonsiliasi.</div>
      </div>
      <nuxt-link to="/admin/laporan" class="alert__aksi">Telusuri</nuxt-link>
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
            <div class="sub">Top-up masuk dibanding transaksi POS keluar</div>
          </div>
          <div class="legend">
            <span><i style="background: var(--blue)"></i>Masuk</span>
            <span><i style="background: var(--sand)"></i>Keluar</span>
          </div>
        </div>
        <div class="bars">
          <div v-for="(c, i) in chart" :key="i" class="bar">
            <div class="bar__pair">
              <i :style="'height:' + c.masuk + '%; background: var(--blue)'"></i>
              <i :style="'height:' + c.keluar + '%; background: var(--sand)'"></i>
            </div>
            <span class="num">{{ c.hari }}</span>
          </div>
        </div>
      </div>

      <div class="kolom">
        <div class="card panel">
          <div class="panel__head">
            <span class="h display">Antrean verifikasi</span>
            <nuxt-link to="/admin/verifikasi" class="link">Buka</nuxt-link>
          </div>
          <div class="panel__angka">
            <b class="display num">{{ menunggu.length }}</b>
            <span>permintaan menunggu</span>
          </div>
          <div class="antrean">
            <div v-for="a in menunggu.slice(0, 3)" :key="a.id" class="antrean__row">
              <span class="av">{{ inisial(a.siswa) }}</span>
              <span class="antrean__id"><b>{{ a.siswa }}</b><i>{{ a.waktu }}</i></span>
              <b class="num">{{ (a.dasar + a.kode) | rp }}</b>
            </div>
          </div>
        </div>

        <div class="card panel">
          <div class="h display">Transaksi per outlet hari ini</div>
          <div v-for="o in outlets" :key="o.nama" class="outlet">
            <div class="outlet__row">
              <span>{{ o.nama }}</span>
              <b class="num">{{ o.nilai | rp }}</b>
            </div>
            <div class="progress"><i :style="'width:' + o.pct + '%; background:' + o.warna"></i></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'admin',
  data() {
    const seri = [[3.1, 2.2], [4.4, 2.6], [2.8, 2.4], [5.2, 2.9], [3.6, 2.5], [1.1, 0.4], [0.6, 0.2], [4.8, 2.7], [3.9, 2.8], [5.6, 3.1], [4.2, 2.6], [6.1, 3.4], [1.3, 0.5], [5.4, 3.0]]
    return {
      chart: seri.map((d, i) => ({
        hari: String(20 + i > 31 ? 20 + i - 31 : 20 + i),
        masuk: Math.round((d[0] / 6.5) * 100),
        keluar: Math.round((d[1] / 6.5) * 100)
      })),
      outlets: [
        { nama: 'Kantin Utama', nilai: 1840000, pct: 82, warna: 'var(--blue)' },
        { nama: 'Kantin Blok B', nilai: 760000, pct: 34, warna: 'var(--blue)' },
        { nama: 'Koperasi Sekolah', nilai: 385000, pct: 17, warna: 'var(--sand)' }
      ]
    }
  },
  computed: {
    menunggu() { return this.$store.getters['admin/menunggu'] },
    kpi() {
      return [
        { label: 'Uang masuk hari ini', nilai: this.$rp(5430000), delta: '+18,4%', ket: 'vs kemarin', hijau: true, bg: 'var(--blue-soft)' },
        { label: 'Uang keluar hari ini', nilai: this.$rp(2985000), delta: '+6,1%', ket: '347 transaksi POS', bg: 'rgba(192,169,127,.2)' },
        { label: 'Saldo mengendap', nilai: this.$rp(186420000), delta: '1.284 dompet', ket: 'aktif', bg: 'rgba(26,128,64,.1)' },
        { label: 'Transaksi hari ini', nilai: '347', delta: '92 belum jam istirahat', ket: '', bg: 'var(--bg)' }
      ]
    }
  },
  methods: {
    inisial(n) { return n.split(' ').map((w) => w[0]).join('').slice(0, 2) }
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
.alert__aksi { border: 1px solid var(--coral); color: var(--coral); font: 600 12.5px var(--font-body); padding: 9px 15px; border-radius: var(--r-sm); }

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
.bar__pair i { flex: 1; border-radius: 3px 3px 0 0; min-height: 3px; }
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
.outlet__row b { font-weight: 600; }
.progress { height: 7px; border-radius: var(--r-pill); background: var(--bg); overflow: hidden; }
.progress i { display: block; height: 100%; border-radius: var(--r-pill); }
</style>
