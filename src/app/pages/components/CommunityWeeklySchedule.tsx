import { Icon } from '../../../components/ui'
import type { CommunityHomeContent } from '../../../features/communities/types'
import styles from './CommunityWeeklySchedule.module.css'

export function CommunityWeeklySchedule({ rows }: {
  rows: CommunityHomeContent['weeklySchedule']
}) {
  return (
    <div className={styles['rhythm-row']}>
      {rows.map(row => (
        <div key={row.day}>
          <span className={`round-icon ${row.tone === 'peach' ? 'peach' : ''}`}><Icon name={row.icon} size={23}/></span>
          <div>
            <span className="eyebrow">{row.day}</span>
            <h3>{row.heading}</h3>
            <p>{row.description}</p>
          </div>
          <span className={styles['rhythm-time']}>{row.time}</span>
        </div>
      ))}
    </div>
  )
}
