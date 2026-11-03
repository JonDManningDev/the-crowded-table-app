import { Modal, Icon } from '../../../components/ui'
import { Button } from '../../../components/primitives/Controls'
import type { CreateTableDraft } from '../types'
import styles from './CreateTableModal.module.css'

export function CreateTableModal({ draft, tableTypes, error, onDraftChange, onSubmit, onClose }: {
  draft: CreateTableDraft
  tableTypes: string[]
  error: string
  onDraftChange: (draft: CreateTableDraft) => void
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <Modal title="Make room at your table" onClose={onClose}>
      <form className={`form ${styles.form}`} onSubmit={event => { event.preventDefault(); onSubmit() }}>
        <p className="muted">A favorite game, a little space, and a few new friends.</p>
        <label>
          What are we playing?
          <input name="title" value={draft.title} onChange={event => onDraftChange({ ...draft, title: event.target.value })} placeholder="e.g. Wingspan & Sunday coffee" required maxLength={70}/>
        </label>
        <div className={styles.row}>
          <label>
            Game type
            <select name="category" value={draft.category} onChange={event => onDraftChange({ ...draft, category: event.target.value })}>{tableTypes.map(name => <option key={name}>{name}</option>)}</select>
          </label>
          <label>
            Total seats, including you
            <input name="capacity" value={draft.capacity} onChange={event => onDraftChange({ ...draft, capacity: event.target.value })} type="number" min="2" max="30" required/>
          </label>
        </div>
        <div className={styles.threeColumns}>
          <label>Date<input type="date" name="date" value={draft.date} onChange={event => onDraftChange({ ...draft, date: event.target.value })} required/></label>
          <label>Starts<input type="time" name="time" value={draft.time} onChange={event => onDraftChange({ ...draft, time: event.target.value })} required/></label>
          <label>Ends<input type="time" name="end" value={draft.end} onChange={event => onDraftChange({ ...draft, end: event.target.value })} required/></label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.privateLocation}
            onChange={event => onDraftChange({ ...draft, privateLocation: event.target.checked })}
          />
          This is a private location
        </label>
        <label>
          {draft.privateLocation ? 'Exact meeting address (confirmed guests only)' : 'Public meeting place'}
          <input
            name="location" value={draft.location} onChange={event => onDraftChange({ ...draft, location: event.target.value })}
            placeholder={draft.privateLocation ? 'Use a fictional address for this preview' : 'Café name and general location'}
            required
            maxLength={150}
          />
        </label>
        <label>
          How should people join?
          <select name="mode" value={draft.mode} onChange={event => onDraftChange({ ...draft, mode: event.target.value as CreateTableDraft['mode'] })}>
            <option value="request">Request a seat — I’ll approve each guest</option>
            <option value="instant">Take a seat — instant confirmation</option>
          </select>
        </label>
        <label>
          Tell us about your table
          <textarea
            name="description" value={draft.description} onChange={event => onDraftChange({ ...draft, description: event.target.value })}
            placeholder="What should people expect? Keep private addresses out of this description."
            required
            maxLength={1000}
          />
        </label>
        <label className="check-label">
          <input name="beginner" type="checkbox" checked={draft.beginnerFriendly} onChange={event => onDraftChange({ ...draft, beginnerFriendly: event.target.checked })}/>
          First timers welcome — happy to teach
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <Button appearance="primary" type="submit" className="button">
          Create my table <Icon name="plus" size={18}/>
        </Button>
      </form>
    </Modal>
  )
}
