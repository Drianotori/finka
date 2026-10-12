import Vue from 'vue'

export const num = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID')
export const rp = (n) => 'Rp ' + num(n)
export const parseRp = (s) => parseInt(String(s).replace(/\D/g, ''), 10) || 0

// Tampilkan timestamp ISO dari server sebagai waktu WIB yang mudah dibaca,
// mis. "4 Okt 2026, 20.36". Teks biasa ("Sekarang", "Jatuh tempo …") dibiarkan.
export const waktu = (v) => {
  if (!v) return ''
  const s = String(v)
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return s
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.')
  return tgl + ', ' + jam
}
export const sapaan = () => {
  const jam = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }))
  return jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam'
}

Vue.filter('rp', rp)
Vue.filter('waktu', waktu)
Vue.filter('num', num)

Vue.mixin({
  methods: { $rp: rp, $num: num, $parseRp: parseRp, $sapaan: sapaan }
})

export default (ctx, inject) => {
  inject('format', { rp, num, parseRp })
}

