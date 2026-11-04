import { Button } from '../../../components/primitives/Controls'
import { Icon, Tag } from '../../../components/ui'
import styles from './ProfileAboutPanel.module.css'

type ProfileAboutPanelProps = {
  bio: string
  playStyle: string
  isHappyToTeach: boolean
  onEdit?: () => void
}

export function ProfileAboutPanel({ bio, playStyle, isHappyToTeach, onEdit }: ProfileAboutPanelProps) {
  return (
    <section className={`panel ${styles.panel}`}>
      <span className="eyebrow">A LITTLE INTRODUCTION</span>
      <div className={styles.heading}>
        <h2 data-heading="card">About me</h2>
        {onEdit && <Button appearance="ghost" className="text-button" onClick={onEdit}>
          Edit <Icon name="arrow" size={16}/>
        </Button>}
      </div>
      <p className={styles.description}>{bio}</p>
      <div className={styles.playStyleHeading}><h3 data-heading="subsection">At the table, I’m…</h3></div>
      <div className="tags">
        <Tag>{playStyle}</Tag>
        {isHappyToTeach && <Tag><Icon name="leaf" size={14}/> Happy to teach</Tag>}
        <Tag>Always up for a new game</Tag>
      </div>
    </section>
  )
}
