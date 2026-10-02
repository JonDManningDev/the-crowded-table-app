import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authInitialization, initialAuthRedirect, supabase } from '../lib/supabase'
import './Auth.css'

type View = 'signup' | 'signin' | 'forgot' | 'check' | 'reset' | 'callback' | null
const redirect = (path: string) => `${window.location.origin}${path}`

export function AuthShell({ children }: { children: ReactNode }) {
  const [{ callbackPath, resetPath, callbackError, hasCredentials }] = useState(() => initialAuthRedirect)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [view, setView] = useState<View>(resetPath ? 'reset' : callbackPath ? 'callback' : null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(callbackError ? 'This link is invalid or expired. Please request a new email.' : '')
  const [notice, setNotice] = useState('')
  const [linkFailed, setLinkFailed] = useState(callbackError)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setView('reset')
      if (event === 'SIGNED_OUT') setSession(null)
    })
    const client = supabase
    void (async () => {
      const initialized = await authInitialization
      const result = await client.auth.getSession()
      return { ...result, error: initialized?.error || result.error }
    })().then(({ data, error: failure }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
      if (failure && (callbackPath || resetPath)) setLinkFailed(true)
      if (failure) setError(callbackPath || resetPath ? 'This link could not be verified. Please request a new email.' : 'We could not restore your session. Please sign in again.')
      if (callbackPath || resetPath) {
        // Remove tokens/errors from the address bar after the SDK consumes them.
        window.history.replaceState(null, '', window.location.pathname)
        if (callbackPath && hasCredentials && !callbackError && !failure && data.session?.user.email_confirmed_at) {
          window.history.replaceState(null, '', '/#home')
          setView(null)
          setNotice('Your email is confirmed. Welcome to The Crowded Table.')
        } else if ((!data.session || (callbackPath && !hasCredentials)) && !callbackError) setError('This link is missing or expired. Please request a new email.')
      }
    }).catch(() => { if (active) { setReady(true); setError('Unable to connect. Please reload and try again.') } })
    return () => { active = false; subscription.unsubscribe() }
  }, [callbackPath, resetPath, callbackError, hasCredentials])
  useEffect(() => {
    if (view) document.title = `${view === 'reset' ? 'Reset password' : 'Your account'} · The Crowded Table`
  }, [view])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function navigate(next: View) {
    setError(''); setNotice(''); setView(next)
    if (callbackPath || resetPath) window.history.replaceState(null, '', '/#home')
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const password = String(values.get('password') || '')
    const address = email.trim()
    if (!supabase) return
    const client = supabase
    await run(async () => {
      if (view === 'signup') {
        const { error } = await client.auth.signUp({ email: address, password, options: { emailRedirectTo: redirect('/auth/callback') } })
        if (error) throw error
        form.reset(); setView('check'); setCooldown(60)
      } else if (view === 'signin') {
        const { error } = await client.auth.signInWithPassword({ email: address, password })
        if (error) throw error
        form.reset(); navigate(null); window.location.hash = 'home'
      } else if (view === 'forgot') {
        const { error } = await client.auth.resetPasswordForEmail(address, { redirectTo: redirect('/auth/reset-password') })
        if (error) throw error
        setNotice('If an account uses that email, a password reset link is on its way.'); setCooldown(60)
      } else if (view === 'reset') {
        if (!session || linkFailed) throw new Error('Please request a new password reset link.')
        if (password !== values.get('confirm')) throw new Error('The passwords do not match.')
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        form.reset(); navigate(null); setNotice('Your password has been updated.'); window.location.hash = 'home'
      }
    })
  }
  const verified = Boolean(session?.user.email_confirmed_at)
  const titles = { signup: 'Pull up a chair.', signin: 'Welcome back.', forgot: 'Find your way back.', check: 'Check your email.', reset: 'Choose a new password.', callback: 'Confirm your account.' }
  return <>
    <section className={`auth-bar ${!view ? 'with-preview' : ''}`} aria-label="Your account">
      {!ready ? <span role="status">Checking your session…</span> : verified ? <><span>Signed in as <strong>{session?.user.email}</strong></span><button disabled={busy} onClick={() => void run(async () => { const result = await supabase!.auth.signOut({ scope: 'local' }); if (result.error) throw result.error; navigate(null) })}>Sign out</button></> : <><span>Your next game starts with good company.</span><div><button disabled={busy} onClick={() => navigate('signin')}>Sign in</button><button className="button" disabled={busy} onClick={() => navigate('signup')}>Create Account</button></div></>}
    </section>
    {!view && (notice || error) && <p className="auth-feedback" role={error ? 'alert' : 'status'}>{error || notice}</p>}
    {view ? <main className="auth-page"><section className="panel auth-card"><span className="eyebrow">THE CROWDED TABLE</span><h1>{titles[view]}</h1>
      {!supabase && <p role="alert">Account services are not configured yet. Please try again later.</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      {!ready ? <p role="status">Checking your link…</p> : <>
      {view === 'check' ? <><p>If signup can proceed, we’ll send a confirmation link to your email. Open it to finish creating your account.</p><p>Already have an account? Sign in or reset your password.</p><form className="form" onSubmit={e => { e.preventDefault(); void run(async () => { const { error } = await supabase!.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirect('/auth/callback') } }); if (error) throw error; setCooldown(60); setNotice('If your account needs confirmation, a new link is on its way.') }) }}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy}/></label><button className="button" disabled={busy || cooldown > 0 || !supabase}>{cooldown ? `Resend in ${cooldown}s` : 'Resend confirmation email'}</button></form></> : view === 'callback' ? <p>Request another confirmation email or sign in to continue.</p> : view === 'reset' && (!session || linkFailed) ? <button className="button" onClick={() => navigate('forgot')}>Request a new reset link</button> : <form className="form" onSubmit={submit}>
        {view !== 'reset' && <label>Email address<input type="email" name="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy}/></label>}
        {view !== 'forgot' && <label>{view === 'reset' ? 'New password' : 'Password'}<input type="password" name="password" required minLength={view === 'signin' ? undefined : 12} autoComplete={view === 'signin' ? 'current-password' : 'new-password'} disabled={busy}/>{view !== 'signin' && <small>Use at least 12 characters.</small>}</label>}
        {view === 'reset' && <label>Confirm new password<input type="password" name="confirm" required minLength={12} autoComplete="new-password" disabled={busy}/></label>}
        <button className="button full" disabled={busy || !supabase || (view === 'forgot' && cooldown > 0)}>{busy ? 'Please wait…' : view === 'signup' ? 'Create Account' : view === 'signin' ? 'Sign in' : view === 'reset' ? 'Save new password' : cooldown ? `Try again in ${cooldown}s` : 'Send reset link'}</button>
      </form>}
      <div className="auth-links"><button disabled={busy} onClick={() => navigate('signin')}>Sign in</button><button disabled={busy} onClick={() => navigate('forgot')}>Forgot password?</button><button disabled={busy} onClick={() => navigate('check')}>Resend confirmation</button><button disabled={busy} onClick={() => navigate(null)}>Back to home</button></div>
      </>}
    </section></main> : <><p className="preview-disclosure">Community pages show sample people and activities. Your account is real; preview membership does not grant community access.</p>{children}</>}
  </>
}
