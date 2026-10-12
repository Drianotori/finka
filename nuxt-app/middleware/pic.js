export default function ({ store, redirect }) {
  if (process.server) return
  const role = store.state.auth && store.state.auth.user ? store.state.auth.user.role : null
  if (role !== 'pic') {
    if (role === 'admin') return redirect('/admin')
    if (role === 'ortu') return redirect('/ortu')
    if (role === 'siswa') return redirect('/siswa')
    return redirect('/login')
  }
}
