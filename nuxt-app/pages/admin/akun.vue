<template>
  <div class="page">
    <div class="tabs">
      <button class="tab" :class="tab === 'siswa' ? 'tab--on' : ''" @click="tab = 'siswa'">
        Akun Siswa <span class="tab__n">{{ akunSiswa.length }}</span>
      </button>
      <button class="tab" :class="tab === 'ortu' ? 'tab--on' : ''" @click="tab = 'ortu'">
        Akun Orang Tua <span class="tab__n">{{ akunOrtu.length }}</span>
      </button>
      <button class="tab" :class="tab === 'kantin' ? 'tab--on' : ''" @click="tab = 'kantin'">
        Akun Kantin <span class="tab__n">{{ akunKantin.length }}</span>
      </button>
      <button class="tab" :class="tab === 'admin' ? 'tab--on' : ''" @click="tab = 'admin'">
        Daftar Admin <span class="tab__n">{{ akunAdmin.length }}</span>
      </button>
      <button v-if="admin" type="button" class="btn-sm" @click="formOn = true">Tambah akun</button>
    </div>

    <!-- Akun siswa per kelas -->
    <div v-if="tab === 'siswa'" class="isi">
      <div class="kelasBar">
        <button
          v-for="k in daftarKelasAkun"
          :key="k"
          class="chip"
          :class="kelasAktif === k ? 'chip--on' : ''"
          @click="kelasAktif = k"
        >
          {{ k }} <i>{{ akunSiswaKelas(k).length }}</i>
        </button>
      </div>

      <div class="card tabel">
        <div class="tabel__head">
          <div>
            <div class="h display">Kelas {{ kelasAktif }}</div>
            <div class="sub">{{ akunSiswaKelas(kelasAktif).length }} akun siswa terdaftar</div>
          </div>
        </div>
        <div class="baris baris--head">
          <div>NAMA</div><div>NIS</div><div>ORANG TUA</div><div>STATUS</div>
        </div>
        <div v-for="u in akunSiswaKelas(kelasAktif)" :key="u.nis" class="baris">
          <div class="nama">
            <span class="av">{{ inisial(u.nama) }}</span>
            <span><b>{{ u.nama }}</b><i>Kelas {{ u.kelas }}{{ profil(u) }}</i></span>
          </div>
          <div class="muted num">{{ u.nis }}</div>
          <div class="muted">{{ u.ortu }}</div>
          <div><span class="badge" :class="u.status === 'Aktif' ? 'badge--ok' : 'badge--off'">{{ u.status }}</span></div>
        </div>
      </div>
    </div>

    <!-- Akun orang tua -->
    <div v-if="tab === 'ortu'" class="isi">
      <div class="card tabel">
        <div class="tabel__head">
          <div>
            <div class="h display">Akun orang tua</div>
            <div class="sub">Wali murid yang mengisi saldo dan membayar tagihan</div>
          </div>
        </div>
        <div class="baris baris--head baris--ortu">
          <div>NAMA</div><div>NOMOR HP</div><div>ANAK</div><div>STATUS</div>
        </div>
        <div v-for="(u, i) in akunOrtu" :key="u.hp + i" class="baris baris--ortu">
          <div class="nama">
            <span class="av">{{ inisial(u.nama) }}</span>
            <span><b>{{ u.nama }}</b><i v-if="u.hubungan">{{ u.hubungan }}{{ profil(u) }}</i></span>
          </div>
          <div class="muted num">{{ u.hp }}</div>
          <div class="muted">{{ namaAnak(u.nama) }}</div>
          <div><span class="badge" :class="u.status === 'Aktif' ? 'badge--ok' : 'badge--off'">{{ u.status }}</span></div>
        </div>
      </div>
    </div>

    <!-- Akun kantin -->
    <div v-if="tab === 'kantin'" class="isi">
      <div class="card tabel">
        <div class="tabel__head">
          <div>
            <div class="h display">Akun kantin &amp; koperasi</div>
            <div class="sub">Akun PIC yang mengelola setiap outlet</div>
          </div>
        </div>
        <div class="baris baris--head baris--3">
          <div>NAMA</div><div>OUTLET</div><div>STATUS</div>
        </div>
        <div v-for="(u, i) in akunKantin" :key="u.nama + i" class="baris baris--3">
          <div class="nama">
            <span class="av">{{ inisial(u.nama) }}</span>
            <span><b>{{ u.nama }}</b><i>{{ u.peran }}{{ profil(u) }}</i></span>
          </div>
          <div class="muted">{{ u.outlet }}</div>
          <div><span class="badge" :class="u.status === 'Aktif' ? 'badge--ok' : 'badge--off'">{{ u.status }}</span></div>
        </div>
      </div>
    </div>

    <!-- Daftar admin -->
    <div v-if="tab === 'admin'" class="isi">
      <div class="card tabel">
        <div class="tabel__head">
          <div>
            <div class="h display">Daftar admin</div>
            <div class="sub">Akun dengan akses ke panel Admin Yayasan</div>
          </div>
        </div>
        <div class="baris baris--head baris--3">
          <div>NAMA</div><div>PERAN</div><div>STATUS</div>
        </div>
        <div v-for="u in akunAdmin" :key="u.nama" class="baris baris--3">
          <div class="nama">
            <span class="av">{{ inisial(u.nama) }}</span>
            <span><b>{{ u.nama }}</b></span>
          </div>
          <div class="muted">{{ u.peran }}</div>
          <div><span class="badge" :class="u.status === 'Aktif' ? 'badge--ok' : 'badge--off'">{{ u.status }}</span></div>
        </div>
      </div>
    </div>

    <FormAkunModal v-if="formOn" @tutup="formOn = false" @berhasil="akunBaru" />
    <ToastNotif v-if="toast" :key="toast.id" :pesan="toast.pesan" @tutup="toast = null" />
  </div>
