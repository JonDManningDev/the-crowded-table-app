import { Button } from '../../../components/primitives/Controls'
import { Icon, Tag } from '../../../components/ui'
import type { CommunityProfileDetails } from '../types'
import styles from './CommunityAboutPanel.module.css'

export function CommunityAboutPanel({ profile, onEdit }: { profile: Pick<CommunityProfileDetails, 'bio' | 'style' | 'teach'>; onEdit?: () => void }) {
  return (
    <section className={`panel ${styles.panel}`}>
      <span className="eyebrow">A LITTLE INTRODUCTION</span>
      <h2 data-heading="card">About me</h2>
      <p className="description">{profile.bio}</p>
      <div className="section-heading">
        <h3 data-heading="subsection">At the table, I’m…</h3>
        {onEdit && (
          <Button appearance="ghost" className="text-button" onClick={onEdit}>
            Edit <Icon name="arrow" size={16} />
          </Button>
        )}
      </div>
      <div className="tags">
        <Tag>{profile.style}</Tag>
        {profile.teach && (
          <Tag>
            <Icon name="leaf" size={14} /> Happy to teach
          </Tag>
        )}
        <Tag>Always up for a new game</Tag>
      </div>
    </section>
  )
}
