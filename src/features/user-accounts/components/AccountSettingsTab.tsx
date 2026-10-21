import { useAccount } from '../../auth/accountContext'
import { AccountPreferencesPanel } from './AccountPreferencesPanel'
import { PremiumFeaturesPanel } from './PremiumFeaturesPanel'

export function AccountSettingsTab() {
  const account = useAccount()
  return <div className="account-settings">
    {account.userId && <AccountPreferencesPanel key={account.userId} userId={account.userId}/>}
    <PremiumFeaturesPanel/>
  </div>
}
