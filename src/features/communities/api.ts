import { supabase } from '../../lib/supabase'

export type CommunityAccountPreferences = {
  show_global_profile: boolean
}

export async function saveCommunityAccountPreferences(tenantId: string, preferences: CommunityAccountPreferences) {
  if (!supabase) throw new Error('Community services are not configured.')
  // One update for the complete supported preference object. RLS scopes the
  // caller; explicit fields exclude identity, standing and unimplemented mocks.
  const result = await supabase.from('community_accounts').update({
    show_global_profile: preferences.show_global_profile,
  }).eq('tenant_id', tenantId).select('tenant_id').single()
  if (result.error) throw result.error
}

export async function saveCommunityProfile(tenantId: string, name: string, bio: string) {
  if (!supabase) throw new Error('Community services are not configured.')
  const result = await supabase.from('community_account_profiles').upsert({
    tenant_id: tenantId,
    display_name: name.trim(),
    bio: bio.trim() || null,
  }, { onConflict: 'tenant_id,user_id' }).select('tenant_id').single()
  if (result.error) throw result.error
}
