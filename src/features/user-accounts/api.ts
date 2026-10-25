import { supabase } from '../../lib/supabase'
import type { AccountPreferences, AccountProfilePlaceholders, AccountProfileInsight, PremiumFeaturePlaceholder } from './types'

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
  if (!supabase) throw new Error('Account services are not configured.')
  const result = await supabase
    .from('user_account_profiles')
    .select('display_name,bio')
    .eq('user_id', userId)
    .maybeSingle()
  if (result.error) throw result.error
  return result.data
}

export async function saveOwnProfile(name: string, bio: string) {
  if (!supabase) throw new Error('Account services are not configured.')
  // user_id defaults to the authenticated caller in Postgres; RLS verifies it.
  const result = await supabase.from('user_account_profiles').upsert({
    display_name: name.trim(),
    bio: bio.trim() || null,
  }, { onConflict: 'user_id' }).select('user_id').single()
  if (result.error) throw new Error('Your profile could not be saved. Please try again.')
}

export async function readAccountPreferences(userId: string): Promise<AccountPreferences> {
  if (!supabase) throw new Error('Account services are not configured.')
  const result = await supabase
    .from('user_accounts')
    .select('user_is_discoverable,enable_matchmaking,allow_direct_messages')
    .eq('user_id', userId)
    .single()
  if (result.error) throw result.error
  return result.data
}

export async function saveAccountPreferences(userId: string, preferences: AccountPreferences) {
  if (!supabase) throw new Error('Account services are not configured.')
  // RLS verifies the selected account belongs to the caller; single() rejects
  // missing/denied rows instead of reporting an empty UPDATE as a successful save.
  const result = await supabase.from('user_accounts').update({
    user_is_discoverable: preferences.user_is_discoverable,
    enable_matchmaking: preferences.enable_matchmaking,
    allow_direct_messages: preferences.allow_direct_messages,
  }).eq('user_id', userId).select('user_id').single()
  if (result.error) throw result.error
}
