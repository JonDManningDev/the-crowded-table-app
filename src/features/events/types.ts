import type { GameArtVariant } from '../../components/GameArt'

// Rendering contract shared by official-event and legacy table cards.
export type ActivityCardData = {
  id: string
  title: string
  kind: 'official' | 'table'
  art: GameArtVariant
  category: string
  date: string
  time: string
  capacity: number
  filled: number
  host: string
  location: string
  private: boolean
  special?: boolean
}

export type CommunityHomeEvent = ActivityCardData & { status?: string }

export type EventCalendarData = {
  month: number
  monthLabel: string
  monthName: string
  previousMonth: number | null
  nextMonth: number | null
  leadingDays: number
  days: { day: number; events: CommunityHomeEvent[] }[]
  hasEvents: boolean
}
