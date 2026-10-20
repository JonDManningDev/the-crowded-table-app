import { Button } from '../../../components/primitives/Controls'
import { useEffect, useState } from 'react'
import { readDiscoveryPreferences, saveDiscoveryPreferences, type DiscoveryPreferences } from '../api'

export function AccountPreferences({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<DiscoveryPreferences | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const result = await readDiscoveryPreferences(userId)
        if (active) setPreferences(result)
      } catch { if (active) setError('Your discovery preferences could not be loaded. Reload to try again.') }
    })()
    return () => { active = false }
  }, [userId])
  async function save() {
    if (!preferences) return
    setBusy(true); setError(''); setSaved(false)
    try {
      await saveDiscoveryPreferences(preferences)
      setSaved(true)
    } catch { setError('Your preferences could not be saved. Please try again.') }
    finally { setBusy(false) }
  }
  return <section className="panel"><h2>Discovery preferences</h2><p className="muted">Save your preferences for global search and matchmaking as these features take shape. Sharing your profile through a community is a separate community setting. These choices do not grant permission to contact you.</p>
    {!preferences && !error && <p role="status">Loading discovery preferences…</p>}
    {preferences && <>{([{ key: 'user_is_discoverable', title: 'Appear in global account searches', text: 'Let other users find you through global search.' }, { key: 'enable_matchmaking', title: 'Participate in global matchmaking', text: 'Allow matches outside your communities, even when search is turned off.' }] as const).map(item => <label className="setting-row" key={item.key}><span><strong>{item.title}</strong><small>{item.text}</small></span><input type="checkbox" role="switch" disabled={busy} checked={preferences[item.key]} onChange={event => { setPreferences({ ...preferences, [item.key]: event.target.checked }); setSaved(false) }}/></label>)}<Button appearance="primary" className="button" loading={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save discovery preferences'}</Button></>}
    {error && <p role="alert">{error}</p>}{saved && <p role="status">Discovery preferences saved.</p>}
  </section>
}
