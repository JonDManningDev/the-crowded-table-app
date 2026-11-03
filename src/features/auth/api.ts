import { authInitialization, initialAuthRedirect, supabase } from '../../lib/supabase'
import type { AuthCredentials, AuthSession, AuthSessionEvent } from './types'

export const isAuthConfigured = () => Boolean(supabase)
export const readAuthRedirect = () => ({ ...initialAuthRedirect })
function client() {
  if (!supabase) throw new Error('Account services are not configured yet. Please try again later.')
  return supabase.auth
}
const redirect = (path: string) => `${window.location.origin}${path}`
export async function readAuthSession() {
  const initialized = await authInitialization
  const result = await client().getSession()
  return { ...result, error: initialized?.error || result.error }
}
export function subscribeToAuthChanges(onChange: (event: AuthSessionEvent, session: AuthSession | null) => void) {
  const { data: { subscription } } = client().onAuthStateChange(onChange)
  return () => subscription.unsubscribe()
}
export async function signUpWithPassword({ email, password }: Pick<AuthCredentials, 'email' | 'password'>) {
  const { error } = await client().signUp({ email, password, options: { emailRedirectTo: redirect('/auth/callback') } })
  if (error) throw error
}
export async function signInWithPassword(credentials: Pick<AuthCredentials, 'email' | 'password'>) {
  const { error } = await client().signInWithPassword(credentials)
  if (error) throw error
}
export async function requestPasswordReset(email: string) {
  const { error } = await client().resetPasswordForEmail(email, { redirectTo: redirect('/auth/reset-password') })
  if (error) throw error
}
export async function updateAuthPassword(password: string) {
  const { error } = await client().updateUser({ password })
  if (error) throw error
}
export async function resendConfirmationEmail(email: string) {
  const { error } = await client().resend({ type: 'signup', email, options: { emailRedirectTo: redirect('/auth/callback') } })
  if (error) throw error
}
export async function signOut() {
  const { error } = await client().signOut({ scope: 'local' })
  if (error) throw error
}
