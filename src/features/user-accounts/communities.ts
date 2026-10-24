import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

export type CommunityFilter = 'all' | 'managed' | 'owned'
export type CommunitySummary = Database['public']['Views']['my_community_summaries']['Row']
export type CommunityCardData = {
  id: string
  name: string
  place: string
  status: 'Active' | 'Archived'
  participation: 'Owner' | 'Staff' | 'Member'
  sample?: boolean
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
  if (!supabase) throw new Error('Community services are not configured.')
  const rows: CommunitySummary[] = []
  // Respect the API row cap without silently dropping communities beyond page one.
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from('my_community_summaries')
      .select('id,name,city,state_province,country_code,operational_status,created_at,is_owned,is_managed,is_member')
    if (filter === 'all') query = query.or('is_owned.eq.true,is_member.eq.true')
    else query = query.eq(filter === 'managed' ? 'is_managed' : 'is_owned', true)
    const { data, error } = await query.order('created_at', { ascending: false })
      .order('id', { ascending: true }).range(offset, offset + 999)
    if (error) throw new Error('We couldn’t load your communities. Please try again.')
    rows.push(...(data || []))
    if (!data || data.length < 1000) return rows
  }
}
