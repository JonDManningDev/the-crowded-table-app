import { Button } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import type { CommunityProfileContent, CommunityProfilePreferences } from '../types'
import styles from './CommunityPreferencesPanel.module.css'

export function CommunityPreferencesPanel({ preferences, choices, isPreferencesSaved, onPreferenceChange, onSavePreferences, onOpenSupport }: {
  preferences: CommunityProfilePreferences; choices: CommunityProfileContent['preferenceChoices']; isPreferencesSaved: boolean
  onPreferenceChange: (key: keyof CommunityProfilePreferences, value: boolean) => void; onSavePreferences: () => void; onOpenSupport: () => void
}) {
  return (
    <section className="panel">
      <h2>Make yourself comfortable</h2>
      <p className="muted">Choose what you hear from us and what your community sees.</p>
      {choices.map(choice => (
        <label className={styles['setting-row']} key={choice.key}>
          <span>
            <strong>{choice.title}</strong>
            <small>{choice.text}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={preferences[choice.key]}
            onChange={event => onPreferenceChange(choice.key, event.target.checked)}
          />
        </label>
      ))}
      <div className="actions">
        <Button appearance="primary" className="button" onClick={onSavePreferences}>
          Save preferences
        </Button>
        {isPreferencesSaved && (
          <span role="status" className="availability">
            <Icon name="check" size={16} /> Saved for this visit
          </span>
        )}
      </div>
      <Button appearance="ghost" className={`text-button ${styles['support-link']}`} onClick={onOpenSupport}>
        A question? We’re here for you. <Icon name="arrow" size={17} />
      </Button>
    </section>
  )
}
