import styles from './AccountPanel.module.css'
import { Button } from '../../../components/primitives/Controls'
import { useEffect, useState } from 'react'
import { readAccountPreferences, saveAccountPreferences, type AccountPreferences } from '../api'

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

export function AccountPreferencesPanel({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<AccountPreferences | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const result = await readAccountPreferences(userId)
        if (active) setPreferences(result)
      } catch {
        if (active) setError('Your account preferences could not be loaded. Reload to try again.')
      }
    })()
    return () => { active = false }
  }, [userId])
  async function save() {
    if (!preferences) return
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await saveAccountPreferences(userId, preferences)
      setSaved(true)
    } catch {
      setError('Your preferences could not be saved. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel">
      <h2 data-heading="card">Discovery preferences</h2>
      {!preferences && !error && <p role="status">Loading account preferences…</p>}
      {preferences && (
        <>
          {choices.map(item => (
            <label className="setting-row" key={item.key}>
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                disabled={busy}
                checked={preferences[item.key]}
                onChange={event => {
                  setPreferences({ ...preferences, [item.key]: event.target.checked })
                  setSaved(false)
                }}
              />
            </label>
          ))}
          <h2 data-heading="card" className={styles.communicationHeading}>Communication preferences</h2>
          <label className="setting-row">
            <span>
              <strong>Allow direct messages</strong>
              <small>Let other users contact you through your global Crowded Table user account. They must first be able to see your global account to do this.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              disabled={busy}
              checked={preferences.allow_direct_messages}
              onChange={event => {
                setPreferences({ ...preferences, allow_direct_messages: event.target.checked })
                setSaved(false)
              }}
            />
          </label>
          <div className={styles.actions}>
            <Button appearance="primary" className="button" loading={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save account preferences'}
            </Button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Account preferences saved.</p>}
    </section>
  )
}
