<template>
  <div class="wrap">
    <header class="head">
      <nuxt-link to="/pic" class="kembali" aria-label="Kembali">←</nuxt-link>
      <div>
        <div class="outlet display">Riwayat hari ini</div>
        <div class="sesi">{{ data ? data.nama_outlet : '' }}</div>
      </div>
    </header>

    <div class="isi">
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="pesan" class="sukses">{{ pesan }}</p>

      <section v-if="data" class="ringkas">
        <div><span>Transaksi</span><b class="display num">{{ data.ringkasan.jumlah }}</b></div>
        <div><span>Belanja</span><b class="display num">{{ data.ringkasan.penjualan | rp }}</b></div>
        <div><span>Tarik tunai</span><b class="display num">{{ data.ringkasan.tarik_tunai | rp }}</b></div>
      </section>

      <section class="kartu">
        <div class="kartu__judul display">Tutup kas</div>
        <template v-if="kas">
          <div class="baris"><span>Kas awal</span><b class="num">{{ kas.kas.kas_awal === null ? 'belum diisi' : $rp(kas.kas.kas_awal) }}</b></div>
          <div class="baris"><span>Sudah ditarik siswa</span><b class="num">{{ $rp(kas.kas.sudah_ditarik) }}</b></div>
          <div class="baris"><span>Seharusnya di laci</span><b class="num">{{ kas.kas.kas_awal === null ? '—' : $rp(kas.kas.kas_awal - kas.kas.sudah_ditarik) }}</b></div>
          <form v-if="kas.kas.kas_awal !== null" class="tutup" @submit.prevent="tutup">
            <label>Uang tunai di laci sekarang (hasil hitung)
              <input v-model="fisik" class="input" inputmode="numeric" placeholder="mis. 30.000" required />
            </label>
            <button class="btn-utama" :disabled="menutup">{{ kas.ditutup ? 'Perbarui penutupan' : 'Tutup kas hari ini' }}</button>
          </form>
          <p v-else class="ket">Isi kas awal dulu dari halaman kasir (ketuk label kas tunai).</p>
          <p v-if="kas.ditutup" class="hasil" :class="kas.ditutup.selisih === 0 ? 'ok' : 'beda'">
            Ditutup: hitungan {{ $rp(kas.ditutup.kas_fisik) }} ·
            {{ kas.ditutup.selisih === 0 ? 'pas, tidak ada selisih' : (kas.ditutup.selisih > 0 ? 'lebih ' : 'kurang ') + $rp(Math.abs(kas.ditutup.selisih)) }}
          </p>
        </template>
      </section>

      <section class="kartu">
        <div class="kartu__judul display">Transaksi</div>
        <p v-if="data && !data.transaksi.length" class="ket">Belum ada transaksi hari ini.</p>
        <div v-for="t in (data ? data.transaksi : [])" :key="t.id" class="trx" :class="t.dibatalkan ? 'trx--batal' : ''">
          <div class="trx__atas">
            <b>{{ t.siswa }}</b><span class="kelas">{{ t.kelas || '' }}</span>
            <span class="nilai display num">{{ t.nilai | rp }}</span>
          </div>
          <div class="trx__ket">{{ t.tipe === 'tarik_tunai' ? 'Tarik tunai' : t.keterangan }} · {{ t.waktu | waktu }}</div>
          <div v-if="t.dibatalkan" class="trx__batal">Dibatalkan: {{ t.alasan_batal }}</div>
          <button v-else-if="t.bisa_dibatalkan" class="btn-batal" @click="batalkan(t)">Batalkan</button>
        </div>
        <p v-if="data" class="ket">Pembatalan hanya bisa dalam {{ data.jendela_batal_menit }} menit setelah transaksi. Lewat dari itu, hubungi admin.</p>
      </section>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'

