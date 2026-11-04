import { Button } from '../primitives/Controls'
import { Avatar, Icon } from '../ui'
import { GameArt, type GameArtVariant } from '../GameArt'
import { formatDate, formatTime } from '../../lib/dateTime'
import styles from './ActivityCard.module.css'

// Rendering contract shared by official-event and legacy table cards.
export type ActivityCardData = {
  id: string
  title: string
  kind: 'official' | 'table'
  art: GameArtVariant
  category: string
  date: string
  time: string
  capacity: number
  filled: number
  host: string
  location: string
  private: boolean
  special?: boolean
}

export function ActivityCard({
  item,
  onOpen,
  status,
}: {
  item: ActivityCardData
  onOpen: () => void
  status?: string
}) {
  const left = item.capacity - item.filled
  const stamp = new Date(item.date + 'T12:00:00')
  const seatLabel = status
    ? status === 'confirmed'
      ? 'You’re going'
      : status === 'requested'
        ? 'Request sent'
        : 'On the waitlist'
    : left
      ? `${left} seats open`
      : 'This table is crowded'
  return (
    <Button appearance="unstyled" className={styles.card} onClick={onOpen}>
      <div className={styles.art}>
        <GameArt type={item.art}/>
        <span className={`${styles.artLabel} ${item.special ? styles.special : ''}`}>{item.category}</span>
        <span className={styles.dateStamp}>
          <b>{stamp.getDate()}</b>
          <span>{stamp.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          {formatDate(item.date, true)} <span>·</span> {formatTime(item.time)}
        </div>
        <h3>{item.title}</h3>
        <p className={styles.location}>
          <Icon name={item.private ? 'lock' : 'pin'} size={14}/>
          {item.location}
        </p>
        {item.kind === 'table' && (
          <div className={styles.host}>
            <Avatar name={item.host}/>
            <span>Hosted by <strong>{item.host}</strong></span>
          </div>
        )}
        <div className={styles.bottom}>
          <span className={left === 0 ? styles.full : styles.availability}>
            <span className={`dot ${left === 0 ? 'rust' : ''}`}/>
            {seatLabel}
          </span>
          <Icon name="arrow" size={19}/>
        </div>
      </div>
    </Button>
  )
}

