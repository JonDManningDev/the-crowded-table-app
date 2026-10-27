import type { FormEventHandler } from 'react'
import { Button } from '../../../components/primitives/Controls'
import type { AuthCredentialView } from '../types'
import styles from './AuthCredentialForm.module.css'

export function AuthCredentialForm({ view, email, busy, configured, cooldown, onEmailChange, onSubmit }: {
  view: AuthCredentialView; email: string; busy: boolean; configured: boolean; cooldown: number
  onEmailChange: (email: string) => void; onSubmit: FormEventHandler<HTMLFormElement>
}) {
  const submitLabel = busy ? 'Please wait…' : view === 'signup' ? 'Create Account' : view === 'signin' ? 'Sign in'
    : view === 'reset' ? 'Save new password' : cooldown ? `Try again in ${cooldown}s` : 'Send reset link'
  return <form className={`form ${styles.form}`} onSubmit={onSubmit}>
    {view !== 'reset' && <label>Email address
      <input type="email" name="email" autoComplete="email" required value={email}
        onChange={event => onEmailChange(event.target.value)} disabled={busy}/>
    </label>}
    {view !== 'forgot' && <label>{view === 'reset' ? 'New password' : 'Password'}
      <input type="password" name="password" required minLength={view === 'signin' ? undefined : 12}
        autoComplete={view === 'signin' ? 'current-password' : 'new-password'} disabled={busy}/>
      {view !== 'signin' && <small>Use at least 12 characters.</small>}
    </label>}
    {view === 'reset' && <label>Confirm new password
      <input type="password" name="confirm" required minLength={12} autoComplete="new-password" disabled={busy}/>
    </label>}
    <Button appearance="primary" full type="submit" loading={busy} className="button full"
      disabled={busy || !configured || (view === 'forgot' && cooldown > 0)}>{submitLabel}</Button>
  </form>
}