export default {
  layout: 'phone',
  middleware: ['auth', 'pic'],
  data() { return { data: null, kas: null, fisik: '', error: '', pesan: '', menutup: false } },
  async mounted() { await this.muat() },
  methods: {
    async muat() {
      this.error = ''
      try {
        const [d, k] = await Promise.all([api.riwayatKasir(), api.statusTutupKas()])
        this.data = d; this.kas = k
      } catch (e) { this.error = e.message }
    },
    async batalkan(t) {
      const alasan = window.prompt(`Batalkan ${t.tipe === 'tarik_tunai' ? 'tarik tunai' : 'belanja'} ${t.siswa} (Rp ${t.nilai.toLocaleString('id-ID')})?\n\nSaldo siswa dikembalikan. Alasan (wajib):`)
      if (alasan === null) return
      this.error = ''; this.pesan = ''
      try {
        await api.batalTransaksi(t.id, alasan)
        this.pesan = 'Transaksi dibatalkan, saldo siswa dikembalikan.'
        await this.muat()
      } catch (e) { this.error = e.message }
    },
    async tutup() {
      this.error = ''; this.pesan = ''; this.menutup = true
      try {
        const r = await api.tutupKas(this.$parseRp(this.fisik))
        this.pesan = r.ditutup.selisih === 0 ? 'Kas ditutup, pas.' : 'Kas ditutup dengan selisih tercatat.'
        this.fisik = ''
        await this.muat()
      } catch (e) { this.error = e.message } finally { this.menutup = false }
    }
  }
}
</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; background: var(--bg); min-height: 0; }
.head { padding: 8px 18px 14px; background: #fff; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 12px; flex: none; }
.kembali { font-size: 22px; text-decoration: none; color: var(--ink); }
.outlet { font: 700 15px var(--font-display); }
.sesi { font: 400 11.5px var(--font-body); color: var(--muted); }
.isi { flex: 1; overflow-y: auto; padding: 14px 16px 24px; display: flex; flex-direction: column; gap: 12px; }
.ringkas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ringkas div { background: #fff; border-radius: var(--r-md); padding: 10px; display: flex; flex-direction: column; gap: 4px; }
.ringkas span { font: 500 10.5px var(--font-body); color: var(--muted); }
.ringkas b { font: 800 14px var(--font-display); }
.kartu { background: #fff; border-radius: var(--r-md); padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.kartu__judul { font: 700 14px var(--font-display); }
.baris { display: flex; justify-content: space-between; font: 400 13px var(--font-body); }
.tutup { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.tutup label { display: flex; flex-direction: column; gap: 6px; font: 600 12px var(--font-body); }
.input { border: 1.5px solid var(--line); border-radius: var(--r-sm); padding: 11px 12px; font: 600 15px var(--font-body); outline: none; }
.input:focus { border-color: var(--blue); }
.btn-utama { border: none; background: var(--blue); color: #fff; border-radius: var(--r-sm); padding: 12px; font: 700 13px var(--font-body); cursor: pointer; }
.btn-utama:disabled { opacity: .6; }
.hasil { margin: 0; font: 600 12.5px var(--font-body); }
.hasil.ok { color: var(--green); }
.hasil.beda { color: var(--coral); }
.ket { margin: 0; font: 400 12px/1.5 var(--font-body); color: var(--muted); }
.trx { border-top: 1px solid var(--bg); padding-top: 8px; display: flex; flex-direction: column; gap: 3px; }
.trx__atas { display: flex; align-items: baseline; gap: 6px; font: 600 13px var(--font-body); }
.trx__atas .kelas { font: 400 11px var(--font-body); color: var(--muted); }
.trx__atas .nilai { margin-left: auto; font: 700 13.5px var(--font-display); }
.trx__ket { font: 400 11.5px var(--font-body); color: var(--muted); }
.trx--batal { opacity: .6; }
.trx--batal .nilai { text-decoration: line-through; }
.trx__batal { font: 600 11.5px var(--font-body); color: var(--coral); }
.btn-batal { align-self: flex-start; border: 1px solid var(--coral); background: #fff; color: var(--coral); border-radius: var(--r-sm); padding: 6px 12px; font: 600 12px var(--font-body); cursor: pointer; }
.error { margin: 0; font: 500 12.5px var(--font-body); color: var(--coral); }
.sukses { margin: 0; font: 500 12.5px var(--font-body); color: var(--green); }
</style>
