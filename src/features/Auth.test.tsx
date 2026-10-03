// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthShell } from './Auth'

const auth = vi.hoisted(() => ({
  getSession: vi.fn(), onAuthStateChange: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(),
  resend: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({
  supabase: { auth },
  authInitialization: Promise.resolve({ error: null }),
  get initialAuthRedirect() {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    return { callbackPath: window.location.pathname === '/auth/callback', resetPath: window.location.pathname === '/auth/reset-password', callbackError: hash.has('error') || new URLSearchParams(window.location.search).has('error'), hasCredentials: hash.has('access_token') && hash.has('refresh_token') }
  },
}))
const session = { user: { id: 'test-user', email: 'person@example.com', email_confirmed_at: '2026-10-02' } }
let listener: (event: string, session: unknown) => void
beforeEach(() => {
  vi.resetAllMocks()
  window.history.replaceState(null, '', '/')
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
  auth.onAuthStateChange.mockImplementation(callback => { listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } })
  for (const method of [auth.signUp, auth.signInWithPassword, auth.resend, auth.resetPasswordForEmail, auth.updateUser, auth.signOut]) method.mockResolvedValue({ error: null })
})
afterEach(cleanup)
async function start() {
  render(<AuthShell><div>Community preview</div></AuthShell>)
  await waitFor(() => expect(screen.queryByText('Checking your session…')).toBeNull())
}
function click(name: string) { fireEvent.click(screen.getAllByRole('button', { name }).at(-1)!) }
function fill(name: string | RegExp, value: string) { fireEvent.change(screen.getByLabelText(name), { target: { value } }) }
function submit() { fireEvent.submit(document.querySelector('form')!) }

describe('account workflows', () => {
  it('opens community creation for a verified account', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    await start(); click('Start New Community')
    expect(screen.getByRole('heading', { name: 'Start a new community.' })).toBeTruthy()
    expect(screen.queryByText('Community preview')).toBeNull()
    click('Cancel')
    expect(screen.getByText('Community preview')).toBeTruthy()
  })
  it('does not offer community creation to an unverified account', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { ...session.user, email_confirmed_at: null } } }, error: null })
    await start()
    expect(screen.queryByRole('button', { name: 'Start New Community' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Your communities' })).toBeNull()
  })
  it('signs in and returns home without changing community access', async () => {
    auth.signInWithPassword.mockImplementation(async () => { listener('SIGNED_IN', session); return { error: null } })
    await start(); click('Sign in'); fill('Email address', 'person@example.com'); fill('Password', 'a-long-test-password'); submit()
    await screen.findByText('person@example.com')
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'person@example.com', password: 'a-long-test-password' })
    expect(window.location.hash).toBe('#my-home')
    expect(screen.getByText('Community preview')).toBeTruthy()
  })
  it('keeps failed sign-ins on the form with an actionable error', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
    await start(); click('Sign in'); fill('Email address', 'person@example.com'); fill('Password', 'incorrect-password'); submit()
    expect((await screen.findByRole('alert')).textContent).toContain('Invalid login credentials')
    expect(screen.getByLabelText('Password')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull()
  })
  it('requests signup with the exact callback and waits for verification', async () => {
    await start(); click('Create Account')
    fill('Email address', 'person@example.com'); fill(/Password/, 'a-long-test-password')
    submit()
    await screen.findByText('Check your email.')
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'person@example.com', password: 'a-long-test-password', options: { emailRedirectTo: 'http://localhost:3000/auth/callback' } })
    expect(screen.queryByText('Signed in as')).toBeNull()
    expect(screen.getByRole('button', { name: 'Resend in 60s' }).hasAttribute('disabled')).toBe(true)
    expect(document.querySelector('input[type=password]')).toBeNull()
  })
  it('reports delivery errors rather than falsely claiming success', async () => {
    auth.signUp.mockResolvedValue({ error: new Error('Error sending confirmation email') })
    await start(); click('Create Account'); fill('Email address', 'person@example.com'); fill(/Password/, 'a-long-test-password'); submit()
    expect((await screen.findByRole('alert')).textContent).toContain('Error sending confirmation email')
    expect(screen.queryByText('Check your email.')).toBeNull()
  })
  it('sends recovery to its own route and uses a non-enumerating message', async () => {
    await start(); click('Sign in'); click('Forgot password?'); fill('Email address', 'person@example.com'); submit()
    await screen.findByText('If an account uses that email, a password reset link is on its way.')
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', { redirectTo: 'http://localhost:3000/auth/reset-password' })
  })
  it('requires a session before offering password update', async () => {
    window.history.replaceState(null, '', '/auth/reset-password')
    await start()
    expect(screen.getByRole('button', { name: 'Request a new reset link' })).toBeTruthy()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
  it('keeps recovery on the reset form and rejects mismatched passwords', async () => {
    window.history.replaceState(null, '', '/auth/reset-password#access_token=test&refresh_token=test&type=recovery')
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    await start(); fill(/New password/, 'a-long-test-password'); fill('Confirm new password', 'another-long-password'); submit()
    expect((await screen.findByRole('alert')).textContent).toContain('do not match')
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('')
    fill('Confirm new password', 'a-long-test-password'); submit()
    await screen.findByText('Your password has been updated.')
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'a-long-test-password' })
    expect(window.location.pathname).toBe('/')
  })
  it('does not mistake an old session for a successful missing confirmation link', async () => {
    window.history.replaceState(null, '', '/auth/callback')
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    await start()
    expect((await screen.findByRole('alert')).textContent).toContain('missing or expired')
    expect(screen.queryByText('Your email is confirmed. Welcome to The Crowded Table.')).toBeNull()
  })
  it('cleans successful callback credentials and returns home', async () => {
    window.history.replaceState(null, '', '/auth/callback#access_token=test&refresh_token=test')
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    await start()
    await screen.findByText('Your email is confirmed. Welcome to The Crowded Table.')
    expect(window.location.pathname + window.location.hash).toBe('/#my-home')
  })
  it('shows expired-link recovery even with an existing session', async () => {
    window.history.replaceState(null, '', '/auth/reset-password#error=access_denied&error_code=otp_expired')
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    await start()
    expect((await screen.findByRole('alert')).textContent).toContain('invalid or expired')
    expect(screen.getByRole('button', { name: 'Request a new reset link' })).toBeTruthy()
    expect(window.location.hash).toBe('')
  })
  it('restores an authenticated session and signs out on this browser', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null })
    auth.signOut.mockImplementation(async () => { listener('SIGNED_OUT', null); return { error: null } })
    await start(); expect(screen.getByText('person@example.com')).toBeTruthy(); click('Sign out')
    await waitFor(() => expect(screen.queryByText('person@example.com')).toBeNull())
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
