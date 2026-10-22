<template>
  <div class="page">
    <div class="card kolom">
      <div class="h display">Rekening tujuan top-up</div>
      <div class="rek">
        <div><span>Bank</span><b>BCA</b></div>
        <div><span>Nomor rekening</span><b class="num">872 011 4556</b></div>
        <div><span>Atas nama</span><b>Yayasan Nurul Ilmi</b></div>
      </div>

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
      <div class="kolom__head">
        <span class="h display">Akun PIC &amp; hak akses</span>
        <button v-if="admin" type="button" class="btn-sm" @click="formOn = true">Tambah akun</button>
      </div>

      <div v-for="(u, i) in akun" :key="u.nama + i" class="akun">
        <span class="av">{{ inisial(u.nama) }}</span>
        <span class="akun__id">
          <b>{{ u.nama }}</b>
          <i>{{ u.peran }}</i>
        </span>
        <span class="badge" :class="u.aktif ? 'badge--ok' : 'badge--off'">{{ u.status }}</span>
      </div>
    </div>

    <FormAkunModal v-if="formOn" @tutup="formOn = false" @berhasil="akunBaru" />
    <ToastNotif v-if="toast" :key="toast.id" :pesan="toast.pesan" :aksi="toast.aksi" @tutup="toast = null" />
  </div>
</template>

<script>
export default {
  layout: 'admin',
  data() {
    return {
      formOn: false,
      toast: null,
      aturan: [
        { label: 'Panjang kode unik', ket: 'Ditambahkan ke nominal dasar', nilai: '3 digit' },
        { label: 'Masa berlaku', ket: 'Lewat batas, kode kembali ke pool', nilai: '24 jam' },
        { label: 'Ambang saldo menipis', ket: 'Pemicu notifikasi ke orang tua', nilai: 'Rp 20.000' }
      ],
      akun: [
        { nama: 'Bu Ratna', peran: 'PIC · Kantin Utama', status: 'Sesi buka', aktif: true },
        { nama: 'Bu Lilis', peran: 'PIC · Kantin Blok B', status: 'Aktif', aktif: true },
        { nama: 'Pak Yusuf', peran: 'PIC · Koperasi Sekolah', status: 'Sesi buka', aktif: true },
        { nama: 'Hendra Wijaya', peran: 'Admin Yayasan', status: 'Aktif', aktif: true },
        { nama: 'Rina Kusuma', peran: 'Monitoring · read-only', status: 'Nonaktif', aktif: false }
      ]
    }
  },
  computed: {
    admin() { return this.$store.getters['admin/admin'] }
  },
  methods: {
    inisial(n) { return n.split(' ').map((w) => w[0]).join('').slice(0, 2) },
    akunBaru({ jenis, nama, kelas, outlet }) {
      const JENIS = { ortu: 'orang tua', siswa: 'siswa', pic: 'PIC' }
      let aksi = null
      if (jenis === 'pic') {
        // PIC tampil langsung di daftar "Akun PIC & hak akses" pada halaman ini
        this.akun.push({ nama, peran: 'PIC · ' + outlet, status: 'Aktif', aktif: true })
      } else {
        aksi = { label: 'Lihat di Daftar Akun', to: { path: '/admin/akun', query: jenis === 'siswa' ? { tab: 'siswa', kelas } : { tab: 'ortu' } } }
      }
      this.toast = { id: Date.now(), pesan: 'Akun ' + JENIS[jenis] + ' ' + nama + ' berhasil didaftarkan.', aksi }
    }
  }
}
</script>

<style scoped>
.page { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.kolom { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.kolom__head { display: flex; align-items: center; justify-content: space-between; }
.h { font: 700 14px var(--font-display); }
.btn-sm { border: none; background: var(--blue); color: #fff; font: 600 12.5px var(--font-body); padding: 9px 15px; border-radius: var(--r-sm); cursor: pointer; }

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
