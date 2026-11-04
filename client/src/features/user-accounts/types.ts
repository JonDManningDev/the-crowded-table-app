import type { CommunityFilter, CommunitySummary } from '../../../../shared/self-service'
export type { CommunityFilter, CommunitySummary }
import type { GameArtVariant } from '../../components/GameArt'

export type DiscoveryPreferences = {
  user_is_discoverable: boolean
  enable_matchmaking: boolean
}

export type CommunicationPreferences = {
  allow_direct_messages: boolean
}

export type { AccountPreferences } from '../../../../shared/account-preferences'

export type PremiumFeaturePlaceholder = {
  id: string
  name: string
  detail: string
}

export type AccountProfileInsight = {
  id: string
  iconName: string
  eyebrow: string
  heading: string
  description: string
}

export type AccountProfilePlaceholders = {
  location: string
  interests: string[]
  playStyle: string
  isHappyToTeach: boolean
  eventCount: number
  hostedTableCount: number
  coPlayerCount: number
  favoriteGames: { name: string; art: GameArtVariant }[]
}

export type ProfileFieldErrors = { displayName?: string; bio?: string }

export type AccountSummary = {
  status: 'loading' | 'signed-in' | 'signed-out'
  email: string | null
  userId?: string
  busy?: boolean
  signOut?: () => void
  displayName?: string
  bio?: string
  profileLoading?: boolean
  profileError?: string
  saveProfile?: (name: string, bio: string) => Promise<void>
}

export type CommunityCardData = {
  id: string
  name: string
  place: string
  status: 'Active' | 'Archived'
  participation: 'Owner' | 'Staff' | 'Member'
  sample?: boolean
}
