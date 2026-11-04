import { Button } from '../../../components/primitives/Controls'
import { Notice } from '../../../components/primitives/Notice'
import { Icon, Modal } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import type { ChampionshipContent } from '../types'
import styles from './ChampionshipEntryModal.module.css'

export function ChampionshipEntryModal({ content, isMemberPreview, onRegister, onClose }: {
  content: ChampionshipContent['entry']
  isMemberPreview: boolean
  onRegister: () => void
  onClose: () => void
}) {
  return (
    <Modal title="Your next adventure starts here" onClose={onClose}>
      <GameArt type={content.art} className={`small-art ${styles.art}`}/>
      <h3>{content.title}</h3>
      <p>
        {isMemberPreview
          ? 'Your entry is included with membership.'
          : 'L200 gives you access to this championship. Meet & Play and Community remain members-only.'}
      </p>
      <Notice icon="calendar"> {content.schedule}</Notice>
      <p className="meta">
        {!isMemberPreview && 'Preview payment only; no charge will be made. '}
        All players agree to friendly play, honest results, and independent match confirmation.
      </p>
      <Button
        appearance="primary"
        full
        className="button full"
        onClick={onRegister}
      >
        {isMemberPreview ? 'Count me in' : 'Simulate entry payment'}
        <Icon name="check" size={18}/>
      </Button>
    </Modal>
  )
}
