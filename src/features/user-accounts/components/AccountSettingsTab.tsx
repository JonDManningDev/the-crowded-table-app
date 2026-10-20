import { ActionLink } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import { pagePaths } from '../../../app/navigation'
import { useAccount } from '../../auth/accountContext'
import type { MockModel } from '../../../mock/useMockState'
import { AccountPreferences } from './AccountPreferences'
import { ProfilePreferences } from './ProfilePreferences'

export function AccountSettingsTab({ model, onSupport }: { model: MockModel; onSupport: () => void }) {
  const account = useAccount()
  return <div className="account-settings">{account.userId && <AccountPreferences key={account.userId} userId={account.userId}/>}<section className="panel"><h2>My Premium Features</h2><p className="muted">Your subscriptions will appear here, each with a Manage link to its feature settings.</p><div className="notice">Subscription data is not connected yet. Community ownership and future pro hosting and organizer features will be listed here.</div><ul className="premium-feature-list" aria-label="Premium feature placeholders">{[{ id: 'community-ownership', name: 'Community ownership', detail: 'Sample subscription row · Billing is not connected' }].map(feature => <li key={feature.id}><div><strong>{feature.name}</strong><small>{feature.detail}</small></div>{account.status === 'signed-in' ? <ActionLink appearance="outline" to={pagePaths['my-communities']}>Manage</ActionLink> : <span className="muted">Sign in to manage</span>}</li>)}</ul><div className="actions"><ActionLink className="button" to={pagePaths['premium-features']}>Explore Premium Features <Icon name="arrow" size={17}/></ActionLink></div></section><ProfilePreferences model={model} onSupport={onSupport}/></div>
}
