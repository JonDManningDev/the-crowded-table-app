import { Button } from '../../../components/primitives/Controls'
import { Modal } from '../../../components/ui'
import styles from './CommunitySupportModal.module.css'

export function CommunitySupportModal({ note, maxLength, onNoteChange, onSubmit, onClose }: {
  note: string; maxLength: number; onNoteChange: (note: string) => void; onSubmit: () => void; onClose: () => void
}) {
  return (
    <Modal title="There’s a person on the other side" onClose={onClose}>
      <form className={`form ${styles.form}`} onSubmit={event => { event.preventDefault(); onSubmit() }}>
        <p className="muted">This preview records the note locally; it does not contact anyone.</p>
        <label>
          Your note
          <textarea name="note" value={note} onChange={event => onNoteChange(event.target.value)} required maxLength={maxLength} />
        </label>
        <Button appearance="primary" className="button" type="submit">Save support note</Button>
      </form>
    </Modal>
  )
}
