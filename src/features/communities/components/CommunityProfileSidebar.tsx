import { Button } from '../../../components/primitives/Controls'
import { Avatar, Botanical, Icon, Tag } from '../../../components/ui'
import type { CommunityProfileContent, CommunityProfileDetails } from '../types'
import styles from './CommunityProfileSidebar.module.css'

export function CommunityProfileSidebar({ profile, content, isMemberPreview, onOpenMembership, onOpenPreview }: {
  profile: CommunityProfileDetails; content: CommunityProfileContent['sidebar']; isMemberPreview: boolean
  onOpenMembership: () => void; onOpenPreview: () => void
}) {
  return (
    <aside>
      <section className={`panel ${styles['profile-summary']}`}>
        <Botanical />
        <Avatar name={profile.name} large tone="peach" />
        <h2>{profile.name}</h2>
        <span className="location">
          <Icon name="pin" size={15} />
          {profile.location}
        </span>
        <p className={styles['profile-quote']}>“Good games. Good people.”</p>
        <div className="tags">
          {profile.interests.map(interest => (
            <Tag key={interest}>{interest}</Tag>
          ))}
        </div>
        <div className={styles['profile-stats']}>
          {content.stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
        </div>
        <Button appearance="unstyled" className={styles['member-status']} onClick={onOpenMembership}>
          <Icon name="leaf" size={27} />
          <span>
            <strong>{isMemberPreview ? 'Crowded Table Member' : 'Your next chapter awaits'}</strong>
            <small>
              {isMemberPreview ? 'Belonging since September 2026' : 'Explore membership · L300/month'}
            </small>
          </span>
          <Icon name="chevron" size={17} />
        </Button>
        <Button appearance="ghost" className="text-button" onClick={() => onOpenPreview()}>
          Preview member-facing profile <Icon name="arrow" size={16} />
        </Button>
      </section>
      <div className={styles['profile-side-note']}>
        <Icon name="heart" />
        <p>
          Different people.<br />
          <em>Same table.</em>
        </p>
      </div>
    </aside>
  )
}
