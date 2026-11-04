import { Modal, Icon } from '../../../components/ui'
import { Button } from '../../../components/primitives/Controls'
import type { MatchingPreferencesDraft, MeetPlayContent } from '../types'
import styles from './MatchingPreferencesModal.module.css'

export function MatchingPreferencesModal({ draft, options, onDraftChange, onSubmit, onClose }: {
  draft: MatchingPreferencesDraft
  options: MeetPlayContent['matchingOptions']
  onDraftChange: (draft: MatchingPreferencesDraft) => void
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <Modal title="Let’s find your people" onClose={onClose}>
      <p className="muted">
        Tell us a little about your ideal evening. A community host will help connect you with a table.
      </p>
      <form className={`form ${styles.form}`} onSubmit={event => { event.preventDefault(); onSubmit() }}>
        <label>
          When would you like to play?
          <select name="availability" value={draft.availability} onChange={event => onDraftChange({ ...draft, availability: event.target.value })} required>
            {options.availabilities.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Your kind of game
          <select name="game" value={draft.game} onChange={event => onDraftChange({ ...draft, game: event.target.value })}>
            {options.gameTypes.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          How do you like to play?
          <select name="style" value={draft.style} onChange={event => onDraftChange({ ...draft, style: event.target.value })}>
            {options.playStyles.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Anything else?
          <textarea
            name="notes"
            value={draft.notes} onChange={event => onDraftChange({ ...draft, notes: event.target.value })}
            placeholder="A game you’d love to try, or what makes a great table…"
            maxLength={500}
          />
        </label>
        <Button appearance="primary" className="button" type="submit">
          Send my preferences <Icon name="arrow" size={18}/>
        </Button>
      </form>
    </Modal>
  )
}
