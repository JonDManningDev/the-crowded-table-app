import type { Activity, SeatStatus } from '../../mock/data'
import type { CreateTableDraft, MatchingPreferencesDraft, MeetPlayContent, MeetPlayTableSummary, TableFilterValues } from './types'

export function readMeetPlayContent(): MeetPlayContent {
  const tableTypes = ['Board Game', 'RPG', 'TCG', 'Social / Party', 'Classic Games', 'Other']
  return {
    gameTypes: ['All games', ...tableTypes],
    locations: ['Anywhere', 'Public places', 'Private locations'],
    tableTypes,
    initialFilters: { searchQuery: '', gameType: 'All games', locationType: 'Anywhere', beginnerFriendlyOnly: false },
    createTableDefaults: {
      title: '', category: 'Board Game', capacity: '5', date: '2026-10-17',
      time: '16:00', end: '19:00', privateLocation: true, location: '',
      mode: 'request', description: '', beginnerFriendly: true,
    },
    matchingOptions: {
      availabilities: ['Saturday evening', 'Sunday afternoon', 'Weekday evenings'],
      gameTypes: ['Strategy games', 'Social & party games', 'RPGs', 'A little bit of everything'],
      playStyles: ['Casual — here for good company', 'Learning — show me something new', 'Competitive — a friendly challenge'],
    },
  }
}

// Read the current App snapshot; never reset it from seed records. Exact addresses
// and other dialog-only fields are excluded from the listing presentation contract.
export function readMeetPlayTables(items: readonly Activity[], seats: Readonly<Record<string, SeatStatus>>): MeetPlayTableSummary[] {
  return items.filter(item => item.kind === 'table').map(item => ({
    id: item.id, title: item.title, kind: 'table', art: item.art,
    category: item.category, date: item.date, time: item.time,
    capacity: item.capacity, filled: item.filled, host: item.host,
    location: item.location, private: item.private, special: item.special,
    status: seats[item.id], isBeginnerFriendly: item.tags.includes('Beginner friendly'),
  }))
}

export function selectMeetPlayTables(source: readonly MeetPlayTableSummary[], selectedView: string, filters: TableFilterValues) {
  const query = filters.searchQuery.toLowerCase()
  return source.filter(item => (
    (selectedView === 'Find a Table' || item.host === 'You' || item.status)
    && `${item.title} ${item.host} ${item.location}`.toLowerCase().includes(query)
    && (filters.gameType === 'All games' || item.category === filters.gameType)
    && (filters.locationType === 'Anywhere' || (filters.locationType === 'Public places' ? !item.private : item.private))
    && (!filters.beginnerFriendlyOnly || item.isBeginnerFriendly)
  ))
}

// Existing prototype constraints/defaults only. Native form constraints stay in
// the presenter; this preserves the former custom validation order and messages.
export function createMockTable(draft: CreateTableDraft):
  | { ok: false; error: string }
  | { ok: true; item: Activity; notice: string } {
  if (draft.end <= draft.time) {
    return { ok: false, error: 'End time must be after start time for this same-day table.' }
  }
  const title = draft.title.trim()
  const address = draft.location.trim()
  if (!title || !address) return { ok: false, error: 'Please add a title and meeting location.' }
  return {
    ok: true,
    item: {
      id: crypto.randomUUID(), title, kind: 'table', art: 'forest',
      category: draft.category, date: draft.date, time: draft.time, end: draft.end,
      capacity: Number(draft.capacity), filled: 1, host: 'You',
      private: draft.privateLocation,
      location: draft.privateLocation ? 'Private location · Tegucigalpa' : address,
      address: draft.privateLocation ? address : undefined,
      description: draft.description.trim(), joinMode: draft.mode,
      tags: draft.beginnerFriendly ? ['Beginner friendly'] : ['Experienced players'],
    },
    notice: 'Your table is ready. Let’s find you some company!',
  }
}

export function saveMockMatchingPreferences(draft: MatchingPreferencesDraft) {
  return {
    preferences: { ...draft },
    matching: true,
    notice: 'Your matching preferences are with our community hosts. We’ll help you find a table.',
  }
}
