import { Button } from '../../../components/primitives/Controls'
import { Icon } from '../../../components/ui'
import type { MockModel } from '../../../mock/useMockState'
import { useState } from 'react'

const choices = [
  { key: 'reminders', title: 'Event reminders', text: 'A little nudge before your next game.' },
  { key: 'replies', title: 'Conversation replies', text: 'Know when someone responds to you.' },
  { key: 'digest', title: 'Weekly community letter', text: 'A quiet round-up of what’s happening.' },
  {
    key: 'history',
    title: 'Share my activity history',
    text: 'Visible only to other community members.',
  },
] as const

export function AccountPreferencesPanel({
  model,
  onSupport,
}: {
  model: MockModel
  onSupport: () => void
}) {
  const preferences = model.preferences
  const setPreferences = model.setPreferences
  const [saved, setSaved] = useState(false)
  return (
    <section className="panel">
      <h2>Make yourself comfortable</h2>
      <p className="muted">Choose what you hear from us and what your community sees.</p>
      {choices.map(choice => (
        <label className="setting-row" key={choice.key}>
          <span>
            <strong>{choice.title}</strong>
            <small>{choice.text}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={preferences[choice.key]}
            onChange={event => {
              setPreferences(previous => ({ ...previous, [choice.key]: event.target.checked }))
              setSaved(false)
            }}
          />
        </label>
      ))}
      <div className="actions">
        <Button appearance="primary" className="button" onClick={() => setSaved(true)}>
          Save preferences
        </Button>
        {saved && (
          <span role="status" className="availability">
            <Icon name="check" size={16}/> Saved for this visit
          </span>
        )}
      </div>
      <Button appearance="ghost" className="text-button support-link" onClick={onSupport}>
        A question? We’re here for you. <Icon name="arrow" size={17}/>
      </Button>
    </section>
  )
}
