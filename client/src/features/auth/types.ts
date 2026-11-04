import type { AuthView } from '../../app/navigation'
export type { Session as AuthSession, AuthChangeEvent as AuthSessionEvent } from '@supabase/supabase-js'
export type AuthScreen = Exclude<AuthView, 'create-community'>
export type AuthCredentialView = Extract<AuthScreen, 'signup' | 'signin' | 'forgot' | 'reset'>
export type AuthCredentials = { email: string; password: string; confirm: string }
export type AuthActionResult = 'success' | 'failed' | 'obsolete' | 'ignored'
