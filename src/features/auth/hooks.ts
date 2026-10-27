import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { authPaths, authViewAt, pagePaths, type AuthView } from '../../app/navigation'
import { isAuthConfigured, readAuthRedirect, readAuthSession, subscribeToAuthChanges, signUpWithPassword,
  signInWithPassword, requestPasswordReset, updateAuthPassword, resendConfirmationEmail, signOut as signOutRequest } from './api'
import type { AuthActionResult, AuthCredentials, AuthCredentialView, AuthSession } from './types'

type Lifetime = { active: boolean }
type PendingAction = {
  id: symbol; kind: AuthCredentialView | 'resend' | 'signout'; email: string
  lifetime: Lifetime; isCurrent: boolean; acceptedIdentityChange: boolean; expectedPath?: string
}

export function useAuth() {
  const [{ callbackPath, resetPath, callbackError, hasCredentials }] = useState(readAuthRedirect)
  const configured = isAuthConfigured()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [ready, setReady] = useState(!configured)
  const location = useLocation()
  const routeNavigate = useNavigate()
  const authNavigate = useEffectEvent((path: string) => routeNavigate(path, { replace: true }))
  const view = authViewAt(location.pathname)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(callbackError ? 'This link is invalid or expired. Please request a new email.' : '')
  const [feedbackPath, setFeedbackPath] = useState(location.pathname)
  const [notice, setNotice] = useState('')
  const [linkFailed, setLinkFailed] = useState(callbackError)
  const [cooldown, setCooldown] = useState(0)
  const lifetimeRef = useRef<Lifetime | null>(null)
  const pendingActionRef = useRef<PendingAction | null>(null)
  const identityRef = useRef<string | undefined>(undefined)
  const routeRef = useRef<{ key: string; pathname: string } | null>(null)
  const initialCleanupPathRef = useRef<string | null>(null)

  if (feedbackPath !== location.pathname) {
    setFeedbackPath(location.pathname)
    setError('')
    if (location.pathname !== pagePaths['my-home']) setNotice('')
  }

  // A route visit, including Back to the same URL, is a distinct interaction.
  useLayoutEffect(() => {
    if (routeRef.current?.key === location.key) return
    routeRef.current = { key: location.key, pathname: location.pathname }
    // SDK callback URL cleanup can commit after ready renders the form. It is
    // still the same interaction, rather than a user leaving/revisiting it.
    if (initialCleanupPathRef.current === location.pathname) {
      initialCleanupPathRef.current = null
      return
    }
    const pending = pendingActionRef.current
    if (pending) {
      if (pending.expectedPath === location.pathname) pending.expectedPath = undefined
      else pending.isCurrent = false
    }
  }, [location.key, location.pathname])

  useEffect(() => {
    const lifetime = { active: true }
    lifetimeRef.current = lifetime
    if (!configured) return () => { lifetime.active = false }
    const origin = routeRef.current
    let sessionRevision = 0
    const unsubscribe = subscribeToAuthChanges((event, next) => {
      if (!lifetime.active) return
      sessionRevision += 1
      const pending = pendingActionRef.current
      if (identityRef.current !== next?.user.id) {
        const expected = pending?.isCurrent && !pending.acceptedIdentityChange && (
          (pending.kind === 'signout' && event === 'SIGNED_OUT' && !next) ||
          ((pending.kind === 'signin' || pending.kind === 'signup') && event === 'SIGNED_IN' &&
            next?.user.email?.toLowerCase() === pending.email.toLowerCase())
        )
        if (pending) {
          if (expected) pending.acceptedIdentityChange = true
          else pending.isCurrent = false
        }
        identityRef.current = next?.user.id
        setError('')
        setNotice('')
      }
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') authNavigate(authPaths.reset)
      if (event === 'SIGNED_OUT') {
        // This event's existing home redirect is an expected effect of sign-out.
        if (pending?.kind === 'signout' && pending.isCurrent) pending.expectedPath = pagePaths['my-home']
        authNavigate(pagePaths['my-home'])
      }
    })
    const revision = sessionRevision
    void readAuthSession().then(({ data, error: failure }) => {
      if (!lifetime.active) return
      // A newer SDK event is authoritative over an older restoration snapshot.
      if (revision === sessionRevision) {
        identityRef.current = data.session?.user.id
        setSession(data.session)
      }
      setReady(true)
      if (origin !== routeRef.current) return
      if (failure && (callbackPath || resetPath)) setLinkFailed(true)
      if (failure) setError(callbackPath || resetPath
        ? 'This link could not be verified. Please request a new email.'
        : 'We could not restore your session. Please sign in again.')
      if (callbackPath || resetPath) {
        initialCleanupPathRef.current = resetPath ? authPaths.reset : authPaths.callback
        authNavigate(resetPath ? authPaths.reset : authPaths.callback)
        if (callbackPath && hasCredentials && !callbackError && !failure && data.session?.user.email_confirmed_at) {
          initialCleanupPathRef.current = pagePaths['my-home']
          authNavigate(pagePaths['my-home'])
          setNotice('Your email is confirmed. Welcome to The Crowded Table.')
        } else if ((!data.session || (callbackPath && !hasCredentials)) && !callbackError) {
          setError('This link is missing or expired. Please request a new email.')
        }
      }
    }).catch(() => {
      if (!lifetime.active) return
      setReady(true)
      if (origin === routeRef.current) setError('Unable to connect. Please reload and try again.')
    })
    return () => {
      lifetime.active = false
      unsubscribe()
      if (pendingActionRef.current?.lifetime === lifetime) pendingActionRef.current = null
    }
  }, [configured, callbackPath, resetPath, callbackError, hasCredentials])

  useEffect(() => {
    if (!view) return
    const label = view === 'reset' ? 'Reset password' : view === 'create-community' ? 'Start New Community' : 'Your account'
    document.title = `${label} · The Crowded Table`
  }, [view])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function navigate(next: AuthView | null) {
    setError('')
    setNotice('')
    routeNavigate(next ? authPaths[next] : pagePaths['my-home'])
  }
  async function run(kind: PendingAction['kind'], email: string, action: () => Promise<void>, onSuccess: () => void): Promise<AuthActionResult> {
    const lifetime = lifetimeRef.current
    if (!configured || !lifetime?.active || pendingActionRef.current) return 'ignored'
    const pending: PendingAction = { id: Symbol(kind), kind, email, lifetime, isCurrent: true, acceptedIdentityChange: false }
    // Claim synchronously: a second submit cannot slip through before React renders busy.
    pendingActionRef.current = pending
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      if (!lifetime.active || !pending.isCurrent) return 'obsolete'
      onSuccess()
      return 'success'
    } catch (failure) {
      if (!lifetime.active || !pending.isCurrent) return 'obsolete'
      setError(failure instanceof Error ? failure.message : 'Something went wrong. Please try again.')
      return 'failed'
    } finally {
      // Release only this request's lock, even when its page effects became obsolete.
      if (pendingActionRef.current?.id === pending.id) {
        pendingActionRef.current = null
        if (lifetime.active) setBusy(false)
      }
    }
  }
  function submitCredentials(credentialView: AuthCredentialView, credentials: AuthCredentials, clearForm: () => void) {
    const email = credentials.email.trim()
    if (credentialView === 'forgot' && cooldown > 0) return Promise.resolve<AuthActionResult>('ignored')
    return run(credentialView, email, async () => {
      if (credentialView === 'signup') await signUpWithPassword({ email, password: credentials.password })
      else if (credentialView === 'signin') await signInWithPassword({ email, password: credentials.password })
      else if (credentialView === 'forgot') await requestPasswordReset(email)
      else {
        if (!session || linkFailed) throw new Error('Please request a new password reset link.')
        if (credentials.password !== credentials.confirm) throw new Error('The passwords do not match.')
        await updateAuthPassword(credentials.password)
      }
    }, () => {
      if (credentialView === 'forgot') {
        setNotice('If an account uses that email, a password reset link is on its way.')
        setCooldown(60)
      } else {
        clearForm()
        navigate(credentialView === 'signup' ? 'check' : null)
        if (credentialView === 'signup') setCooldown(60)
        if (credentialView === 'reset') setNotice('Your password has been updated.')
      }
    })
  }
  function resend(email: string) {
    if (cooldown > 0) return Promise.resolve<AuthActionResult>('ignored')
    return run('resend', email.trim(), () => resendConfirmationEmail(email.trim()), () => {
      setCooldown(60)
      setNotice('If your account needs confirmation, a new link is on its way.')
    })
  }
  function signOut() {
    return run('signout', '', signOutRequest, () => {
      identityRef.current = undefined
      setSession(null)
      navigate(null)
    })
  }
  const verified = Boolean(session?.user.email_confirmed_at)
  return { session, ready, configured, view, verified, verifiedUserId: verified ? session?.user.id : undefined,
    busy, setBusy, error, notice, linkFailed, cooldown, submitCredentials, resend, signOut }
}
