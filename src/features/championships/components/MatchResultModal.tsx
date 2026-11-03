import { Button } from '../../../components/primitives/Controls'
import { Icon, Modal } from '../../../components/ui'
import type { ChampionshipContent, MatchResultDraft } from '../types'
import styles from './MatchResultModal.module.css'

export function MatchResultModal({ draft, options, onDraftChange, onSubmit, onClose }: {
  draft: MatchResultDraft
  options: ChampionshipContent['resultForm']
  onDraftChange: (draft: MatchResultDraft) => void
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <Modal title="Record a good game" onClose={onClose}>
      <p className="muted">
        Another participant will confirm your result before it counts. This preview models a
        two-player match.
      </p>
      <form className={`form ${styles.form}`} onSubmit={event => { event.preventDefault(); onSubmit() }}>
        <label>
          Played with
          <select name="opponent" value={draft.opponent} onChange={event => onDraftChange({ ...draft, opponent: event.target.value })}>
            {options.opponents.map(name => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label>
          Date played
          <input name="date" value={draft.date} onChange={event => onDraftChange({ ...draft, date: event.target.value })} type="date" min={options.minDate} max={options.maxDate} required/>
        </label>
        <div className={styles.row}>
          <label>Your score<input name="score" value={draft.score} onChange={event => onDraftChange({ ...draft, score: event.target.value })} type="number" min="0" max="300" required/></label>
          <label>Opponent’s score<input name="opponentScore" value={draft.opponentScore} onChange={event => onDraftChange({ ...draft, opponentScore: event.target.value })} type="number" min="0" max="300" required/></label>
        </div>
        <Button appearance="primary" className="button" type="submit">
          Send for confirmation <Icon name="arrow" size={18}/>
        </Button>
      </form>
    </Modal>
  )
}
