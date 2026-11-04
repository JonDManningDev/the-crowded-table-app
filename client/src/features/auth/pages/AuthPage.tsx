import type { FormEventHandler } from 'react'
import { ActionLink } from '../../../components/primitives/Controls'
import { authPaths } from '../../../app/navigation'
import type { AuthScreen } from '../types'
import { AuthCredentialForm } from '../components/AuthCredentialForm'
import { ConfirmationEmailPanel } from '../components/ConfirmationEmailPanel'
import { AuthNavigation } from '../components/AuthNavigation'
import { AuthFeedback } from '../components/AuthFeedback'
import styles from './AuthPage.module.css'

const titles = { signup: 'Pull up a chair.', signin: 'Welcome back.', forgot: 'Find your way back.',
  check: 'Check your email.', reset: 'Choose a new password.', callback: 'Confirm your account.' }

export function AuthPage({ view, email, ready, configured, busy, error, notice, cooldown, canResetPassword, onEmailChange, onSubmit, onResend }: {
  view: AuthScreen; email: string; ready: boolean; configured: boolean; busy: boolean; error: string; notice: string
  cooldown: number; canResetPassword: boolean; onEmailChange: (email: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>; onResend: FormEventHandler<HTMLFormElement>
}) {
  return <main className={styles.page}><section className={`panel ${styles.card}`}>
    <span className="eyebrow">THE CROWDED TABLE</span>
    <h1>{titles[view]}</h1>
    {!configured && <p role="alert">Account services are not configured yet. Please try again later.</p>}
    <AuthFeedback error={error} notice={notice}/>
    {!ready ? <p role="status">Checking your link…</p> : <>
      {view === 'check' ? <ConfirmationEmailPanel email={email} busy={busy} configured={configured} cooldown={cooldown} onEmailChange={onEmailChange} onResend={onResend}/>
        : view === 'callback' ? <p>Request another confirmation email or sign in to continue.</p>
        : view === 'reset' && !canResetPassword ? <ActionLink to={authPaths.forgot}>Request a new reset link</ActionLink>
        : <AuthCredentialForm view={view} email={email} busy={busy} configured={configured} cooldown={cooldown} onEmailChange={onEmailChange} onSubmit={onSubmit}/>}
      <AuthNavigation busy={busy}/>
    </>}
  </section></main>
}
