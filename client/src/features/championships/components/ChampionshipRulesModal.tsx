import { Modal } from '../../../components/ui'
import styles from './ChampionshipRulesModal.module.css'

export function ChampionshipRulesModal({ rules, onClose }: {
  rules: string[]
  onClose: () => void
}) {
  return (
    <Modal title="October · How we play" onClose={onClose}>
      <ol className={`rules ${styles.rules}`}>{rules.map(rule => <li key={rule}>{rule}</li>)}</ol>
      <p className="meta">
        Illustrative October rules. Final scoring and tie-break policy will be agreed before launch.
      </p>
    </Modal>
  )
}
