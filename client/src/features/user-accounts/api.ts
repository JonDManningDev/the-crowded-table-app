import { accountPreferenceFields, preferencesPath } from '../../../../shared/account-preferences'
import { myCommunitiesPath, ownProfilePath, type CommunitySummaryPage, type OwnProfileResponse } from '../../../../shared/self-service'
import { currentApiUser, selfServiceRequest } from '../../lib/api-client'
import { previewCommunity } from '../../mock/data'
import { supabase } from '../../lib/supabase'
import type { CommunityFilter, CommunitySummary, CommunityCardData, AccountPreferences, AccountProfilePlaceholders, AccountProfileInsight, PremiumFeaturePlaceholder } from './types'

export type { AccountPreferences, CommunicationPreferences, DiscoveryPreferences } from './types'

// Sample-only profile details: no activity, preferences or favorites persistence.
export function readAccountProfilePlaceholders(): AccountProfilePlaceholders {
  return {
    location: 'Location coming soon',
    interests: ['Board Games', 'Cooperative', 'Strategy', 'Coffee', 'New Friends'],
    playStyle: 'Casual',
    isHappyToTeach: true,
    eventCount: 12,
    hostedTableCount: 3,
    coPlayerCount: 18,
    favoriteGames: [
      { name: 'Wingspan', art: 'birds' },
      { name: 'Codenames', art: 'social' },
      { name: 'Azul', art: 'azul' },
    ],
  }
}

// Profile insights are still sample data; no account activity query is connected.
export function readAccountProfileInsights(): AccountProfileInsight[] {
  return [{
    id: 'co-player-circle',
    iconName: 'people',
    eyebrow: 'YOUR CIRCLE IS GROWING',
    heading: '18 different people. So many shared stories.',
    description: 'That’s how many community members you’ve played with. Here’s to the people you haven’t met yet.',
  }]
}

// D-120 fixture only: no subscription lookup, billing, or entitlement behavior.
export function readPremiumFeaturePlaceholders(): PremiumFeaturePlaceholder[] {
  return [{
    id: 'community-ownership',
    name: 'Community ownership',
    detail: 'Sample subscription row · Billing is not connected',
  }]
}

export async function readOwnProfile(userId: string) {
  const result = await selfServiceRequest<OwnProfileResponse>(userId,ownProfilePath)
  if (result.profile !== null && (typeof result.profile?.display_name !== 'string' ||
    result.profile.bio !== null && typeof result.profile.bio !== 'string')) throw new Error('Invalid profile response.')
  return result.profile
}

export async function saveOwnProfile(userId: string, name: string, bio: string) {
  try {
    const result = await selfServiceRequest<OwnProfileResponse>(userId,ownProfilePath,'PUT',{
      display_name: name.trim(), bio: bio.trim() || null,
    })
    if (!result.profile || result.profile.user_id !== userId) throw new Error('Invalid profile response.')
  } catch { throw new Error('Your profile could not be saved. Please try again.') }
}

async function requestPreferences(expectedUserId: string, preferences?: AccountPreferences) {
  if (!supabase) throw new Error('Account services are not configured.')
  const { data, error } = await supabase.auth.getSession()
  // A session switch must not save the preceding viewer's draft as the new user.
  if (error || !data.session || data.session.user.id !== expectedUserId) throw new Error('Account session changed.')
  const response = await fetch(preferencesPath, {
    method: preferences ? 'PUT' : 'GET',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(preferences && { 'Content-Type': 'application/json' }),
    },
    body: preferences && JSON.stringify(preferences),
    cache: 'no-store',
    redirect: 'error',
  })
  if (!response.ok) throw new Error('Account preferences are unavailable.')
  return response
}

export async function readAccountPreferences(userId: string): Promise<AccountPreferences> {
  const response = await requestPreferences(userId)
  const data = await response.json()
  if (!accountPreferenceFields.every(key => typeof data?.[key] === 'boolean')) {
    throw new Error('Invalid account preferences response.')
  }
  return data
}

export async function saveAccountPreferences(userId: string, preferences: AccountPreferences) {
  await requestPreferences(userId, preferences)
}

export function toCommunityCards(rows: CommunitySummary[]): CommunityCardData[] {
  return [...new Map(rows.map(row => [row.id, row])).values()].map(row => ({
    id: row.id,
    name: row.name,
    place: [row.city, row.state_province, row.country_code].filter(Boolean).join(', '),
    status: row.operational_status === 'archived' ? 'Archived' : 'Active',
    participation: row.is_owned ? 'Owner' : row.is_managed ? 'Staff' : 'Member',
  }))
}

export async function readMyCommunities(filter: CommunityFilter): Promise<CommunitySummary[]> {
  try {
    const userId = (await currentApiUser()).user.id
    const rows: CommunitySummary[] = [], seen = new Set<string>()
    let cursor: string | null = null
    do {
      const query = new URLSearchParams({ filter, limit: '100', ...(cursor ? { cursor } : {}) })
      const page: CommunitySummaryPage = await selfServiceRequest(userId,myCommunitiesPath + '?' + query)
      if (!Array.isArray(page.rows) || page.next !== null && typeof page.next !== 'string'
        || page.next !== null && seen.has(page.next)) throw new Error('Invalid summary response.')
      rows.push(...page.rows)
      cursor = page.next
      if (cursor) seen.add(cursor)
    } while (cursor)
    return rows
  } catch { throw new Error('We couldn’t load your communities. Please try again.') }
}

// Account-list fixture only; real summaries never fall back to this record.
export function readAccountSampleCommunity(): CommunityCardData {
  return { id: 'sample', name: previewCommunity.name, place: previewCommunity.location,
    status: 'Active', participation: 'Member', sample: true }
}
