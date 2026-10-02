// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear() })

it.each(['signup', 'recovery'])('handles %s when the real SDK consumes the URL before React mounts', async (type) => {
  vi.resetModules()
  localStorage.clear()
  vi.stubEnv('VITE_SUPABASE_URL', `https://auth-test-${type}.example.com`)
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test_only')
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'person@example.com', email_confirmed_at: '2026-10-02T12:00:00Z', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-02T12:00:00Z' }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } })))
  const path = type === 'signup' ? '/auth/callback' : '/auth/reset-password'
  window.history.replaceState(null, '', `${path}#access_token=test-token&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=${type}`)
  const client = await import('./supabase')
  const initialized = await client.authInitialization
  expect(initialized?.error).toBeNull()
  expect(window.location.hash).toBe('')
  const { AuthShell } = await import('../features/Auth')
  render(<StrictMode><AuthShell><div>Home</div></AuthShell></StrictMode>)
  if (type === 'signup') {
    await screen.findByText('Your email is confirmed. Welcome to The Crowded Table.')
    expect(window.location.pathname + window.location.hash).toBe('/#home')
  } else {
    await screen.findByRole('button', { name: 'Save new password' })
    expect(window.location.pathname + window.location.hash).toBe('/auth/reset-password')
  }
  expect(screen.queryByRole('alert')).toBeNull()
  await client.supabase!.auth.stopAutoRefresh()
})
