import type { FormEventHandler, Ref } from 'react'
import { Button, Link } from '../../../components/primitives/Controls'
import { pagePaths } from '../../../app/navigation'
import type { CommunityCreationDraft, CommunityCreationOptions } from '../types'
import styles from './CommunityCreationForm.module.css'

export function CommunityCreationForm({ draft, options, isCreating, error, errorRef, onDraftChange, onSubmit }: {
  draft: CommunityCreationDraft; options: CommunityCreationOptions; isCreating: boolean; error: string
  errorRef: Ref<HTMLParagraphElement>; onSubmit: FormEventHandler<HTMLFormElement>
  onDraftChange: <Key extends keyof CommunityCreationDraft>(key: Key, value: CommunityCreationDraft[Key]) => void
}) {
  return <>
    <h1>Start a new community.</h1>
    <p>You’ll become its owner. Give your community a name and a place to call home.</p>
    {error && <p className={styles.error} role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
    <form className="form" onSubmit={onSubmit} aria-busy={isCreating}>
      <fieldset disabled={isCreating} className={styles.fields}>
        <label>
          Community name
          <input
            name="name"
            required
            maxLength={120}
            value={draft.name}
            onChange={event => onDraftChange('name', event.target.value)}
            autoFocus
          />
        </label>
        <label>
          Community handle
          <input
            name="slug"
            required
            minLength={3}
            maxLength={63}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={draft.slug}
            onChange={event => onDraftChange('slug', event.target.value)}
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="handle-help"
          />
        </label>
        <p id="handle-help" className={`muted ${styles.help}`}>
          A unique name such as tegucigalpa-game-nights. Use lowercase letters, numbers, and
          single hyphens. This handle cannot be changed later.
        </p>
        <label>
          Country
          <select
            name="country"
            required
            value={draft.country}
            onChange={event => onDraftChange('country', event.target.value)}
          >
            <option value="">Choose a country</option>
            {options.countries.map(country => (
              <option key={country.code} value={country.code}>{country.name}</option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            State / province (optional)
            <input
              name="region"
              maxLength={120}
              value={draft.region}
              onChange={event => onDraftChange('region', event.target.value)}
            />
          </label>
          <label>
            City (optional)
            <input
              name="city"
              maxLength={120}
              value={draft.city}
              onChange={event => onDraftChange('city', event.target.value)}
            />
          </label>
        </div>
        <label>
          Community time zone
          <input
            name="timezone"
            required
            list="community-timezones"
            value={draft.timezone}
            onChange={event => onDraftChange('timezone', event.target.value)}
            aria-describedby="timezone-help"
          />
        </label>
        <datalist id="community-timezones">
          {options.timezones.map(zone => <option key={zone} value={zone}/>)}
        </datalist>
        <p id="timezone-help" className={`muted ${styles.help}`}>
          Starts with your device’s time zone. Choose the zone where your community meets.
        </p>
        <div className={styles.participation}>
          <label className="check-label">
            <input
              name="join"
              type="checkbox"
              checked={draft.join}
              onChange={event => onDraftChange('join', event.target.checked)}
            />
            Would you also like to join this community as a participant?
          </label>
          <p>You can manage this community either way. You can join later.</p>
        </div>
        <Button appearance="primary" full className="button full" type="submit" loading={isCreating}>
          {isCreating ? 'Creating your community…' : 'Create community'}
        </Button>
      </fieldset>
    </form>
    <div className={styles.links}>
      {isCreating ? (
        <span>Creating your community…</span>
      ) : (
        <>
          <Link to={pagePaths['my-communities']}>Cancel</Link>
          <Link to={pagePaths['my-communities']}>Your communities</Link>
        </>
      )}
    </div>
  </>
}
