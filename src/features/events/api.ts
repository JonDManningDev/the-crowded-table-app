import type { Activity, SeatStatus } from '../../mock/data'
import type { CommunityHomeEvent, EventCalendarData } from './types'

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
