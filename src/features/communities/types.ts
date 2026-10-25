import type { GameArtVariant } from '../../components/GameArt'

export type CommunityHomeContent = {
  year: number
  initialMonth: number
  categories: string[]
  timezoneLabel: string
  hero: {
    eyebrow: string
    eventId: string
    art: GameArtVariant
    dateLabel: string
    title: string
    note: string
    initials: string[]
  }
  weeklySchedule: {
    day: string
    heading: string
    description: string
    time: string
    icon: string
    tone: 'sage' | 'peach'
  }[]
  highlight: {
    eventId: string
    art: GameArtVariant
    heading: string
    description: string
    date: string
    specialCallouts: string
    actionLabel: string
  }
  promotion: { heading: string; description: string; actionLabel: string }
}
