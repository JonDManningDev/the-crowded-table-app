import type { ActivityCardData } from '../events/types'

export type TableFilterValues = {
  searchQuery: string
  gameType: string
  locationType: string
  beginnerFriendlyOnly: boolean
}

export type CreateTableDraft = {
  title: string
  category: string
  capacity: string
  date: string
  time: string
  end: string
  privateLocation: boolean
  location: string
  mode: 'instant' | 'request'
  description: string
  beginnerFriendly: boolean
}

export type MatchingPreferencesDraft = {
  availability: string
  game: string
  style: string
  notes: string
}

export type MeetPlayTableSummary = ActivityCardData & {
  kind: 'table'
  status?: string
  isBeginnerFriendly: boolean
}

export type MeetPlayContent = {
  gameTypes: string[]
  locations: string[]
  tableTypes: string[]
  initialFilters: TableFilterValues
  createTableDefaults: CreateTableDraft
  matchingOptions: {
    availabilities: string[]
    gameTypes: string[]
    playStyles: string[]
  }
}
