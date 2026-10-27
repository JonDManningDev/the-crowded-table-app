import type { Activity, SeatStatus } from '../../mock/data'
import type { ActivityDetails, CommunityHomeEvent, EventCalendarData } from './types'

// Compatibility boundary: always project the current App-owned snapshot.
// Do not import pristine seed data or create a second reservation store here.
export function readCommunityHomeEvents(
  items: readonly Activity[],
  seats: Readonly<Record<string, SeatStatus>>,
): CommunityHomeEvent[] {
  return items.filter(item => item.kind === 'official').map(item => ({
    id: item.id, title: item.title, kind: item.kind, art: item.art,
    category: item.category, date: item.date, time: item.time,
    capacity: item.capacity, filled: item.filled, host: item.host,
    location: item.location, private: item.private, special: item.special,
    status: seats[item.id],
  }))
}

export function selectCommunityEvents(
  source: readonly CommunityHomeEvent[],
  category: string,
  year: number,
  month: number,
): { events: CommunityHomeEvent[]; calendar: EventCalendarData } {
  const events = source.filter(item => item.kind === 'official'
    && (category === 'All evenings' || item.category === category))
  // Preserve the prototype's month-only selection and frozen fixture year.
  const shown = events.filter(item => new Date(item.date + 'T12:00:00').getMonth() === month)
  const stamp = new Date(year, month)
  return {
    events,
    calendar: {
      month,
      monthLabel: stamp.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      monthName: stamp.toLocaleDateString('en-US', { month: 'long' }),
      previousMonth: month === 0 ? null : month - 1,
      nextMonth: month === 11 ? null : month + 1,
      leadingDays: new Date(year, month, 1).getDay(),
      days: Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => ({
        day: index + 1,
        events: shown.filter(item => new Date(item.date + 'T12:00:00').getDate() === index + 1),
      })),
      hasEvents: shown.length > 0,
    },
  }
}


// Compatibility projection over the current App snapshot. This is simulated
// eligibility, not backend authorization; listings remain separate safe shapes.
export function readActivityDetails(items: readonly Activity[], seats: Readonly<Record<string, SeatStatus>>, member: boolean, id: string): ActivityDetails | null {
  const item = items.find(row => row.id === id)
  if (!item) return null
  const status = seats[id]
  const isHosting = item.host === 'You'
  const canViewAddress = isHosting || status === 'confirmed'
  return {
    id: item.id, title: item.title, kind: item.kind, art: item.art, category: item.category,
    date: item.date, time: item.time, end: item.end, capacity: item.capacity, filled: item.filled,
    host: item.host, location: item.location, private: item.private, special: item.special,
    description: item.description, tags: [...item.tags], joinMode: item.joinMode, status,
    isHosting, canViewAddress, canChat: member && item.kind === 'table' && canViewAddress,
    cost: item.special ? item.price : !member && item.kind === 'official' ? 125 : 0,
    ...(item.private && canViewAddress && item.address ? { address: item.address } : {}),
  }
}

export function reserveMockActivity(item: Activity, seats: Readonly<Record<string, SeatStatus>>, member: boolean) {
  if (seats[item.id] || (item.kind === 'table' && !member)) return null
  const status: SeatStatus = item.filled >= item.capacity ? 'waitlisted' : item.joinMode === 'request' ? 'requested' : 'confirmed'
  return { status, filledChange: status === 'confirmed' ? 1 : 0,
    notice: status === 'confirmed' ? `Your seat at ${item.title} is confirmed.`
      : status === 'requested' ? `Your request for ${item.title} was sent to the host.`
        : `You’re on the waitlist for ${item.title}.` }
}

export function cancelMockActivityReservation(id: string, seats: Readonly<Record<string, SeatStatus>>) {
  return { filledChange: seats[id] === 'confirmed' ? -1 : 0, notice: 'Your participation has been cancelled.' }
}
