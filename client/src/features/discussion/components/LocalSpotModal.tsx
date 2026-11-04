import { Modal } from '../../../components/ui'
import { Notice } from '../../../components/primitives/Notice'
import { GameArt } from '../../../components/GameArt'
import type { LocalSpot } from '../types'
import styles from './LocalSpotModal.module.css'

export function LocalSpotModal({ spot, onClose }: { spot: LocalSpot; onClose: () => void }) {
  return (
    <Modal title={spot.name} onClose={onClose}>
      <GameArt type={spot.art} className={`small-art ${styles.art}`} />
      <p>{spot.text}</p>
      <p className="muted">{spot.area}</p>
      <Notice variant="caution">

        This is a sample place for exploring the design, not a verified venue listing.
      </Notice>
    </Modal>
  )
}
