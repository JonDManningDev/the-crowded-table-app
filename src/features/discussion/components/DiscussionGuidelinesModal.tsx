import { Modal } from '../../../components/ui'
import styles from './DiscussionGuidelinesModal.module.css'

export function DiscussionGuidelinesModal({ guidelines, onClose }: { guidelines: string[]; onClose: () => void }) {
  return (
    <Modal title="Good people. Good table manners." onClose={onClose}>
      <ol className={`rules ${styles.rules}`}>{guidelines.map(rule => <li key={rule}>{rule}</li>)}</ol>
    </Modal>
  )
}
