<template>
  <div class="page">
    <div class="card list">
      <div class="list__tabs">
        <button class="chip chip--pill chip--on">Menunggu ({{ menunggu.length }})</button>
        <button class="chip chip--pill">Diterima</button>
        <button class="chip chip--pill">Ditolak</button>
      </div>
      <div class="list__scroll">
        <div v-if="memuat" class="muat">Memuat…</div>
        <div v-else-if="!antrean.length" class="muat">Tidak ada permintaan.</div>
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
            <span>{{ a.waktu | waktu }}</span>
          </div>
        </button>
      </div>
    </div>

    <div class="card detail">
      <div class="detail__head">
        <div>
          <div class="detail__id">Permintaan {{ pilih.id }}</div>
          <div class="detail__nama display">{{ pilih.siswa }} · {{ pilih.kelas }}</div>
          <div class="detail__sub">Diajukan {{ pilih.ortu }} · {{ pilih.waktu | waktu }} · {{ pilih.tujuan }}</div>
        </div>
        <span class="badge" :class="badge(statusPilih)">{{ statusPilih }}</span>
      </div>

      <div class="dua">
        <div class="hero">
          <div class="hero__eyebrow">VERIFIKASI PEMBAYARAN</div>
          <div class="hero__angka">
            <span class="hero__rp display">Rp</span>
            <span class="display num">{{ dasarStr }}</span>
            <span class="display num kode">{{ kodeStr }}</span>
          </div>
          <div class="hero__rows">
            <div><span>Nominal dasar</span><b class="num">{{ pilih.dasar | rp }}</b></div>
            <div><span>Kode unik</span><b class="num kode">{{ kodePad }}</b></div>
            <div><span>Tujuan</span><b>{{ pilih.tujuan }}</b></div>
          </div>
        </div>

        <div class="bukti">
          <div class="bukti__head">
            <span class="h display">Bukti transfer</span>
            <button v-if="buktiUrl" type="button" class="link" @click="perbesar = true">Perbesar</button>
          </div>
          <button v-if="buktiUrl" type="button" class="bukti__gambar" @click="perbesar = true">
            <img :src="buktiUrl" :alt="buktiNama" />
          </button>
          <div v-else class="bukti__ph">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--sand)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            <span>{{ buktiMemuat ? 'Memuat bukti transfer…' : 'Bukti transfer belum diunggah' }}</span>
          </div>
        </div>
      </div>

      <div class="mutasi">
        <div class="mutasi__head">Cek manual di mutasi rekening bank</div>
        <div class="mutasi__row">
          <span class="mutasi__body">
            <b class="num">{{ transfer | rp }}</b>
            <i v-if="info">Cari transfer masuk dengan nominal PERSIS ini (termasuk 3 digit kode unik) di rekening {{ info.rekening.bank }} {{ info.rekening.nomor }}. Terima hanya jika sudah ada di mutasi. Pencocokan otomatis dengan bank belum tersedia.</i>
            <i v-else>Cari transfer masuk dengan nominal persis ini (termasuk kode unik) di mutasi rekening bank sebelum menerima. Pencocokan otomatis dengan bank belum tersedia.</i>
          </span>
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
        <span class="aksi__note">Aksi tercatat di audit log atas nama {{ namaAdmin }}.</span>
        <button class="btn-sm btn-sm--danger" :disabled="memproses" @click="mulaiTolak">Tolak</button>
        <button class="btn-sm btn-sm--primary" :disabled="memproses" @click="setujui">{{ memproses ? 'Memproses…' : (pilih.tagihan_id ? 'Terima pembayaran' : 'Terima & kredit saldo') }}</button>
      </div>
      <div v-else-if="!admin" class="kunci">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 118 0v3" /></svg>
        <span>Akun Monitoring hanya bisa melihat. Persetujuan dilakukan oleh Admin.</span>
      </div>
      <div v-else class="hasil">
        <i :style="'background:' + (statusPilih === 'Disetujui' ? 'var(--green)' : 'var(--coral)')"></i>
        <span>{{ hasilText }}</span>
        <button v-if="admin && statusPilih === 'Ditolak'" class="btn-sm btn-sm--primary" :disabled="memproses" @click="terimaKembali">{{ memproses ? 'Memproses…' : 'Terima pembayaran yang terlambat' }}</button>
      </div>
    </div>

    <div v-if="perbesar" class="preview-overlay" @click.self="perbesar = false">
      <div class="preview-modal">
        <button type="button" class="preview-close" @click="perbesar = false">Tutup</button>
        <img :src="buktiUrl" :alt="buktiNama" />
        <div class="preview-name">{{ buktiNama }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'

export default {
  layout: 'admin',
  middleware: ['auth', 'admin'],
  data() {
    return {
      modeTolak: false,
      memproses: false,
      buktiUrl: '',
      buktiNama: '',
      buktiMemuat: false,
      perbesar: false,
      alasanOpsi: ['Nominal tidak cocok', 'Bukti tidak terbaca', 'Transfer tidak ditemukan', 'Duplikat permintaan']
    }
  },
  watch: {
    pilihId(id) {
      this.muatBukti(id)
    }
  },
  computed: {
    admin() { return this.$store.getters['admin/admin'] },
    namaAdmin() { return (this.$store.state.auth.user && this.$store.state.auth.user.nama) || 'Admin' },
    memuat() { return this.$store.state.admin.memuatAntrean },
    antrean() { return this.$store.state.admin.antrean },
    pilihId() { return this.$store.state.admin.pilihId },
    pilih() { return this.$store.getters['admin/pilih'] || {} },
    menunggu() { return this.$store.getters['admin/menunggu'] },
    alasan() { return this.$store.state.admin.alasan },
    statusPilih() { return this.pilih.id ? this.status(this.pilih.id) : '' },
    bisaAksi() { return this.admin && this.statusPilih === 'Menunggu Verifikasi' },
    transfer() { return (this.pilih.dasar || 0) + (this.pilih.kode || 0) },
    // langsung dari nominal & kode aslinya, bukan dipotong dari total —
    // supaya tidak salah kalau nominal bukan kelipatan 1000 genap
    dasarStr() { return this.$num(this.pilih.dasar || 0) },
    kodeStr() { return String(this.pilih.kode || 0).padStart(3, '0') },
    kodePad() { return String(this.pilih.kode || 0).padStart(3, '0') },
    hasilText() {
      if (this.statusPilih === 'Disetujui') {
        return 'Disetujui — ' + (this.pilih.tujuan === 'Saldo saku' ? ('saldo ' + this.pilih.siswa + ' bertambah ' + this.$rp(this.transfer)) : (this.pilih.tujuan + ' lunas'))
      }
      return 'Ditolak — alasan: ' + (this.pilih.alasan_tolak || '(tidak dicantumkan)') + '. Admin masih dapat menerima pembayaran ini jika transfer terlambat masuk.'
    },
    info() { return this.$store.state.infoPembayaran }
  },
  async mounted() {
    this.$store.dispatch('muatInfoPembayaran').catch(() => {})
    await this.$store.dispatch('admin/muatAntrean')
    if (this.pilihId) await this.muatBukti(this.pilihId)
  },
  methods: {
    async muatBukti(id) {
      this.buktiUrl = ''
      this.buktiNama = ''
      this.perbesar = false
      if (!id) return
      this.buktiMemuat = true
      try {
        const bukti = await api.buktiTopup(id)
        this.buktiUrl = bukti.data_url
        this.buktiNama = bukti.nama || 'bukti-transfer'
      } catch (e) {
        // 404 berarti memang belum ada bukti; jangan tampilkan error sebagai
        // gangguan pada proses verifikasi.
      } finally {
        this.buktiMemuat = false
      }
    },
    status(id) { return this.$store.getters['admin/status'](id) },
    badge(s) {
      if (s === 'Disetujui') return 'badge--ok'
      if (s === 'Ditolak') return 'badge--bad'
      return 'badge--warn'
    },
    pilihItem(id) { this.$store.commit('admin/setPilih', id); this.modeTolak = false; this.muatBukti(id) },
    setAlasan(a) { this.$store.commit('admin/setAlasan', a) },
    mulaiTolak() { this.$store.commit('admin/setAlasan', ''); this.modeTolak = true },
    async tolak() {
      if (!this.alasan) return
      this.memproses = true
      try {
        await this.$store.dispatch('admin/tolakAsli', { id: this.pilih.id, alasan: this.alasan })
        this.modeTolak = false
      } catch (e) {
        window.alert(e.message || 'Gagal menolak permintaan')
      } finally {
        this.memproses = false
      }
    },
    async setujui() {
      this.memproses = true
      try {
        await this.$store.dispatch('admin/setujuiAsli', this.pilih.id)
      } catch (e) {
        window.alert(e.message || 'Gagal menyetujui permintaan')
      } finally {
        this.memproses = false
      }
    },
    async terimaKembali() {
      this.memproses = true
      try {
        await this.$store.dispatch('admin/terimaKembali', this.pilih.id)
      } catch (e) {
        window.alert(e.message || 'Gagal menerima pembayaran kembali')
      } finally {
        this.memproses = false
      }
    }
  }
}
</script>

<style scoped>
.page { display: grid; grid-template-columns: 400px 1fr; gap: 16px; align-items: start; }

.list { overflow: hidden; }
.list__tabs { padding: 14px 16px; border-bottom: 1px solid var(--line); display: flex; gap: 8px; }
.list__scroll { max-height: 760px; overflow-y: auto; }
.muat { padding: 30px 16px; text-align: center; font: 500 12.5px var(--font-body); color: var(--muted); }
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
.bukti__gambar {
  width: 100%; min-height: 180px; border: 0; padding: 0; background: var(--bg);
  border-radius: var(--r-sm); overflow: hidden; cursor: zoom-in;
}
.bukti__gambar img { display: block; width: 100%; height: 300px; object-fit: contain; background: var(--bg); }
.bukti__ph {
  flex: 1; min-height: 180px; background: var(--bg); border-radius: var(--r-sm);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px;
  font: 400 11px/1.4 var(--font-body); color: var(--muted); text-align: center;
}

.preview-overlay {
  position: fixed; inset: 0; z-index: 100; background: rgba(11,25,43,.72);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.preview-modal {
  max-width: min(900px, 95vw); max-height: 92vh; background: #fff;
  border-radius: var(--r-md); padding: 14px; display: flex; flex-direction: column;
  align-items: center; gap: 10px;
}
.preview-modal img { max-width: 85vw; max-height: 78vh; object-fit: contain; }
.preview-close {
  align-self: flex-end; border: 1px solid var(--line); background: #fff;
  border-radius: var(--r-sm); padding: 7px 11px; cursor: pointer;
  font: 600 12px var(--font-body);
}
.preview-name { font: 500 11.5px var(--font-body); color: var(--muted); }
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
.hasil { display:flex; align-items:center; gap:10px; }
.aksi { display: flex; align-items: center; gap: 12px; border-top: 1px solid var(--line); padding-top: 18px; }
.aksi__note { flex: 1; font: 400 12px var(--font-body); color: var(--muted); }

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

