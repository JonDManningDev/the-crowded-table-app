import type { FormEventHandler } from 'react'
import { Button } from '../../../components/primitives/Controls'
import styles from './ConfirmationEmailPanel.module.css'

export function ConfirmationEmailPanel({ email, busy, configured, cooldown, onEmailChange, onResend }: {
  email: string; busy: boolean; configured: boolean; cooldown: number
  onEmailChange: (email: string) => void; onResend: FormEventHandler<HTMLFormElement>
}) {
  return <>
    <p>If signup can proceed, we’ll send a confirmation link to your email. Open it to finish creating your account.</p>
    <p>Already have an account? Sign in or reset your password.</p>
    <form className={`form ${styles.form}`} onSubmit={onResend}>
      <label>Email address
        <input type="email" required autoComplete="email" value={email}
          onChange={event => onEmailChange(event.target.value)} disabled={busy}/>
      </label>
      <Button appearance="primary" type="submit" loading={busy} className="button" disabled={busy || cooldown > 0 || !configured}>
        {cooldown ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
      </Button>
    </form>
  </>
}
