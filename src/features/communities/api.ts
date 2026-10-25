import type { CommunityHomeContent } from './types'
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
