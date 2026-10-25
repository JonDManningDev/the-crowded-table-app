import { useAccount } from '../../auth/accountContext'
import { AccountPreferencesPanel } from './AccountPreferencesPanel'
import { PremiumFeaturesPanel } from './PremiumFeaturesPanel'
import { useAccountPreferences } from '../hooks/useAccountPreferences'
import { readPremiumFeaturePlaceholders } from '../api'
import { pagePaths } from '../../../app/navigation'
import styles from './AccountSettingsTab.module.css'

export function AccountSettingsTab() {
  const account = useAccount()
  const userId = account.status === 'signed-in' ? account.userId : undefined
  const { changePreference, savePreferences, ...preferences } = useAccountPreferences(userId)
  return <div className={styles.page}>
    {userId && <AccountPreferencesPanel {...preferences}
      onPreferenceChange={changePreference} onSave={() => void savePreferences()}/>}
    <PremiumFeaturesPanel features={readPremiumFeaturePlaceholders()}
      canManage={account.status === 'signed-in'} manageTo={pagePaths['my-communities']}
      exploreTo={pagePaths['premium-features']}/>
  </div>
}
