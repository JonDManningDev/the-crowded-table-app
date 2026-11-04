import { submitCommunity } from './command-client'
import { selfServiceRequest } from '../../lib/api-client'
import type { CommunityPreferences } from '../../../shared/self-service'
import type { CommunityPreviewIdentity, MembershipPreviewContent } from './types'
import { interests, previewCommunity } from '../../mock/data'
import type { Activity, Profile, SeatStatus } from '../../mock/data'
import { formatDate } from '../../lib/dateTime'
import type { CommunityProfileActivity, CommunityProfileContent, CommunityProfileDetails, CommunityProfilePreferences } from './types'
import type { CommunityHomeContent } from './types'
import { supabase } from '../../lib/supabase'
import type { CommunityCreationDraft, CommunityCreationOptions, CommunityCreationSummary } from './types'
import { countryCodes, getCommunityCreationError } from './creation'

function browserTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}
export function readCommunityCreationOptions(): CommunityCreationOptions {
  const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
  const initialTimezone = browserTimezone()
  let timezones: string[]
  try { timezones = [...new Set(['UTC', initialTimezone, ...Intl.supportedValuesOf('timeZone')])].sort() }
  catch { timezones = ['UTC', initialTimezone, 'America/Tegucigalpa'] }
  return { countries: countryCodes.map(code => ({ code, name: countryNames.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name)),
    timezones, initialTimezone, isConfigured: Boolean(supabase) }
}

export async function createCommunity(userId: string, draft: CommunityCreationDraft): Promise<CommunityCreationSummary> {
  if (!supabase) throw new Error('Account services are not configured yet. Please try again later.')
  // Capture submitted strings before awaiting; the confirmed summary must not
  // drift if a caller later changes its draft. No detail/profile read is added.
  const submitted = { ...draft, name: draft.name.trim(), timezone: draft.timezone.trim(),
    region: draft.region.trim(), city: draft.city.trim() }
  const countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(submitted.country)
  const locationLabel = [submitted.city, submitted.region, countryName].filter(Boolean).join(', ')
  try {
    const result = await submitCommunity(userId, { name: submitted.name, slug: submitted.slug, country: submitted.country,
      region: submitted.region, city: submitted.city, timezone: submitted.timezone,
      profile: { displayName: submitted.displayName.trim(), bio: submitted.bio.trim() || null } })
    return { id: result.tenantId, name: submitted.name, slug: submitted.slug, locationLabel, timezone: submitted.timezone }
  } catch (error) {
    throw new Error(getCommunityCreationError({ code: error instanceof Error && 'code' in error ? String(error.code) : undefined }), { cause: error })
  }
}

export type CommunityAccountPreferences = {
  show_global_profile: boolean
}

export async function saveCommunityAccountPreferences(userId: string, tenantId: string, preferences: CommunityAccountPreferences) {
  const showGlobalProfile = preferences.show_global_profile
  const result = await selfServiceRequest<CommunityPreferences>(userId,'/api/communities/'+encodeURIComponent(tenantId)+'/me/preferences','PATCH',{
    show_global_profile: showGlobalProfile,
  })
  if (result.show_global_profile !== showGlobalProfile) throw new Error('Invalid preference response.')
}

export async function saveCommunityProfile(userId: string, tenantId: string, name: string, bio: string) {
  const result = await selfServiceRequest<{ tenantId: string }>(userId,'/api/communities/'+encodeURIComponent(tenantId)+'/me/profile','PATCH',{
    display_name: name.trim(), bio: bio.trim() || null,
  })
  if (result.tenantId !== tenantId) throw new Error('Invalid profile response.')
}

// Sample content only; no community feed, entitlement or payment API is implied.
export function readCommunityHomeContent(): CommunityHomeContent {
  return {
    year: 2026,
    initialMonth: 9,
    categories: ['All evenings', 'Learn & Play', 'Special Game Night', 'Seasonal gathering'],
    timezoneLabel: 'All times in Tegucigalpa',
    hero: {
      eyebrow: 'OCTOBER AT THE CROWDED TABLE', eventId: 'azul', art: 'azul',
      dateLabel: 'TUESDAY, OCTOBER 6', title: 'Learn & Play: Azul',
      note: 'Never played? Perfect. We’ll teach you.', initials: ['LM', 'CR', 'VG'],
    },
    weeklySchedule: [
      { day: 'TUESDAYS', heading: 'Learn something new.',
        description: 'One featured game. All experience levels.', time: '7:30 – 10:30 PM',
        icon: 'dice', tone: 'sage' },
      { day: 'THURSDAYS', heading: 'Expect a little different.',
        description: 'RPGs, social games, and themed evenings.', time: '7:30 – 10:30 PM',
        icon: 'star', tone: 'peach' },
    ],
    highlight: {
      eventId: 'halloween', art: 'mystery', heading: 'An evening with a twist.',
      description: 'Costumes, curious clues, and a table full of suspects.',
      date: '2026-10-31', specialCallouts: 'Separate ticket required',
      actionLabel: 'Discover our Halloween gathering',
    },
    promotion: {
      heading: 'More tables. More friends.',
      description: 'Unlock member-hosted games, our private community, and more for L300/month.',
      actionLabel: 'Become a Member',
    },
  }
}

const history = [
  { title: 'Codenames & good company', date: 'September 26', art: 'social' as const },
  { title: 'Learn & Play: Azul', date: 'September 22', art: 'azul' as const },
  { title: 'A Sunday in Cascadia', date: 'September 20', art: 'forest' as const },
]
const achievements = [
  ['people', 'A wider circle', 'Played with 10 different people'],
  ['home', 'A welcoming host', 'Hosted your first community table'],
  ['leaf', 'A helping hand', 'Shared a game with a new player'],
]
const benefits = [
  'Create and join member tables',
  'Be part of our private community',
  'Included official game nights, with a reservation',
  'Monthly championship participation',
]

const favorites = [
  { name: 'Wingspan', art: 'birds' as const },
  { name: 'Codenames', art: 'social' as const },
  { name: 'Azul', art: 'azul' as const },
]

const choices = [
  { key: 'reminders', title: 'Event reminders', text: 'A little nudge before your next game.' },
  { key: 'replies', title: 'Conversation replies', text: 'Know when someone responds to you.' },
  { key: 'digest', title: 'Weekly community letter', text: 'A quiet round-up of what’s happening.' },
  {
    key: 'history',
    title: 'Share my activity history',
    text: 'Visible only to other community members.',
  },
] as const

// Sample profile/metrics/preferences only. These exports never call the real
// profile/preferences functions above or imply persistence/audience enforcement.
export function readCommunityProfileContent(): CommunityProfileContent {
  return {
    sidebar: { stats: [{ value: '12', label: 'events' }, { value: '3', label: 'tables hosted' }, { value: '18', label: 'co-players' }] },
    favorites: favorites.map(game => ({ ...game })),
    insight: { icon: 'people', eyebrow: 'YOUR CIRCLE IS GROWING', heading: '18 different people. So many shared stories.',
      description: 'That’s how many community members you’ve played with. Here’s to the people you haven’t met yet.' },
    history: history.map(game => ({ ...game })),
    achievements: achievements.map(([icon, title, text]) => ({ icon, title, text })),
    benefits: [...benefits], preferenceChoices: choices.map(choice => ({ ...choice })),
    editor: { interests: [...interests], styles: ['Casual', 'Learner', 'Competitive (sometimes)'], nameMaxLength: 40, locationMaxLength: 60, bioMaxLength: 300 },
    supportMaxLength: 2000, historyDisclosure: '12 events attended · 3 tables hosted',
  }
}
export function readCommunityProfileDetails(profile: Profile): CommunityProfileDetails {
  const { name, location, bio, interests, style, teach } = profile
  return { name, location, bio, interests: [...interests], style, teach }
}
export function readCommunityProfilePreferences(preferences: CommunityProfilePreferences): CommunityProfilePreferences {
  const { reminders, replies, digest, history } = preferences
  return { reminders, replies, digest, history }
}
export function readCommunityProfileActivity(items: readonly Activity[], seats: Readonly<Record<string, SeatStatus>>, isMemberPreview: boolean): CommunityProfileActivity[] {
  return items.filter(item => (isMemberPreview || item.kind === 'official') && (seats[item.id] || item.host === 'You'))
    .map(item => ({ id: item.id, title: item.title, art: item.art, dateLabel: formatDate(item.date, true),
      statusLabel: item.host === 'You' ? 'Hosting' : seats[item.id] }))
}
export function saveMockCommunityProfile(draft: CommunityProfileDetails):
  | { ok: false } | { ok: true; profile: Profile; notice: string } {
  const name = draft.name.trim()
  if (!name) return { ok: false }
  return { ok: true, profile: { name, location: draft.location.trim(), bio: draft.bio.trim(),
    // Preserve native FormData's option order, rather than checkbox click order.
    interests: interests.filter(interest => draft.interests.includes(interest)), style: draft.style, teach: draft.teach },
    notice: 'Your profile has been updated.' }
}
export function changeMockCommunityPreference<Key extends keyof CommunityProfilePreferences>(key: Key, value: CommunityProfilePreferences[Key]) {
  return (previous: CommunityProfilePreferences): CommunityProfilePreferences => ({ ...previous, [key]: value })
}
export function saveMockCommunityPreferences() { return { isSaved: true } }
export function saveMockCommunitySupportNote(note: string) {
  const normalized = note.trim()
  return normalized ? { notice: `Demo support note saved: ${normalized}` } : null
}


export function readCommunityPreviewIdentity(): CommunityPreviewIdentity {
  return { ...previewCommunity }
}
export function readMembershipPreviewContent(): MembershipPreviewContent {
  return { benefits: [
    'Find and create member-hosted tables',
    'Meet people in our private community',
    'Reserve included official game nights',
    'Enter the monthly championship',
  ] }
}
export function switchMockCommunityPreview(isMemberPreview: boolean): boolean {
  return !isMemberPreview
}
