import type { GameArtVariant } from '../../components/GameArt'

export type MatchResultDraft = { opponent: string; date: string; score: string; opponentScore: string }
export type ChampionshipStanding = { name: string; points: number; games: number; isCurrentPlayer: boolean }
export type ChampionshipMatchSummary = {
  id: string
  authorLabel: string
  opponentLabel: string
  score: number
  opponentScore: number
  date: string
  status: 'pending' | 'confirmed' | 'disputed'
  canReview: boolean
  waitingFor: string | null
}
export type ChampionshipContent = {
  hero: { badge: string; game: string; art: GameArtVariant; qualifyingLabel: string }
  stats: { value: string; label: string }[]
  steps: [string, string][]
  champions: { month: string; year: number; game: string; name: string; art: GameArtVariant }[]
  rules: string[]
  entry: { art: GameArtVariant; title: string; schedule: string }
  final: { title: string; dateTime: string; location: string; game: string; qualifierLabel: string }
  resultForm: { opponents: string[]; minDate: string; maxDate: string; initialDraft: MatchResultDraft }
}
