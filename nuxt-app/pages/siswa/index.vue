<template>
  <div class="wrap">
    <div class="atas">
      <div class="bar">
        <div class="who">
          <div class="av">{{ siswa.inisial }}</div>
          <div>
            <div class="who__nama display">{{ siswa.nama }}</div>
            <div class="who__sub">{{ siswa.kelas }} · NIS {{ siswa.nis }}</div>
          </div>
        </div>
        <div class="settings-wrap">
          <button class="settings-btn" type="button" aria-label="Pengaturan" @click="menuBuka = !menuBuka">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.2V21a2 2 0 11-4 0v-.1A1.6 1.6 0 007.5 19.7l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003.1 14H3a2 2 0 110-4h.1a1.6 1.6 0 001.2-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0010 3.1V3a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0020.9 10H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" /></svg>
          </button>
          <div v-if="menuBuka" class="settings-menu">
            <div class="settings-menu__title">Akun</div>
            <nuxt-link to="/akun/password" class="settings-menu__link">Ganti password</nuxt-link>
            <nuxt-link to="/siswa/pin" class="settings-menu__link">Ganti PIN kasir</nuxt-link>
            <button type="button" @click="logout">Keluar</button>
          </div>
        </div>
      </div>
      <div class="saldo">
        <div class="saldo__label">SALDO KAMU</div>
        <div class="saldo__nilai display num">{{ saldo | rp }}</div>
        <div v-if="labelLimit" class="saldo__limit"><i></i>{{ labelLimit }}</div>
      </div>
    </div>

    <div class="sheet">
      <nuxt-link to="/siswa/qr" class="qrcard">
        <div class="qrcard__thumb"><QrCode :size="70" :cell="3" :seed="seed" /></div>
        <div class="qrcard__body">
          <div class="qrcard__judul display">Tunjukkan QR</div>
          <p>Untuk bayar di kantin dan koperasi. Kode berganti tiap 30 detik.</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6" /></svg>
      </nuxt-link>

      <div class="sec">
        <span class="display">Jajan hari ini</span>
        <nuxt-link to="/siswa/riwayat" class="link">Semua</nuxt-link>
      </div>
      <div class="list">
        <TrxRow v-for="t in hariIni" :key="t.id" :trx="t" :to="'/siswa/struk/' + t.id" />
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '~/plugins/api'

export default {
  layout: 'phone',
  middleware: ['auth', 'siswa'],
  data() {
    return { seed: 47, menuBuka: false, kontrol: null }
  },
  async mounted() {
    await this.$store.dispatch('siswa/muat')
    try { this.kontrol = await api.kontrolSaya() } catch (e) { this.kontrol = null }
  },
  computed: {
    siswa() { return this.$store.state.siswa.profil || { inisial: '', nama: '', kelas: '', nis: '' } },
    saldo() { return this.$store.state.siswa.saldo },
    labelLimit() {
      const k = this.kontrol
      if (!k) return ''
      if (k.kartu_diblokir) return 'Kartu diblokir oleh orang tua'
      return k.limit_aktif ? 'Sisa limit hari ini ' + this.$rp(k.sisa_limit) : 'Tanpa limit harian'
    },
    hariIni() { return this.$store.getters['siswa/hariIni'] }
  },
  methods: {
    async logout() {
      await this.$store.dispatch('auth/logout')
      this.$router.replace('/login')
    }
  }
  }

</script>

<style scoped>
.wrap { flex: 1; display: flex; flex-direction: column; overflow-y: auto; min-height: 0; }
.atas { padding: 14px 22px 26px; display: flex; flex-direction: column; gap: 26px; flex: none; }
.bar { display: flex; align-items: center; justify-content: space-between; }
.who { display: flex; align-items: center; gap: 11px; }
.av {
  width: 38px; height: 38px; border-radius: var(--r-pill);
  background: rgba(255,255,255,.12); color: #fff;
  display: flex; align-items: center; justify-content: center; font: 700 13px var(--font-display);
}
.who__nama { font: 700 14.5px var(--font-display); color: #fff; }
.who__sub { font: 400 11.5px var(--font-body); color: rgba(255,255,255,.55); }

.saldo { display: flex; flex-direction: column; gap: 7px; }
.saldo__label { font: 500 11.5px var(--font-body); color: rgba(255,255,255,.5); letter-spacing: .1em; }
.saldo__nilai { font: 800 44px var(--font-display); color: #fff; letter-spacing: -.035em; }
.saldo__limit { display: flex; align-items: center; gap: 7px; font: 400 12px var(--font-body); color: rgba(255,255,255,.6); margin-top: 2px; }
.saldo__limit i { width: 6px; height: 6px; border-radius: var(--r-pill); background: var(--green); }

.sheet { flex: 1; background: #fff; border-radius: 24px 24px 0 0; padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.qrcard { border: 1px solid var(--line); border-radius: var(--r-md); padding: 18px; display: flex; align-items: center; gap: 16px; color: inherit; }
.qrcard:hover { border-color: var(--blue); color: inherit; }
.qrcard__thumb {
  width: 78px; height: 78px; flex: none; border-radius: var(--r-sm);
  border: 1px solid var(--line); overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.qrcard__body { flex: 1; }
.qrcard__judul { font: 700 15px var(--font-display); }
.qrcard__body p { margin: 3px 0 0; font: 400 12.5px/1.5 var(--font-body); color: var(--muted); text-wrap: pretty; }

.sec { display: flex; align-items: center; justify-content: space-between; font: 700 13px var(--font-display); }
.link { font: 600 12px var(--font-body); }
.list { display: flex; flex-direction: column; }

.settings-wrap { position: relative; }
.settings-btn { width: 36px; height: 36px; border: 0; border-radius: 50%; background: rgba(255,255,255,.08); color: rgba(255,255,255,.72); display:flex; align-items:center; justify-content:center; cursor:pointer; }
.settings-btn:hover { background: rgba(255,255,255,.15); color:#fff; }
.settings-menu { position:absolute; right:0; top:43px; width:120px; background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.16); overflow:hidden; z-index:30; }
.settings-menu__title { padding:9px 11px 6px; font:600 10px var(--font-body); color:var(--muted); }
.settings-menu button { width:100%; border:0; background:#fff; text-align:left; padding:8px 11px 10px; color:var(--coral); cursor:pointer; font:700 11px var(--font-body); }
.settings-menu__link { display:block; padding:8px 11px; color:var(--ink); text-decoration:none; font:700 11px var(--font-body); }
.settings-menu button:hover { background:#fff5f4; }
</style>

