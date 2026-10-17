import { useAccount } from './accountContext'
import { Link, ActionLink, Button } from '../../components/primitives/Controls'
import { authPaths } from '../../app/navigation'
export function AccountActions() {
  const account = useAccount()
  if (account.status === 'loading') return <span role="status">Checking your session…</span>
  return <div className="account-actions">{account.status === 'signed-in'
    ? <Button appearance="ghost" loading={account.busy} onClick={account.signOut}>Sign Out</Button>
    : <><Link to={authPaths.signin}>Sign in</Link><ActionLink appearance="outline" to={authPaths.signup}>Create Account</ActionLink></>}</div>
}
