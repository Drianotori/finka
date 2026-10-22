<template>
  <div class="page">
    <div class="card list">
      <div class="list__tabs">
        <button class="chip chip--pill" :class="tab === 'Menunggu' ? 'chip--on' : ''" @click="pilihTab('Menunggu')">Menunggu ({{ menunggu.length }})</button>
        <button class="chip chip--pill" :class="tab === 'Disetujui' ? 'chip--on' : ''" @click="pilihTab('Disetujui')">Disetujui ({{ disetujuiList.length }})</button>
        <button class="chip chip--pill" :class="tab === 'Ditolak' ? 'chip--on' : ''" @click="pilihTab('Ditolak')">Ditolak ({{ ditolakList.length }})</button>
      </div>
      <div class="list__scroll">
        <div v-if="!antrean.length" class="kosong-list">{{ kosongText }}</div>
        <button
          v-for="a in antrean"
          :key="a.id"
          class="item"
          :class="a.id === pilihId ? 'item--on' : ''"
          @click="pilihItem(a.id)"
        >
          <div class="item__top">
            <div>
              <div class="item__nama">{{ a.siswa }}</div>
              <div class="item__sub">{{ a.kelas }} · oleh {{ a.ortu }}</div>
            </div>
            <span class="badge" :class="badge(status(a.id))">{{ status(a.id) }}</span>
          </div>
          <div class="item__bot">
            <b class="display num">{{ (a.dasar + a.kode) | rp }}</b>
            <span>{{ a.waktu }}</span>
          </div>
          <div v-if="status(a.id) === 'Ditolak'" class="item__alasan">Alasan: {{ alasanDari(a.id) }}</div>
        </button>
      </div>
    </div>

    <div v-if="!adaDetail" class="card detail detail--kosong">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--sand)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4" /><path d="M12 3l7.5 3v6c0 4.5-3 7.6-7.5 9-4.5-1.4-7.5-4.5-7.5-9V6z" /></svg>
      <div class="display kosong__judul">{{ kosongJudul }}</div>
      <p>{{ kosongText }}</p>
    </div>

    <div v-else class="card detail">
      <div class="detail__head">
        <div>
          <div class="detail__id">Permintaan {{ pilih.id }}</div>
          <div class="detail__nama display">{{ pilih.siswa }} · {{ pilih.kelas }}</div>
          <div class="detail__sub">Diajukan {{ pilih.ortu }} · {{ pilih.waktu }}</div>
        </div>
        <span class="badge" :class="badge(statusPilih)">{{ statusPilih }}</span>
      </div>

      <div class="dua">
        <div class="hero">
          <div class="hero__eyebrow">HARUS COCOK DENGAN MUTASI BANK</div>
          <div class="hero__angka">
            <span class="hero__rp display">Rp</span>
            <span class="display num">{{ dasarStr }}</span>
            <span class="display num kode">{{ kodeStr }}</span>
          </div>
          <div class="hero__rows">
            <div><span>Nominal dasar</span><b class="num">{{ pilih.dasar | rp }}</b></div>
            <div><span>Kode unik</span><b class="num kode">{{ kodePad }}</b></div>
            <div><span>Tujuan</span><b>Saldo saku</b></div>
            <div><span>Kedaluwarsa</span><b>{{ pilih.expired }}</b></div>
          </div>
        </div>

        <div class="bukti">
          <div class="bukti__head">
            <span class="h display">Bukti transfer</span>
            <span class="link" @click="perbesar = !perbesar">{{ perbesar ? 'Perkecil' : 'Perbesar' }}</span>
          </div>
          <div class="bukti__ph" :class="perbesar ? 'bukti__ph--besar' : ''">
            <img v-if="buktiAsli" class="bukti__img" :class="perbesar ? 'bukti__img--besar' : ''" :src="buktiAsli.url" :alt="'Bukti transfer ' + pilih.siswa" />
            <template v-else>
              <svg :width="perbesar ? 52 : 28" :height="perbesar ? 52 : 28" viewBox="0 0 24 24" fill="none" stroke="var(--sand)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
              <span>bukti-transfer.jpg<br />(placeholder)</span>
            </template>
          </div>
          <div v-if="buktiAsli" class="bukti__nama">{{ buktiAsli.nama }}</div>
        </div>
      </div>

      <div class="mutasi">
        <div class="mutasi__head">Mutasi bank masuk — BCA 872 011 4556</div>
        <div v-for="(m, i) in mutasi" :key="i" class="mutasi__row" :class="m.cocok ? 'is-match' : ''">
          <span class="mutasi__dot" :class="m.cocok ? 'ok' : 'bad'">
            <svg v-if="m.cocok" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </span>
          <span class="mutasi__body">
            <b class="num">{{ m.nominal | rp }}</b>
            <i>{{ m.ket }}</i>
          </span>
          <span class="mutasi__status" :style="'color:' + (m.utama ? (m.cocok ? 'var(--green)' : 'var(--coral)') : 'var(--muted)')">{{ m.status }}</span>
        </div>
      </div>

      <div v-if="modeTolak" class="tolak">
        <div class="tolak__judul display">Alasan penolakan wajib diisi</div>
        <div class="tolak__opsi">
          <button
            v-for="a in alasanOpsi"
            :key="a"
            class="chip"
            :class="alasan === a ? 'chip--bad' : ''"
            @click="setAlasan(a)"
          >{{ a }}</button>
        </div>
        <div class="tolak__aksi">
          <button class="btn-sm btn-sm--ghost" @click="modeTolak = false">Batal</button>
          <button class="btn-sm btn-sm--bad" :disabled="!alasan" @click="tolak">Tolak permintaan</button>
        </div>
      </div>

      <div class="spacer"></div>

      <div v-if="bisaAksi" class="aksi">
        <button class="btn-sm btn-sm--danger" @click="mulaiTolak">Tolak</button>
        <button class="btn-sm btn-sm--primary" @click="setujui">Setujui &amp; kredit saldo</button>
      </div>
      <div v-else-if="!admin" class="kunci">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 118 0v3" /></svg>
        <span>Akun Monitoring hanya bisa melihat. Persetujuan dilakukan oleh Admin.</span>
      </div>
      <div v-else class="hasil">
        <i :style="'background:' + (statusPilih === 'Disetujui' ? 'var(--green)' : 'var(--coral)')"></i>
        <span>{{ hasilText }}</span>
        <button v-if="statusPilih === 'Ditolak'" class="btn-sm btn-sm--ghost hasil__undo" @click="kembalikan">Kembalikan ke antrean</button>
      </div>
    </div>

    <div v-if="toast" :key="toast.id" class="toast-verif" role="status" aria-live="polite">
      <span>{{ toast.pesan }}</span>
      <button v-if="toast.tab !== tab" type="button" class="toast-verif__aksi" @click="lihatTab(toast.tab)">Lihat tab {{ toast.tab }}</button>
      <button type="button" class="toast-verif__tutup" aria-label="Tutup" @click="toast = null">×</button>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'admin',
  data() {
    return {
      tab: 'Menunggu',
      perbesar: false,
      modeTolak: false,
      toast: null,
      alasanOpsi: ['Nominal tidak cocok', 'Bukti tidak terbaca', 'Transfer tidak ditemukan', 'Duplikat permintaan']
    }
  },
  computed: {
    admin() { return this.$store.getters['admin/admin'] },
    antrean() {
      if (this.tab === 'Disetujui') return this.disetujuiList
      if (this.tab === 'Ditolak') return this.ditolakList
      return this.menunggu
    },
    pilihId() { return this.$store.state.admin.pilihId },
    // Detail hanya tampil bila item terpilih memang ada di tab aktif (mencegah detail "nyangkut" di tab kosong)
    adaDetail() { return this.antrean.some((a) => a.id === this.pilihId) },
    kosongJudul() {
      return this.tab === 'Ditolak' ? 'Belum ada permintaan ditolak' : this.tab === 'Disetujui' ? 'Belum ada permintaan disetujui' : 'Semua permintaan sudah diproses'
    },
    kosongText() {
      return this.tab === 'Ditolak'
        ? 'Permintaan yang Anda tolak akan muncul di sini beserta alasannya.'
        : this.tab === 'Disetujui'
          ? 'Permintaan yang Anda setujui akan muncul di sini.'
          : 'Tidak ada permintaan top-up yang menunggu verifikasi.'
    },
    pilih() { return this.$store.getters['admin/pilih'] },
    buktiAsli() { return this.$store.state.admin.buktiUnggahan[this.pilih.id] || null },
    menunggu() { return this.$store.getters['admin/menunggu'] },
    disetujuiList() { return this.$store.getters['admin/disetujui'] },
    ditolakList() { return this.$store.getters['admin/ditolak'] },
    alasan() { return this.$store.state.admin.alasan },
    alasanPilih() { return this.alasanDari(this.pilih.id) },
    waktuPilih() { return this.$store.state.admin.waktuHasil[this.pilih.id] || '' },
    statusPilih() { return this.status(this.pilih.id) },
    bisaAksi() { return this.admin && this.statusPilih === 'Menunggu Verifikasi' },
    transfer() { return this.pilih.dasar + this.pilih.kode },
    dasarStr() { return this.$num(this.transfer).slice(0, -3) },
    kodeStr() { return this.$num(this.transfer).slice(-3) },
    kodePad() { return String(this.pilih.kode).padStart(3, '0') },
    hasilText() {
      return this.statusPilih === 'Disetujui'
        ? 'Disetujui ' + (this.waktuPilih || '2 Sep 09.52') + ' — saldo ' + this.pilih.siswa + ' bertambah ' + this.$rp(this.transfer)
        : 'Ditolak' + (this.waktuPilih ? ' ' + this.waktuPilih : '') + ' — alasan: ' + (this.alasanPilih || '-') + '. Notifikasi terkirim ke orang tua.'
    },
    mutasi() {
      return [
        { nominal: this.transfer, ket: '2 Sep 09.31 · TRF DR ' + this.pilih.ortu.toUpperCase(), cocok: this.pilih.cocok, utama: true, status: this.pilih.cocok ? 'Cocok' : 'Belum ditemukan' },
        { nominal: 300472, ket: '2 Sep 08.47 · TRF DR DEWI ANGGRAINI', cocok: true, status: 'Cocok TU-0412' },
        { nominal: 200038, ket: '2 Sep 07.28 · TRF DR SARI WULANDARI', cocok: true, status: 'Cocok TU-0409' }
      ]
    }
  },
  watch: {
    toast(v) {
      clearTimeout(this._toastTimer)
      if (v) this._toastTimer = setTimeout(() => { this.toast = null }, 6000)
    }
  },
  beforeDestroy() { clearTimeout(this._toastTimer) },
  methods: {
    status(id) { return this.$store.getters['admin/status'](id) },
    badge(s) {
      if (s === 'Disetujui') return 'badge--ok'
      if (s === 'Ditolak') return 'badge--bad'
      return 'badge--warn'
    },
    pilihItem(id) { this.$store.commit('admin/setPilih', id); this.modeTolak = false },
    pilihTab(t) {
      this.tab = t
      this.modeTolak = false
      const list = t === 'Disetujui' ? this.disetujuiList : t === 'Ditolak' ? this.ditolakList : this.menunggu
      if (list.length) this.$store.commit('admin/setPilih', list[0].id)
    },
    setAlasan(a) { this.$store.commit('admin/setAlasan', a) },
    mulaiTolak() { this.$store.commit('admin/setAlasan', ''); this.modeTolak = true },
    alasanDari(id) { return this.$store.state.admin.alasanTolak[id] || '' },
    waktuSekarang() {
      const d = new Date()
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' + this.$jam(d)
    },
    // Setelah sebuah permintaan diproses ia pindah tab; pilih item berikutnya di tab yang sama
    pilihBerikutnya(idSelesai) {
      const next = this.antrean.find((a) => a.id !== idSelesai)
      if (next) this.$store.commit('admin/setPilih', next.id)
    },
    tolak() {
      if (!this.alasan) return
      const id = this.pilih.id
      const alasan = this.alasan // ambil dulu: setPilih di bawah mengosongkan alasan di store
      this.pilihBerikutnya(id)
      this.$store.dispatch('admin/tolakPermintaan', { id, alasan, waktu: this.waktuSekarang() })
      this.modeTolak = false
      this.tampilToast('Permintaan ' + id + ' ditolak. Orang tua sudah diberi tahu.', 'Ditolak')
    },
    setujui() {
      const id = this.pilih.id
      this.pilihBerikutnya(id)
      const t = this.$store.state.topup
      const lunas = t.idPermintaan === id && t.tahap === 'menunggu' && t.tagihanId
      this.$store.dispatch('admin/setujuiPermintaan', { id, waktu: this.waktuSekarang() })
      this.modeTolak = false
      this.tampilToast('Permintaan ' + id + ' disetujui.' + (lunas ? ' Tagihan lunas & invoice terbit otomatis untuk orang tua.' : ''), 'Disetujui')
    },
    kembalikan() {
      const id = this.pilih.id
      this.pilihBerikutnya(id)
      this.$store.dispatch('admin/kembalikanKeAntrean', id)
      this.tampilToast('Permintaan ' + id + ' dikembalikan ke antrean Menunggu.', 'Menunggu')
    },
    // Toast dengan tautan untuk melompat ke tab hasil keputusan
    tampilToast(pesan, tabTujuan) {
      this.toast = { id: Date.now(), pesan, tab: tabTujuan }
    },
    lihatTab(t) { this.toast = null; this.pilihTab(t) }
  }
}
</script>

