import type { GameArtVariant } from '../../components/GameArt'

export type CommunityCreationDraft = {
  name: string; slug: string; country: string; region: string; city: string; timezone: string; displayName: string; bio: string
}
export type CommunityCreationOptions = {
  countries: { code: string; name: string }[]; timezones: string[]; initialTimezone: string; isConfigured: boolean
}
export type CommunityCreationSummary = {
  id: string; name: string; slug: string; locationLabel: string; timezone: string
}

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

export type CommunityProfileDetails = {
  name: string; location: string; bio: string; interests: string[]; style: string; teach: boolean
}
export type CommunityProfilePreferences = { reminders: boolean; replies: boolean; digest: boolean; history: boolean }
export type CommunityProfileActivity = { id: string; title: string; art: GameArtVariant; dateLabel: string; statusLabel: string }
export type CommunityProfileContent = {
  sidebar: { stats: { value: string; label: string }[] }
  favorites: { name: string; art: GameArtVariant }[]
  insight: { icon: string; eyebrow: string; heading: string; description: string }
  history: { title: string; date: string; art: GameArtVariant }[]
  achievements: { icon: string; title: string; text: string }[]
  benefits: string[]
  preferenceChoices: { key: keyof CommunityProfilePreferences; title: string; text: string }[]
  editor: { interests: string[]; styles: string[]; nameMaxLength: number; locationMaxLength: number; bioMaxLength: number }
  supportMaxLength: number
  historyDisclosure: string
}

export type CommunityPreviewIdentity = { name: string; subtitle: string; location: string; motto: string }
export type MembershipPreviewContent = { benefits: string[] }
