import { Button } from '../../../components/primitives/Controls'
import { Icon, Modal } from '../../../components/ui'
import type { CommunityNotification } from '../types'
import styles from './CommunityNotificationsModal.module.css'

export function CommunityNotificationsModal({ isMemberPreview, notices, onMarkAllRead, onClose }: {
  isMemberPreview: boolean; notices: CommunityNotification[]; onMarkAllRead: () => void; onClose: () => void
}) {
  return (
    <Modal title="A little news from your table" onClose={onClose}>
      {!isMemberPreview ? (
        <p className="muted">
          Your official-event and championship updates will appear here. Member-table
          notifications are private.
        </p>
      ) : notices.length ? (
        notices.map((notice, index) => (
          <div className={styles.notification} key={index}>
            <Icon name="leaf"/>
            <p>{notice.message}</p>
          </div>
        ))
      ) : (
        <p className="muted">You’re all caught up. A quiet moment before the next game.</p>
      )}
      {isMemberPreview && notices.length > 0 && (
        <Button appearance="ghost" className="text-button" onClick={onMarkAllRead}>
          Mark all as read <Icon name="check" size={16}/>
        </Button>
      )}
    </Modal>
  )
}
