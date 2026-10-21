import { Link } from 'react-router'
import { Button } from '../../components/primitives/Controls'
import { Avatar, Icon } from '../../components/ui'
import { AccountActions } from '../../features/auth/AccountActions'
import { pagePaths } from '../navigation'
import styles from './Topbar.module.css'

type TopbarProps = {
  personal: boolean
  pageLabel: string
  communityName: string
  member: boolean
  profileName: string
  hasNotices: boolean
  onSwitchMode: () => void
  onOpenNotifications: () => void
}

export function Topbar({
  personal, pageLabel, communityName, member, profileName, hasNotices,
  onSwitchMode, onOpenNotifications,
}: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <span className={styles.breadcrumb}>
        {personal ? 'Your space' : communityName}
        <span>/</span>
        <strong>{pageLabel}</strong>
      </span>
      <div className={styles.actions}>
        {!personal && (
          <div className={styles.actions}>
            <div className={styles.previewMode}>
              <span>Preview as</span>
              <Button
                appearance="unstyled"
                onClick={onSwitchMode}
                aria-label={`Switch to ${member ? 'guest' : 'member'} preview`}
              >
                <span className={`${styles.dot} ${!member ? styles.rust : ''}`}/>
                {member ? 'Member' : 'Guest'}
                <Icon name="chevron" size={13}/>
              </Button>
            </div>
            <Button
              appearance="unstyled"
              className={styles.notificationButton}
              onClick={onOpenNotifications}
              aria-label="Open community notifications"
            >
              <Icon name="bell"/>
              {hasNotices && <span/>}
            </Button>
            <Link className={styles.avatar} aria-label="Open your community profile" to={pagePaths.profile}>
              <Avatar name={profileName}/>
            </Link>
          </div>
        )}
        <AccountActions/>
      </div>
    </header>
  )
}
