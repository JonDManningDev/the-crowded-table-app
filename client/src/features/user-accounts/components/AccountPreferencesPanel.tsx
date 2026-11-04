import panelStyles from './AccountPanel.module.css'
import styles from './AccountPreferencesPanel.module.css'
import { Button } from '../../../components/primitives/Controls'
import { AccountPreferenceSwitch } from './AccountPreferenceSwitch'
import type { AccountPreferences } from '../types'

const choices = [
  {
    key: 'user_is_discoverable',
    title: 'Appear in global account searches',
    text: 'Let other users find you through global search.',
  },
  {
    key: 'enable_matchmaking',
    title: 'Participate in global matchmaking',
    text: 'Allow matches outside your communities, even when search is turned off.',
  },
] as const

type AccountPreferencesPanelProps = {
  preferences: AccountPreferences | null
  isLoading: boolean
  isSaving: boolean
  loadError: string
  saveError: string
  isSaved: boolean
  onPreferenceChange: (key: keyof AccountPreferences, checked: boolean) => void
  onSave: () => void
}

export function AccountPreferencesPanel({
  preferences, isLoading, isSaving, loadError, saveError, isSaved, onPreferenceChange, onSave,
}: AccountPreferencesPanelProps) {
  return (
    <section className={`panel ${styles.panel}`}>
      <h2 data-heading="card">Discovery preferences</h2>
      {isLoading && <p role="status">Loading account preferences…</p>}
      {preferences && (
        <>
          {choices.map(item => (
            <AccountPreferenceSwitch key={item.key} label={item.title} description={item.text}
              disabled={isSaving} checked={preferences[item.key]}
              onChange={checked => onPreferenceChange(item.key, checked)}/>
          ))}
          <h2 data-heading="card" className={styles.communicationHeading}>Communication preferences</h2>
          <AccountPreferenceSwitch label="Allow direct messages"
            description="Let other users contact you through your global Crowded Table user account. They must first be able to see your global account to do this."
            disabled={isSaving} checked={preferences.allow_direct_messages}
            onChange={checked => onPreferenceChange('allow_direct_messages', checked)}/>
          <div className={panelStyles.actions}>
            <Button appearance="primary" className="button" loading={isSaving} onClick={onSave}>
              {isSaving ? 'Saving…' : 'Save account preferences'}
            </Button>
          </div>
        </>
      )}
      {(loadError || saveError) && <p role="alert">{loadError || saveError}</p>}
      {isSaved && <p role="status">Account preferences saved.</p>}
    </section>
  )
}
