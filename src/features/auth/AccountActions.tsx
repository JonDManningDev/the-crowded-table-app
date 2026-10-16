import { useAccount } from './accountContext'

export function AccountActions() {
  const account = useAccount()
  if (account.status === 'loading') return <span role="status">Checking your session…</span>
  return <div className="account-actions">{account.status === 'signed-in'
    ? <button className="text-button" disabled={account.busy} onClick={account.signOut}>Sign Out</button>
    : <><button className="text-button" disabled={account.busy} onClick={account.signIn}>Sign in</button><button className="button secondary" disabled={account.busy} onClick={account.signUp}>Create Account</button></>}</div>
}
