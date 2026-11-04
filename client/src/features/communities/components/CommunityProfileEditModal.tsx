import { Button } from '../../../components/primitives/Controls'
import { Icon, Modal } from '../../../components/ui'
import type { CommunityProfileContent, CommunityProfileDetails } from '../types'
import styles from './CommunityProfileEditModal.module.css'

export function CommunityProfileEditModal({ draft, options, onDraftChange, onSubmit, onClose }: {
  draft: CommunityProfileDetails; options: CommunityProfileContent['editor']; onDraftChange: (draft: CommunityProfileDetails) => void
  onSubmit: () => void; onClose: () => void
}) {
  return (
    <Modal title="Make your profile feel like you" onClose={onClose}>
      <form className={`form ${styles.form}`} onSubmit={event => { event.preventDefault(); onSubmit() }}>
        <div className={styles.row}>
          <label>
            Your display name
            <input name="name" value={draft.name} onChange={event => onDraftChange({ ...draft, name: event.target.value })} required maxLength={options.nameMaxLength} />
          </label>
          <label>
            General location
            <input name="location" value={draft.location} onChange={event => onDraftChange({ ...draft, location: event.target.value })} required maxLength={options.locationMaxLength} />
          </label>
        </div>
        <label>
          A little about you
          <textarea name="bio" value={draft.bio} onChange={event => onDraftChange({ ...draft, bio: event.target.value })} maxLength={options.bioMaxLength} />
        </label>
        <fieldset>
          <legend>What brings you to the table?</legend>
          <div className={styles['interest-options']}>
            {options.interests.map(interest => (
              <label key={interest}>
                <input
                  type="checkbox"
                  name="interests"
                  value={interest}
                  checked={draft.interests.includes(interest)}
                  onChange={event => onDraftChange({ ...draft, interests: event.target.checked ? [...draft.interests, interest] : draft.interests.filter(value => value !== interest) })}
                />
                {interest}
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Play style
          <select name="style" value={draft.style} onChange={event => onDraftChange({ ...draft, style: event.target.value })}>
            {options.styles.map(style => <option key={style}>{style}</option>)}
          </select>
        </label>
        <label className="check-label">
          <input type="checkbox" name="teach" checked={draft.teach} onChange={event => onDraftChange({ ...draft, teach: event.target.checked })} />
          I’m happy to teach new players
        </label>
        <Button appearance="primary" className="button" type="submit">
          Save my profile <Icon name="check" size={18} />
        </Button>
      </form>
    </Modal>
  )
}
