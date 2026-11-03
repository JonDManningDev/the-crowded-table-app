import type { GameArtVariant } from '../../components/GameArt'

export type NewDiscussionDraft = { topic: string; title: string; body: string }
export type DiscussionPost = {
  id: string; author: string; topic: string; title: string; body: string
  replies: { author: string; body: string }[]
}
export type DiscussionTopicOption = { name: string; icon: string; count: number }
export type DiscussionMember = {
  name: string; color: string; bio: string; interests: string[]; location: string; memberSince: string
}
export type GameRecommendation = { game: string; art: GameArtVariant; name: string; text: string; tag: string }
export type LocalSpot = {
  name: string; type: string; area: string; text: string; art: GameArtVariant
  mapPosition: { left: string; top: string }
}
export type DiscussionContent = {
  topics: Omit<DiscussionTopicOption, 'count'>[]
  members: DiscussionMember[]
  recommendations: GameRecommendation[]
  spots: LocalSpot[]
  spotTypes: string[]
  mapArea: string
  guidelines: string[]
  newDiscussionForm: { topics: string[]; defaultTopic: string; titleMaxLength: number; bodyMaxLength: number }
  replyMaxLength: number
}
