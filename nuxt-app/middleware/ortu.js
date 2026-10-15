export default function ({ store, redirect }) {
  const user = store.state.auth ? store.state.auth.user : null

  // Arahkan non-ortu ke /login agar tidak terjadi loop redirect ke /ortu
  if (!user || user.role !== 'ortu') {
    return redirect('/login')
  }
}
