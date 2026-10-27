import { lazy, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from '../../components/primitives/Controls'
import { authPaths } from '../../app/navigation'
import { LazyContent } from '../../app/LazyContent'
import { useUserAccount } from '../user-accounts/hooks'
import { AccountContext } from '../user-accounts/accountContext'
import { useAuth } from './hooks'
import { AuthPage } from './pages/AuthPage'
import { AuthFeedback } from './components/AuthFeedback'
import '../Auth.css'
import styles from './AuthShell.module.css'

const CreateCommunity = lazy(() => import('../CreateCommunity').then(module => ({ default: module.CreateCommunity })))

export function AuthShell({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const profile = useUserAccount(auth.verifiedUserId)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const view = auth.view
    if (view !== 'signup' && view !== 'signin' && view !== 'forgot' && view !== 'reset') return
    const form = event.currentTarget
    const values = new FormData(form)
    void auth.submitCredentials(view, { email, password: String(values.get('password') || ''), confirm: String(values.get('confirm') || '') }, () => form.reset())
  }
  return <AccountContext.Provider key={auth.verifiedUserId || 'guest'} value={{
    ...profile, status: !auth.ready ? 'loading' : auth.verified ? 'signed-in' : 'signed-out',
    email: auth.verified ? auth.session?.user.email ?? null : null, userId: auth.verifiedUserId,
    busy: auth.busy, signOut: () => { void auth.signOut() },
  }}>
    {!auth.view && <AuthFeedback error={auth.error} notice={auth.notice} placement="shell"/>}
    {auth.view === 'create-community' ? (
      !auth.ready ? <main className={styles.gate}><p role="status">Checking your session…</p></main>
        : auth.verified && auth.session ? <LazyContent key={auth.session.user.id}><CreateCommunity onBusyChange={auth.setBusy}/></LazyContent>
        : <main className={styles.gate}><p>Please sign in with a verified account to continue.</p><Link to={authPaths.signin}>Sign in</Link></main>
    ) : auth.view ? <AuthPage view={auth.view} email={email} ready={auth.ready} configured={auth.configured}
      busy={auth.busy} error={auth.error} notice={auth.notice} cooldown={auth.cooldown}
      canResetPassword={Boolean(auth.session) && !auth.linkFailed} onEmailChange={setEmail} onSubmit={submit}
      onResend={event => { event.preventDefault(); void auth.resend(email) }}/>
      : children}
  </AccountContext.Provider>
}
