export default function ({ store, redirect }) {
  if (process.server) return
  const role = store.state.auth && store.state.auth.user ? store.state.auth.user.role : null
  if (role !== 'ortu') redirect('/ortu')
}