</template>

<script>
export default {
  layout: 'admin',
  data() {
    return {
      tab: 'siswa',
      kelasAktif: null,
      formOn: false,
      toast: null
    }
  },
  computed: {
    akunSiswa() { return this.$store.state.admin.akunSiswa },
    akunOrtu() { return this.$store.state.admin.akunOrtu },
    akunKantin() { return this.$store.state.admin.akunKantin },
    admin() { return this.$store.getters['admin/admin'] },
    akunAdmin() { return this.$store.state.admin.akunAdmin },
    daftarKelasAkun() { return this.$store.getters['admin/daftarKelasAkun'] }
  },
  created() {
    this.kelasAktif = this.daftarKelasAkun[0]
    // Dibuka dari notifikasi "Lihat di Daftar Akun": /admin/akun?tab=siswa&kelas=7A
    const { tab, kelas } = this.$route.query
    if (['siswa', 'ortu', 'kantin', 'admin'].indexOf(tab) >= 0) this.tab = tab
    if (kelas && this.daftarKelasAkun.indexOf(kelas) >= 0) this.kelasAktif = kelas
  },
  methods: {
    akunSiswaKelas(k) { return this.$store.getters['admin/akunSiswaKelas'](k) },
    // " · Perempuan · 12 Mei 2012" — kosong untuk data awal yang belum punya jenis kelamin / tanggal lahir
    profil(u) {
      const out = []
      if (u.jk) out.push(u.jk === 'L' ? 'Laki-laki' : 'Perempuan')
      if (u.lahir) {
        const [y, m, d] = u.lahir.split('-').map(Number)
        out.push(new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }))
      }
      return out.length ? ' · ' + out.join(' · ') : ''
    },
    inisial(n) { return n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() },
    namaAnak(ortu) {
      const anak = this.$store.getters['admin/anakOrtu'](ortu)
      return anak.length ? anak.map((a) => a.nama).join(', ') : 'Belum ada anak terdaftar'
    },
    // Setelah mendaftar, langsung tampilkan daftar tempat akun baru berada
    akunBaru({ jenis, nama, kelas }) {
      const JENIS = { ortu: 'orang tua', siswa: 'siswa', pic: 'PIC' }
      if (jenis === 'siswa') { this.tab = 'siswa'; this.kelasAktif = kelas }
      else if (jenis === 'ortu') this.tab = 'ortu'
      else this.tab = 'kantin'
      this.toast = { id: Date.now(), pesan: 'Akun ' + JENIS[jenis] + ' ' + nama + ' berhasil didaftarkan.' }
    }
  }
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }

.tabs { display: flex; gap: 8px; }
.tab {
  border: 1px solid var(--line); background: #fff; color: var(--muted);
  font: 600 12.5px var(--font-body); padding: 10px 16px; border-radius: var(--r-sm);
  cursor: pointer; display: flex; align-items: center; gap: 8px;
}
.tab--on, .tab--on:hover { border-color: var(--blue); background: var(--blue-soft); color: var(--blue); }
.tab__n {
  background: var(--bg); color: var(--muted); font: 700 10.5px var(--font-body);
  min-width: 18px; height: 18px; border-radius: var(--r-pill);
  display: flex; align-items: center; justify-content: center; padding: 0 5px;
}
.tab--on .tab__n { background: var(--blue); color: #fff; }
.tabs { align-items: center; flex-wrap: wrap; }
.btn-sm { margin-left: auto; border: none; background: var(--blue); color: #fff; font: 600 12.5px var(--font-body); padding: 10px 16px; border-radius: var(--r-sm); cursor: pointer; }
.btn-sm:hover { background: var(--blue-dark); }

.isi { display: flex; flex-direction: column; gap: 14px; }

.kelasBar { display: flex; gap: 8px; flex-wrap: wrap; }
.kelasBar .chip i { font-style: normal; opacity: .65; margin-left: 4px; }

.tabel { overflow: hidden; }
.tabel__head { padding: 16px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; }
.h { font: 700 14px var(--font-display); }
.sub { font: 400 12px var(--font-body); color: var(--muted); margin-top: 3px; }

.baris { display: grid; grid-template-columns: 2fr 1fr 1.4fr .8fr; padding: 13px 20px; border-top: 1px solid var(--bg); align-items: center; }
.baris--3 { grid-template-columns: 2fr 1.4fr .8fr; }
.baris--ortu { grid-template-columns: 1.6fr 1.1fr 1.8fr .7fr; }
.baris--head { padding: 11px 20px; background: var(--bg); border-top: none; font: 600 11.5px var(--font-body); color: var(--muted); letter-spacing: .03em; }
.nama { display: flex; align-items: center; gap: 11px; }
.av { width: 30px; height: 30px; border-radius: var(--r-pill); background: var(--blue-soft); color: var(--blue); display: flex; align-items: center; justify-content: center; font: 700 11.5px var(--font-display); flex: none; }
.nama b { display: block; font: 600 13px var(--font-body); }
.nama i { display: block; font: 400 11px var(--font-body); color: var(--muted); font-style: normal; margin-top: 1px; }
.muted { font: 400 12.5px var(--font-body); color: var(--muted); }
</style>
