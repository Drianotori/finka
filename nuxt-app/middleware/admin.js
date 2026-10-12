export default function ({ store, redirect }) {
  if (process.server) return
  const role = store.state.auth && store.state.auth.user ? store.state.auth.user.role : null
  if (role !== 'admin') {
    if (role === 'ortu') return redirect('/ortu')
    if (role === 'pic') return redirect('/pic')
    if (role === 'siswa') return redirect('/siswa')
    return redirect('/login')
  }
}
