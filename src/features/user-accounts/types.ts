import type { GameArtVariant } from '../../components/GameArt'

export type DiscoveryPreferences = {
  user_is_discoverable: boolean
  enable_matchmaking: boolean
}

export type CommunicationPreferences = {
  allow_direct_messages: boolean
}

export type AccountPreferences = DiscoveryPreferences & CommunicationPreferences

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
