import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { countryCodes, creationError, validateTenant } from '../lib/tenantCreation'
import type { TenantDraft } from '../lib/tenantCreation'
import './CreateCommunity.css'

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = countryCodes.map(code => ({ code, name: countryNames.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name))
function browserTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}
function timezones() {
  try { return [...new Set(['UTC', browserTimezone(), ...Intl.supportedValuesOf('timeZone')])].sort() } catch { return ['UTC', browserTimezone(), 'America/Tegucigalpa'] }
}
const zones = timezones()

export function CreateCommunity({ onClose, onList, onBusyChange }: { onClose: () => void; onList: () => void; onBusyChange: (busy: boolean) => void }) {
  const [draft, setDraft] = useState<TenantDraft>(() => ({ name: '', slug: '', country: '', region: '', city: '', timezone: browserTimezone(), join: false }))
  const [saved, setSaved] = useState<TenantDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  function update<Key extends keyof TenantDraft>(key: Key, value: TenantDraft[Key]) { setDraft(previous => ({ ...previous, [key]: value })) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const invalid = validateTenant(draft)
    if (invalid) { setError(invalid); return }
    if (!supabase) { setError('Account services are not configured yet. Please try again later.'); return }
    submitting.current = true; setBusy(true); onBusyChange(true); setError('')
    try {
      const { data, error: failure } = await supabase.rpc('create_tenant', {
        p_name: draft.name.trim(), p_slug: draft.slug, p_country_code: draft.country,
        p_timezone: draft.timezone.trim(), p_state_province: draft.region.trim() || undefined,
        p_city: draft.city.trim() || undefined, p_join_community: draft.join,
      })
      if (failure) { setError(creationError(failure)); return }
      if (!data) { setError(creationError({})); return }
      setSaved({ ...draft, name: draft.name.trim() })
    } catch { setError(creationError({})) }
    finally { submitting.current = false; setBusy(false); onBusyChange(false); errorRef.current?.focus() }
  }

  return <main className="auth-page"><section className="panel creation-card">
    <span className="eyebrow">MAKE ROOM FOR YOUR PEOPLE</span>
    {saved ? <><h1>Your community is ready.</h1><p role="status"><strong>{saved.name}</strong> has been created. You’re its owner.</p>
      <dl className="community-summary"><dt>Community handle</dt><dd>{saved.slug}</dd><dt>Location</dt><dd>{[saved.city.trim(), saved.region.trim(), countryNames.of(saved.country)].filter(Boolean).join(', ')}</dd><dt>Time zone</dt><dd>{saved.timezone.trim()}</dd></dl>
      <p>{saved.join ? 'You’ve also joined as an approved participant.' : 'You can manage this community without joining as a participant.'}</p>
      <p>Other people will need approval to join. Profile setup and community management are coming next.</p>
      <div className="actions"><button className="button" onClick={onList}>View your communities</button><button className="text-button" onClick={onClose}>Back to home</button></div>
    </> : <><h1>Start a new community.</h1><p>You’ll become its owner. Give your community a name and a place to call home.</p>
      {error && <p className="auth-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      <form className="form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="creation-fields">
          <label>Community name<input name="name" required maxLength={120} value={draft.name} onChange={e => update('name', e.target.value)} autoFocus/></label>
          <label>Community handle<input name="slug" required minLength={3} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e => update('slug', e.target.value)} autoCapitalize="none" spellCheck={false} aria-describedby="handle-help"/></label>
          <p id="handle-help" className="muted">A unique name such as tegucigalpa-game-nights. Use lowercase letters, numbers, and single hyphens. This handle cannot be changed later.</p>
          <label>Country<select name="country" required value={draft.country} onChange={e => update('country', e.target.value)}><option value="">Choose a country</option>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
          <div className="form-row"><label>State / province (optional)<input name="region" maxLength={120} value={draft.region} onChange={e => update('region', e.target.value)}/></label><label>City (optional)<input name="city" maxLength={120} value={draft.city} onChange={e => update('city', e.target.value)}/></label></div>
          <label>Community time zone<input name="timezone" required list="community-timezones" value={draft.timezone} onChange={e => update('timezone', e.target.value)} aria-describedby="timezone-help"/></label>
          <datalist id="community-timezones">{zones.map(zone => <option key={zone} value={zone}/>)}</datalist>
          <p id="timezone-help" className="muted">Starts with your device’s time zone. Choose the zone where your community meets.</p>
          <div className="participation-choice"><label className="check-label"><input name="join" type="checkbox" checked={draft.join} onChange={e => update('join', e.target.checked)}/>Would you also like to join this community as a participant?</label><p>You can manage this community either way. You can join later.</p></div>
          <button className="button full" type="submit">{busy ? 'Creating your community…' : 'Create community'}</button>
        </fieldset>
      </form><div className="auth-links"><button disabled={busy} onClick={onClose}>Cancel</button><button disabled={busy} onClick={onList}>Your communities</button></div>
    </>}
  </section></main>
}
