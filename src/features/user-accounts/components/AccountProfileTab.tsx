import { InsightsCarousel, type InsightsCarouselItem } from '../../../components/shared/InsightsCarousel'
import { ProfileSidebar } from './ProfileSidebar'
import { ProfileAboutPanel } from './ProfileAboutPanel'
import { FavoriteGamesPanel } from './FavoriteGamesPanel'
import type { AccountProfilePlaceholders } from '../types'
import styles from './AccountProfileTab.module.css'

type AccountProfileTabProps = {
  name: string
  bio: string
  placeholders: AccountProfilePlaceholders
  onEdit?: () => void
  insights: readonly InsightsCarouselItem[]
  activeInsightIndex: number
  onActiveInsightIndexChange: (index: number) => void
}

export function AccountProfileTab({ name, bio, placeholders, onEdit, insights,
  activeInsightIndex, onActiveInsightIndexChange }: AccountProfileTabProps) {
  return (
    <div className={styles.layout}>
      <ProfileSidebar name={name} location={placeholders.location} interests={placeholders.interests}
        eventCount={placeholders.eventCount} hostedTableCount={placeholders.hostedTableCount}
        coPlayerCount={placeholders.coPlayerCount}/>
      <div className={styles.sections}>
        <ProfileAboutPanel bio={bio} playStyle={placeholders.playStyle}
          isHappyToTeach={placeholders.isHappyToTeach} onEdit={onEdit}/>
        <InsightsCarousel insights={insights} activeIndex={activeInsightIndex}
          onActiveIndexChange={onActiveInsightIndexChange}/>
        <FavoriteGamesPanel games={placeholders.favoriteGames}/>
      </div>
    </div>
  )
}
