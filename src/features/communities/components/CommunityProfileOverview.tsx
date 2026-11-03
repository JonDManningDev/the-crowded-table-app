import { InsightCard } from '../../../components/shared/InsightCard'
import { Icon } from '../../../components/ui'
import { CommunityAboutPanel } from './CommunityAboutPanel'
import { CommunityFavoriteGamesPanel } from './CommunityFavoriteGamesPanel'
import type { CommunityProfileContent, CommunityProfileDetails } from '../types'
import styles from './CommunityProfileOverview.module.css'

export function CommunityProfileOverview({ profile, favorites, insight, onEdit }: {
  profile: Pick<CommunityProfileDetails, 'bio' | 'style' | 'teach'>
  favorites: CommunityProfileContent['favorites']; insight: CommunityProfileContent['insight']; onEdit?: () => void
}) {
  return (
    <div className={styles.sections}>
      <CommunityAboutPanel profile={profile} onEdit={onEdit} />
      <InsightCard icon={<Icon name={insight.icon} size={28} />} eyebrow={insight.eyebrow} heading={insight.heading} description={insight.description} />
      <CommunityFavoriteGamesPanel favorites={favorites} />
    </div>
  )
}
