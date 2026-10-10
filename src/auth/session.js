// The database RPC is authoritative; a valid Auth session alone grants no app access.
export function createSessionController(client, onChange, onExit) {
  let stopped = false, revision = 0, admittedId = null, session = null
  let state = { status: 'checking', error: '' }
  const publish = next => { if (!stopped) { state = next; onChange(next) } }
  const leave = message => {
    revision++
    if (admittedId) {
      publish({ status: 'checking', error: '' })
      onExit() // Discard app memory. Already-sent requests may still finish server-side.
    } else publish({ status: 'signed-out', error: message || '' })
  }
  async function check(nextSession) {
    if (stopped) return
    const ticket = ++revision
    session = nextSession
    if (!nextSession?.user?.id) { leave(); return }
    if (admittedId && admittedId !== nextSession.user.id) { leave(); return }
    if (!admittedId) publish({ status: 'checking', error: '' })
    try {
      const { data, error } = await client.rpc('can_access_ideas')
      if (stopped || ticket !== revision) return
      if (error) throw error
      if (data !== true) {
        if (admittedId) { leave(); return }
        publish({ status: 'denied', error: 'This account does not have access to this dataset.' })
        return
      }
      admittedId = nextSession.user.id
      publish({ status: 'authorized', error: '' })
    } catch {
      if (stopped || ticket !== revision) return
      if (admittedId) { leave(); return }
      publish({ status: 'denied', error: 'Access could not be verified. Try again or contact the administrator.' })
    }
  }
  // Defer work outside the auth callback to avoid holding the SDK's auth lock.
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, value) => {
    session = value
    const ticket = ++revision
    setTimeout(() => { if (!stopped && ticket === revision) void check(value) }, 0)
  })
  const initialRevision = revision
  void client.auth.getSession().then(({ data, error }) => {
    if (stopped || revision !== initialRevision) return
    if (error) leave('Your session could not be loaded. Please sign in again.')
    else void check(data?.session)
  }).catch(() => { if (!stopped && revision === initialRevision) leave('Your session could not be loaded. Please sign in again.') })

  return {
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (stopped) return
      if (error) throw new Error('Sign-in failed. Check your email and password, then try again.')
      if (!data?.session) throw new Error('Sign-in did not return a session. Please try again.')
      await check(data.session)
    },
    async signOut() {
      // Clear the app immediately, even if the server is unreachable. Sessions are memory-only.
      if (admittedId) { leave(); return }
      revision++
      const { error } = await client.auth.signOut({ scope: 'local' })
      if (error) throw new Error('Sign-out failed. Reload this page to clear the local session.')
      session = null
      publish({ status: 'signed-out', error: '' })
    },
    retry: () => check(session),
    recheck: () => { if (state.status === 'authorized') void check(session) },
    stop() { stopped = true; revision++; subscription.unsubscribe() },
  }
}
