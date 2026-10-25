import { supabase } from '../../lib/supabase'

export type DiscoveryPreferences = {
  user_is_discoverable: boolean
  enable_matchmaking: boolean
}

export type CommunicationPreferences = {
  allow_direct_messages: boolean
}

export type AccountPreferences = DiscoveryPreferences & CommunicationPreferences

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
