import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { supabase, configurationError } from '../lib/supabase'
import { createSessionController } from './session'
import './auth.css'

const ProtectedApp = lazy(() => import('../App'))

export default function AuthGate() {
  const [session, setSession] = useState({ status: 'checking', error: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const controller = useRef(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    if (!supabase) return () => { mounted.current = false }
    const current = createSessionController(supabase, next => {
      setSession(next)
      if (next.status !== 'signed-out') setPassword('')
    }, () => {
      // The protected app registers synchronous draft cleanup after mounting.
      window.dispatchEvent(new Event('ideaflow-clear-drafts'))
      window.location.reload()
    })
    controller.current = current
    const focus = () => current.recheck()
    window.addEventListener('focus', focus)
    return () => { mounted.current = false; current.stop(); window.removeEventListener('focus', focus) }
  }, [])

  async function act(action) {
    if (busy) return
    setBusy(true); setError('')
    try { await action() }
    catch (failure) { if (mounted.current) setError(failure.message) }
    finally { if (mounted.current) { setBusy(false); setPassword('') } }
  }

  if (configurationError || !supabase) return <main className="auth-page"><section className="auth-card"><h1>Setup required</h1><p role="alert">{configurationError || 'The database connection is unavailable.'}</p></section></main>
  if (session.status === 'authorized') return <>
    <Suspense fallback={<main className="auth-page"><p role="status">Loading your dataset…</p></main>}><ProtectedApp accountId={session.userId} onSignOut={() => act(() => controller.current.signOut())} /></Suspense>
  </>
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title">
    <p className="auth-brand">IdeaFlow · Private dataset</p>
    <h1 id="auth-title">{session.status === 'checking' ? 'Checking access…' : session.status === 'denied' ? 'Access unavailable' : 'Sign in'}</h1>
    {session.status === 'checking' ? <p role="status">Please wait while we verify your session.</p> : <>
      {(error || session.error) && <p id="auth-error" className="auth-error" role="alert">{error || session.error}</p>}
      {session.status === 'denied' ? <div className="auth-actions">
        <button disabled={busy} onClick={() => act(() => controller.current.retry())}>Retry access check</button>
        <button disabled={busy} onClick={() => act(() => controller.current.signOut())}>Use another account</button>
      </div> : <form onSubmit={event => { event.preventDefault(); void act(() => controller.current.signIn(email, password)) }} aria-describedby={error || session.error ? 'auth-error' : undefined}>
        <label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
        <label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="auth-help">Use the account provisioned by your administrator. For password recovery, contact the administrator. You will need to sign in again after refreshing or closing this page.</p>
      </form>}
    </>}
  </section></main>
}
