// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { isAuthConfigured, readAuthRedirect, readAuthSession, subscribeToAuthChanges, signUpWithPassword,
  signInWithPassword, requestPasswordReset, updateAuthPassword, resendConfirmationEmail, signOut } from './api'

const fixture = vi.hoisted(() => ({
  configured: true, initialized: Promise.resolve({ error: null as Error | null }),
  redirect: { callbackPath: false, resetPath: true, callbackError: false, hasCredentials: true },
  auth: { getSession: vi.fn(), onAuthStateChange: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), resend: vi.fn(), signOut: vi.fn() },
}))
vi.mock('../../lib/supabase', () => ({
  get supabase() { return fixture.configured ? { auth: fixture.auth } : null },
  get authInitialization() { return fixture.initialized },
  get initialAuthRedirect() { return fixture.redirect },
}))
beforeEach(() => {
  vi.resetAllMocks()
  fixture.configured = true
  fixture.initialized = Promise.resolve({ error: null })
  for (const method of Object.values(fixture.auth)) method.mockResolvedValue({ error: null })
})
it('exposes only copied redirect metadata and explicit unavailable-service failures', async () => {
  const redirect = readAuthRedirect()
  redirect.hasCredentials = false
  expect(fixture.redirect.hasCredentials).toBe(true)
  fixture.configured = false
  expect(isAuthConfigured()).toBe(false)
  await expect(signInWithPassword({ email: 'sample@example.test', password: 'fictional' })).rejects.toThrow('not configured')
  expect(fixture.auth.signInWithPassword).not.toHaveBeenCalled()
})
it('waits for SDK initialization and preserves its error over an older session error', async () => {
  let initialize!: (value: { error: Error | null }) => void
  fixture.initialized = new Promise(resolve => { initialize = resolve })
  const initializationError = new Error('Invalid callback')
  const stored = { data: { session: { user: { id: 'stored-user' } } }, error: new Error('Session error') }
  fixture.auth.getSession.mockResolvedValue(stored)
  const result = readAuthSession()
  expect(fixture.auth.getSession).not.toHaveBeenCalled()
  initialize({ error: initializationError })
  expect(await result).toEqual({ ...stored, error: initializationError })
})
it('forwards Auth events and exposes the exact subscription cleanup', () => {
  const unsubscribe = vi.fn(), listener = vi.fn()
  fixture.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } })
  const cleanup = subscribeToAuthChanges(listener)
  expect(fixture.auth.onAuthStateChange).toHaveBeenCalledWith(listener)
  cleanup()
  expect(unsubscribe).toHaveBeenCalledOnce()
})
it('preserves all credential/email payloads, exact redirects and local sign-out', async () => {
  const credentials = { email: 'sample@example.test', password: 'fictional-password' }
  await signUpWithPassword(credentials)
  await signInWithPassword(credentials)
  await requestPasswordReset(credentials.email)
  await updateAuthPassword(credentials.password)
  await resendConfirmationEmail(credentials.email)
  await signOut()
  expect(fixture.auth.signUp).toHaveBeenCalledWith({ ...credentials, options: { emailRedirectTo: 'http://localhost:3000/auth/callback' } })
  expect(fixture.auth.signInWithPassword).toHaveBeenCalledWith(credentials)
  expect(fixture.auth.resetPasswordForEmail).toHaveBeenCalledWith(credentials.email, { redirectTo: 'http://localhost:3000/auth/reset-password' })
  expect(fixture.auth.updateUser).toHaveBeenCalledWith({ password: credentials.password })
  expect(fixture.auth.resend).toHaveBeenCalledWith({ type: 'signup', email: credentials.email, options: { emailRedirectTo: 'http://localhost:3000/auth/callback' } })
  expect(fixture.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
})
it.each(['signup', 'signin', 'forgot', 'reset', 'resend', 'signout'])('preserves the original %s SDK failure', async kind => {
  const failure = Object.assign(new Error('Specific SDK reason'), { code: 'sample_code', status: 429 })
  const operations = {
    signup: [fixture.auth.signUp, () => signUpWithPassword({ email: 'sample@example.test', password: 'fictional' })],
    signin: [fixture.auth.signInWithPassword, () => signInWithPassword({ email: 'sample@example.test', password: 'fictional' })],
    forgot: [fixture.auth.resetPasswordForEmail, () => requestPasswordReset('sample@example.test')],
    reset: [fixture.auth.updateUser, () => updateAuthPassword('fictional')],
    resend: [fixture.auth.resend, () => resendConfirmationEmail('sample@example.test')],
    signout: [fixture.auth.signOut, () => signOut()],
  } as const
  const [method, action] = operations[kind as keyof typeof operations]
  method.mockResolvedValue({ error: failure })
  await expect(action()).rejects.toBe(failure)
})
