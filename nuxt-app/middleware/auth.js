export default function ({ store, redirect, route }) {
  if (process.server) return // token cuma ada di localStorage browser, cek di client saja

  const cekDanRedirect = () => {
    if (!store.state.auth.token) {
      redirect('/login?next=' + encodeURIComponent(route.fullPath))
      return
    }
    // Password sementara (hasil reset/impor) wajib diganti sebelum memakai aplikasi.
    const u = store.state.auth.user
    if (u && u.wajib_ganti_password && route.path !== '/akun/password') redirect('/akun/password')
  }

  if (store.state.auth.siap) {
    cekDanRedirect()
    return
  }

  // rehydrate plugin belum selesai — tunggu, dan tahan render sampai tahu
  // (return Promise supaya Nuxt betulan menunggu sebelum merender halaman)
  return new Promise((resolve) => {
    const berhenti = store.watch(
      (s) => s.auth.siap,
      (siap) => {
        if (siap) { berhenti(); cekDanRedirect(); resolve() }
      }
    )
  })
}

