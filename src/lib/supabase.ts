import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
// Capture only routing metadata before the SDK can consume and clear the fragment.
// Never retain the tokens themselves outside the SDK.
export const initialAuthRedirect = (() => {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  return {
    callbackPath: window.location.pathname === '/auth/callback',
    resetPath: window.location.pathname === '/auth/reset-password',
    callbackError: hash.has('error') || new URLSearchParams(window.location.search).has('error'),
    hasCredentials: hash.has('access_token') && hash.has('refresh_token'),
  }
})()
// Never accept a privileged key in browser configuration.
function isPublicKey(value: string) {
  if (value.startsWith('sb_publishable_')) return true
  try { return JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon' } catch { return false }
}
export const supabase = url && key && isPublicKey(key)
  ? createClient<Database>(url, key, { auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
// getSession alone can return an older stored session after URL parsing fails.
export const authInitialization = supabase?.auth.initialize()
