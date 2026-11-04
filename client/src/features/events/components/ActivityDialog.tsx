import type { ReactNode } from 'react'
import { Modal } from '../../../components/ui'
import { GameArt } from '../../../components/GameArt'
import { ActivityDetailsPanel } from './ActivityDetailsPanel'
import { ActivityReservationPanel } from './ActivityReservationPanel'
import type { ActivityDetails } from '../types'
import styles from './ActivityDialog.module.css'

export function ActivityDialog({ activity, children, onClose, ...reservation }: {
  activity: ActivityDetails; children?: ReactNode; onClose: () => void; isCheckoutOpen: boolean
  onReserve: () => void; onCancelReservation: () => void; onConfirmCheckout: () => void; onCloseCheckout: () => void
}) {
  return <Modal title={activity.kind === 'official' ? 'Around our table' : 'A table for good company'} onClose={onClose} wide>
    <GameArt type={activity.art} className={styles['detail-art']}/>
    <div className={styles['detail-grid']}>
      <ActivityDetailsPanel activity={activity}>{children}</ActivityDetailsPanel>
      <ActivityReservationPanel activity={activity} className={styles.reservation} {...reservation}/>
    </div>
  </Modal>
}
