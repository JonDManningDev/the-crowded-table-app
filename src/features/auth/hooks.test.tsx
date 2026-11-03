// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAuth } from './hooks'
import type { AuthActionResult, AuthSession, AuthSessionEvent } from './types'

const api = vi.hoisted(() => ({ isAuthConfigured: vi.fn(), readAuthRedirect: vi.fn(), readAuthSession: vi.fn(),
  subscribeToAuthChanges: vi.fn(), signUpWithPassword: vi.fn(), signInWithPassword: vi.fn(), requestPasswordReset: vi.fn(),
  updateAuthPassword: vi.fn(), resendConfirmationEmail: vi.fn(), signOut: vi.fn() }))
vi.mock('./api', () => api)
let emit!: (event: AuthSessionEvent, session: AuthSession | null) => void
const unsubscribe = vi.fn()
const session = (id = 'user-one', email = 'sample@example.test') => ({ user: { id, email, email_confirmed_at: '2026-10-27' } }) as AuthSession
const credentials = { email: ' sample@example.test ', password: 'fictional-password', confirm: 'fictional-password' }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function mount(path = '/auth/forgot-password') {
  return renderHook(() => ({ auth: useAuth(), navigate: useNavigate(), location: useLocation() }), {
    wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  api.isAuthConfigured.mockReturnValue(true)
  api.readAuthRedirect.mockReturnValue({ callbackPath: false, resetPath: false, callbackError: false, hasCredentials: false })
  api.readAuthSession.mockResolvedValue({ data: { session: null }, error: null })
  api.subscribeToAuthChanges.mockImplementation(callback => { emit = callback; return unsubscribe })
  for (const method of [api.signUpWithPassword, api.signInWithPassword, api.requestPasswordReset, api.updateAuthPassword, api.resendConfirmationEmail, api.signOut]) method.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.useRealTimers() })

it('claims one synchronous lock across action kinds and releases it after failure for retry', async () => {
  const request = deferred<void>()
  api.requestPasswordReset.mockReturnValueOnce(request.promise)
  const { result } = mount()
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  const clear = vi.fn()
  let first!: Promise<AuthActionResult>, duplicate!: Promise<AuthActionResult>, other!: Promise<AuthActionResult>
  act(() => {
    first = result.current.auth.submitCredentials('forgot', credentials, clear)
    duplicate = result.current.auth.submitCredentials('forgot', credentials, clear)
    other = result.current.auth.resend(credentials.email)
  })
  expect(await duplicate).toBe('ignored')
  expect(await other).toBe('ignored')
  expect(api.requestPasswordReset).toHaveBeenCalledExactlyOnceWith('sample@example.test')
  expect(api.resendConfirmationEmail).not.toHaveBeenCalled()
  expect(result.current.auth.busy).toBe(true)
  await act(async () => { request.reject(new Error('Delivery unavailable')); expect(await first).toBe('failed') })
  expect(result.current.auth.error).toBe('Delivery unavailable')
  expect(result.current.auth.busy).toBe(false)
  expect(clear).not.toHaveBeenCalled()
  await act(async () => { expect(await result.current.auth.submitCredentials('forgot', credentials, clear)).toBe('success') })
  expect(api.requestPasswordReset).toHaveBeenCalledTimes(2)
  expect(result.current.auth.error).toBe('')
})
it.each(['resolve', 'reject'] as const)('suppresses a recovery %s after leaving and returning to its route', async completion => {
  const request = deferred<void>()
  api.requestPasswordReset.mockReturnValue(request.promise)
  const { result } = mount()
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  let action!: Promise<AuthActionResult>
  act(() => { action = result.current.auth.submitCredentials('forgot', credentials, vi.fn()) })
  act(() => result.current.navigate('/auth/sign-in'))
  act(() => result.current.navigate(-1))
  await act(async () => {
    if (completion === 'resolve') request.resolve()
    else request.reject(new Error('Old recovery error'))
    expect(await action).toBe('obsolete')
  })
  expect(result.current.location.pathname).toBe('/auth/forgot-password')
  expect(result.current.auth).toMatchObject({ error: '', notice: '', cooldown: 0, busy: false })
})
it('does not clear or navigate a departed signup form when its request succeeds', async () => {
  const request = deferred<void>(), clear = vi.fn()
  api.signUpWithPassword.mockReturnValue(request.promise)
  const { result } = mount('/auth/sign-up')
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  let action!: Promise<AuthActionResult>
  act(() => { action = result.current.auth.submitCredentials('signup', credentials, clear) })
  act(() => result.current.navigate('/auth/sign-in'))
  await act(async () => { request.resolve(); expect(await action).toBe('obsolete') })
  expect(clear).not.toHaveBeenCalled()
  expect(result.current.location.pathname).toBe('/auth/sign-in')
})
it('accepts the requested sign-in event before completion and preserves same-user refresh', async () => {
  const request = deferred<void>(), clear = vi.fn()
  api.signInWithPassword.mockReturnValue(request.promise)
  const { result } = mount('/auth/sign-in')
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  let action!: Promise<AuthActionResult>
  act(() => { action = result.current.auth.submitCredentials('signin', credentials, clear) })
  act(() => emit('SIGNED_IN', session()))
  act(() => emit('TOKEN_REFRESHED', session()))
  expect(result.current.auth.verifiedUserId).toBe('user-one')
  await act(async () => { request.resolve(); expect(await action).toBe('success') })
  expect(clear).toHaveBeenCalledOnce()
  expect(result.current.location.pathname).toBe('/account/home')
})
it('keeps an unrelated identity authoritative without applying the old sign-in result', async () => {
  const request = deferred<void>(), clear = vi.fn()
  api.signInWithPassword.mockReturnValue(request.promise)
  const { result } = mount('/auth/sign-in')
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  let action!: Promise<AuthActionResult>
  act(() => { action = result.current.auth.submitCredentials('signin', credentials, clear) })
  act(() => emit('SIGNED_IN', session('other-user', 'other@example.test')))
  await act(async () => { request.resolve(); expect(await action).toBe('obsolete') })
  expect(result.current.auth.verifiedUserId).toBe('other-user')
  expect(result.current.location.pathname).toBe('/auth/sign-in')
  expect(clear).not.toHaveBeenCalled()
})
it('handles sign-out identity and home navigation before the request completes', async () => {
  api.readAuthSession.mockResolvedValue({ data: { session: session() }, error: null })
  const request = deferred<void>()
  api.signOut.mockReturnValue(request.promise)
  const { result } = mount('/community/preview/profile')
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  let action!: Promise<AuthActionResult>
  act(() => { action = result.current.auth.signOut() })
  act(() => emit('SIGNED_OUT', null))
  expect(result.current.location.pathname).toBe('/account/home')
  await act(async () => { request.resolve(); expect(await action).toBe('success') })
  expect(result.current.auth).toMatchObject({ busy: false, session: null, error: '' })
})
it('cleans subscriptions and ignores an unmounted completion without releasing another owner', async () => {
  const old = deferred<void>(), current = deferred<void>()
  api.requestPasswordReset.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
  const first = mount()
  await waitFor(() => expect(first.result.current.auth.ready).toBe(true))
  let oldAction!: Promise<AuthActionResult>, newAction!: Promise<AuthActionResult>
  act(() => { oldAction = first.result.current.auth.submitCredentials('forgot', credentials, vi.fn()) })
  first.unmount()
  expect(unsubscribe).toHaveBeenCalledOnce()
  const second = mount()
  await waitFor(() => expect(second.result.current.auth.ready).toBe(true))
  act(() => { newAction = second.result.current.auth.submitCredentials('forgot', credentials, vi.fn()) })
  await act(async () => { old.resolve(); expect(await oldAction).toBe('obsolete') })
  expect(second.result.current.auth.busy).toBe(true)
  await act(async () => { current.resolve(); expect(await newAction).toBe('success') })
})
it('preserves resend cooldown, handler-level send prevention and timer cleanup', async () => {
  const { result, unmount } = mount('/auth/check-email')
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  vi.useFakeTimers()
  await act(async () => { expect(await result.current.auth.resend(credentials.email)).toBe('success') })
  expect(result.current.auth.cooldown).toBe(60)
  expect(await result.current.auth.resend(credentials.email)).toBe('ignored')
  expect(await result.current.auth.submitCredentials('forgot', credentials, vi.fn())).toBe('ignored')
  expect(api.resendConfirmationEmail).toHaveBeenCalledExactlyOnceWith('sample@example.test')
  for (let i = 0; i < 60; i++) await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(result.current.auth.cooldown).toBe(0)
  await act(async () => { expect(await result.current.auth.resend(credentials.email)).toBe('success') })
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
it('does not subscribe, restore or submit with unavailable configuration', async () => {
  api.isAuthConfigured.mockReturnValue(false)
  const { result } = mount()
  expect(result.current.auth.ready).toBe(true)
  expect(await result.current.auth.submitCredentials('forgot', credentials, vi.fn())).toBe('ignored')
  expect(api.readAuthSession).not.toHaveBeenCalled()
  expect(api.subscribeToAuthChanges).not.toHaveBeenCalled()
  expect(api.requestPasswordReset).not.toHaveBeenCalled()
})
it('does not overwrite a newer SDK identity with a late restoration snapshot', async () => {
  const restore = deferred<{ data: { session: AuthSession | null }; error: null }>()
  api.readAuthSession.mockReturnValue(restore.promise)
  const { result } = mount()
  act(() => emit('SIGNED_IN', session('new-user')))
  await act(async () => { restore.resolve({ data: { session: session('old-user') }, error: null }) })
  expect(result.current.auth.verifiedUserId).toBe('new-user')
  expect(result.current.auth.ready).toBe(true)
})
it('reports session restoration rejection and does not redirect a departed callback', async () => {
  api.readAuthRedirect.mockReturnValue({ callbackPath: true, resetPath: false, callbackError: false, hasCredentials: true })
  const restore = deferred<never>()
  api.readAuthSession.mockReturnValue(restore.promise)
  const { result } = mount('/auth/callback')
  act(() => result.current.navigate('/auth/sign-in'))
  await act(async () => { restore.reject(new Error('Offline')) })
  expect(result.current.auth).toMatchObject({ ready: true, error: '', notice: '' })
  expect(result.current.location.pathname).toBe('/auth/sign-in')
})

it.each(['failure', 'rejection'])('retains actionable restoration %s on the current screen', async mode => {
  if (mode === 'failure') api.readAuthSession.mockResolvedValue({ data: { session: null }, error: new Error('SDK restoration failure') })
  else api.readAuthSession.mockRejectedValue(new Error('Offline'))
  const { result } = mount('/auth/sign-in')
  await waitFor(() => expect(result.current.auth.ready).toBe(true))
  expect(result.current.auth.error).toBe(mode === 'failure'
    ? 'We could not restore your session. Please sign in again.'
    : 'Unable to connect. Please reload and try again.')
})
