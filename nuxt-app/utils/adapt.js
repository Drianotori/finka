const NAMA_BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// Format tanggal polos 'YYYY-MM-DD' (mis. jatuh_tempo tagihan) jadi '10 Sep 2026'
export function tanggalIndo(ymd) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  return d + ' ' + NAMA_BULAN_ID[m - 1] + ' ' + y
}

// SQLite datetime('now') menyimpan UTC. Tampilkan dalam WIB (UTC+7) biar
// jamnya masuk akal buat pengguna di Indonesia.
function bagianWaktu(sqliteDatetimeUTC) {
  if (!sqliteDatetimeUTC) return { tanggalKey: '', jam: '', label: '' }
  const utc = new Date(sqliteDatetimeUTC.replace(' ', 'T') + 'Z')
  const wib = new Date(utc.getTime() + 7 * 3600 * 1000)
  const jam = String(wib.getUTCHours()).padStart(2, '0') + '.' + String(wib.getUTCMinutes()).padStart(2, '0')
  const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const tanggalKey = wib.getUTCFullYear() + '-' + String(wib.getUTCMonth() + 1).padStart(2, '0') + '-' + String(wib.getUTCDate()).padStart(2, '0')
  const label = wib.getUTCDate() + ' ' + namaBulan[wib.getUTCMonth()] + ' ' + wib.getUTCFullYear()
  return { tanggalKey, jam, label }
}

const JUDUL = {
  topup: 'Top-up saldo',
  pembelian: 'Belanja',
  tarik_tunai: 'Tarik tunai',
  bayar_tagihan: 'Bayar tagihan',
  penyesuaian: 'Penyesuaian saldo'
}

export function trxDariLedger(row) {
  const w = bagianWaktu(row.created_at)
  return {
    id: row.id,
    judul: JUDUL[row.tipe] || row.tipe,
    meta: w.jam + (row.keterangan ? ' · ' + row.keterangan : ''),
    kasir: row.oleh_nama || (row.nominal > 0 ? 'Admin Yayasan' : 'Kasir'),
    nominal: row.nominal,
    sisa: row.sisa,
    tanggalKey: w.tanggalKey,
    tanggalLabel: w.label
  }
}

