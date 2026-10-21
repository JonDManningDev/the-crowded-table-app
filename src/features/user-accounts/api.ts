import { supabase } from '../../lib/supabase'

export type DiscoveryPreferences = {
  user_is_discoverable: boolean
  enable_matchmaking: boolean
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
  const result = await supabase.rpc('save_user_account_profile', {
    p_display_name: name.trim(),
    p_bio: bio.trim() || undefined,
  })
  if (result.error) throw new Error('Your profile could not be saved. Please try again.')
}

export async function readDiscoveryPreferences(userId: string) {
  if (!supabase) throw new Error('Account services are not configured.')
  const result = await supabase
    .from('user_accounts')
    .select('user_is_discoverable,enable_matchmaking')
    .eq('user_id', userId)
    .single()
  if (result.error) throw result.error
  return result.data
}

export async function saveDiscoveryPreferences(preferences: DiscoveryPreferences) {
  if (!supabase) throw new Error('Account services are not configured.')
  const result = await supabase.rpc('set_user_account_preferences', {
    p_user_is_discoverable: preferences.user_is_discoverable,
    p_enable_matchmaking: preferences.enable_matchmaking,
  })
  if (result.error) throw result.error
}
