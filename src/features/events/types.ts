import type { ActivityCardData } from '../../components/shared/ActivityCard'

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

// Shared legacy detail projection, independent of the mock storage record.
export type ActivityReservationStatus = 'confirmed' | 'requested' | 'waitlisted'
export type ActivityDetails = ActivityCardData & {
  end: string; description: string; tags: string[]; joinMode: 'instant' | 'request'
  status?: ActivityReservationStatus; cost?: number; isHosting: boolean; canChat: boolean
  canViewAddress: boolean; address?: string
}