<style scoped>
.kosong-list { padding: 28px 20px; text-align: center; font: 400 12.5px/1.5 var(--font-body); color: var(--muted); }
.item__alasan { font: 500 11.5px var(--font-body); color: var(--coral); background: rgba(223,74,55,.07); border-radius: var(--r-sm); padding: 6px 9px; }
.detail--kosong { align-items: center; justify-content: center; text-align: center; gap: 10px; }
.detail--kosong p { margin: 0; max-width: 320px; font: 400 12.5px/1.5 var(--font-body); color: var(--muted); }
.kosong__judul { font: 700 16px var(--font-display); }
.hasil__undo { margin-left: auto; padding: 8px 14px; font: 600 12.5px var(--font-body); }
.toast-verif {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 1100;
  display: flex; align-items: center; gap: 12px; background: var(--navy); color: #fff;
  padding: 12px 12px 12px 16px; border-radius: var(--r-md); box-shadow: 0 12px 32px rgba(10,13,59,.3);
  font: 500 13px var(--font-body); max-width: calc(100vw - 32px);
}
.toast-verif__aksi { border: none; background: transparent; color: #fff; font: 700 13px var(--font-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; white-space: nowrap; }
.toast-verif__tutup { border: none; background: transparent; color: rgba(255,255,255,.7); font-size: 18px; line-height: 1; cursor: pointer; width: 26px; height: 26px; }

.page { display: grid; grid-template-columns: 400px 1fr; gap: 16px; align-items: start; }

.list { overflow: hidden; }
.list__tabs { padding: 14px 16px; border-bottom: 1px solid var(--line); display: flex; gap: 8px; }
.list__scroll { max-height: 760px; overflow-y: auto; }
.item {
  width: 100%; text-align: left; border: none; border-bottom: 1px solid var(--bg);
  border-left: 3px solid transparent; background: #fff;
  padding: 15px 16px; cursor: pointer; display: flex; flex-direction: column; gap: 9px;
}
.item--on { background: var(--blue-soft); border-left-color: var(--blue); }
.item__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.item__nama { font: 600 13.5px var(--font-body); }
.item__sub { font: 400 11.5px var(--font-body); color: var(--muted); margin-top: 2px; }
.item__bot { display: flex; align-items: center; justify-content: space-between; }
.item__bot b { font: 700 15px var(--font-display); }
.item__bot span { font: 400 11px var(--font-body); color: var(--muted); }

.detail { padding: 24px; display: flex; flex-direction: column; gap: 22px; min-height: 700px; }
.detail__head { display: flex; align-items: flex-start; justify-content: space-between; }
.detail__id { font: 400 12px var(--font-body); color: var(--muted); }
.detail__nama { font: 700 19px var(--font-display); margin-top: 4px; }
.detail__sub { font: 400 12.5px var(--font-body); color: var(--muted); margin-top: 3px; }

.dua { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.hero { background: var(--navy); border-radius: var(--r-md); padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.hero__eyebrow { font: 500 11px var(--font-body); color: var(--sand); letter-spacing: .08em; }
.hero__angka { display: flex; align-items: baseline; gap: 3px; color: #fff; font: 800 30px var(--font-display); letter-spacing: -.03em; }
.hero__rp { font: 600 16px var(--font-display); margin-right: 3px; }
.kode { color: var(--sand); }
.hero__rows { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
.hero__rows div { display: flex; justify-content: space-between; }
.hero__rows span { font: 400 12px var(--font-body); color: rgba(255,255,255,.55); }
.hero__rows b { font: 600 12px var(--font-body); color: #fff; }

.bukti { border: 1px solid var(--line); border-radius: var(--r-md); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.bukti__head { display: flex; align-items: center; justify-content: space-between; }
.h { font: 700 12.5px var(--font-display); }
.link { font: 500 11.5px var(--font-body); color: var(--blue); cursor: pointer; }
.bukti__ph {
  flex: 1; min-height: 180px; background: var(--bg); border-radius: var(--r-sm);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px;
  font: 400 11px/1.4 var(--font-body); color: var(--muted); text-align: center;
}
.bukti__ph--besar { min-height: 320px; }
.bukti__img { max-width: 100%; max-height: 260px; object-fit: contain; border-radius: var(--r-sm); }
.bukti__img--besar { max-height: 520px; }
.bukti__nama { font: 400 11px var(--font-body); color: var(--muted); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mutasi { border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; }
.mutasi__head { padding: 12px 16px; background: var(--bg); font: 700 12.5px var(--font-display); }
.mutasi__row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-top: 1px solid var(--bg); }
.mutasi__row.is-match:first-of-type { background: rgba(26,128,64,.05); }
.mutasi__dot { width: 22px; height: 22px; border-radius: var(--r-pill); display: flex; align-items: center; justify-content: center; flex: none; }
.mutasi__dot.ok { background: rgba(26,128,64,.12); }
.mutasi__dot.bad { background: rgba(223,74,55,.1); }
.mutasi__body { flex: 1; }
.mutasi__body b { display: block; font: 600 12.5px var(--font-body); }
.mutasi__body i { display: block; font: 400 11px var(--font-body); color: var(--muted); font-style: normal; margin-top: 1px; }
.mutasi__status { font: 500 11.5px var(--font-body); }

.tolak { border: 1px solid var(--coral); background: rgba(223,74,55,.05); border-radius: var(--r-md); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.tolak__judul { font: 700 13px var(--font-display); color: var(--coral); }
.tolak__opsi { display: flex; gap: 8px; flex-wrap: wrap; }
.chip--bad { border-color: var(--coral); background: rgba(223,74,55,.1); color: var(--coral); }
.tolak__aksi { display: flex; gap: 10px; }

.spacer { flex: 1; }
.aksi { display: flex; align-items: center; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--line); padding-top: 18px; }

.btn-sm { border: none; border-radius: var(--r-sm); font: 700 13.5px var(--font-display); padding: 12px 20px; cursor: pointer; }
.btn-sm--primary { background: var(--blue); color: #fff; padding: 12px 26px; }
.btn-sm--primary:hover { background: var(--blue-dark); }
.btn-sm--danger { background: #fff; border: 1px solid var(--coral); color: var(--coral); font-weight: 600; }
.btn-sm--ghost { background: #fff; border: 1px solid var(--line); color: var(--muted); font: 600 13px var(--font-body); padding: 11px 18px; }
.btn-sm--bad { background: var(--coral); color: #fff; padding: 11px 20px; }
.btn-sm--bad:disabled { background: var(--disabled); cursor: not-allowed; }

.kunci, .hasil { border-top: 1px solid var(--line); padding-top: 18px; display: flex; align-items: center; gap: 10px; font: 400 12.5px var(--font-body); color: var(--muted); }
.hasil { color: var(--ink); font-weight: 500; }
.hasil i { width: 8px; height: 8px; border-radius: var(--r-pill); }
</style>
