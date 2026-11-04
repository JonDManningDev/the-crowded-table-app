import { Avatar, Botanical, Icon, Tag } from '../../../components/ui'
import styles from './ProfileSidebar.module.css'

type ProfileSidebarProps = {
  name: string
  location: string
  interests: readonly string[]
  eventCount: number
  hostedTableCount: number
  coPlayerCount: number
}

export function ProfileSidebar({ name, location, interests, eventCount, hostedTableCount, coPlayerCount }: ProfileSidebarProps) {
  return (
    <aside>
      <section className={`panel ${styles.summary}`} aria-label="Profile summary">
        <Botanical/>
        <Avatar name={name.slice(0, 1)} large tone="peach"/>
        <h2 data-heading="card">{name}</h2>
        <span className={styles.location}><Icon name="pin" size={15}/>{location}</span>
        <p className={styles.quote} data-decorative>“Good games. Good people.”</p>
        <div className={`tags ${styles.interests}`}>
          {interests.map(interest => <Tag key={interest}>{interest}</Tag>)}
        </div>
        <div className={styles.stats}>
          <div><strong>{eventCount}</strong><span>events</span></div>
          <div><strong>{hostedTableCount}</strong><span>tables hosted</span></div>
          <div><strong>{coPlayerCount}</strong><span>co-players</span></div>
        </div>
      </section>
      <div className={styles.sideNote}>
        <Icon name="heart"/>
        <p data-decorative>Different people.<br/><em>Same table.</em></p>
      </div>
    </aside>
  )
}
