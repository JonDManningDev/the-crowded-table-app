export type ProfileInput = { display_name: string; bio: string | null }
export type OwnProfile = ProfileInput & {
  user_id: string; created_at: string; updated_at: string; created_by: string | null; updated_by: string | null
}
export type CommunityFilter = 'all' | 'managed' | 'owned'
export type CommunitySummary = {
  id: string; name: string; city: string | null; state_province: string | null; country_code: string
  operational_status: 'active' | 'archived'; created_at: string
  is_owned: boolean; is_managed: boolean; is_member: boolean
}
export type CommunitySummaryQuery = { filter?: CommunityFilter; cursor?: string; limit?: string }
export type CommunitySummaryPage = { rows: CommunitySummary[]; next: string | null }
export const ownProfilePath = '/api/me/profile'
export const myCommunitiesPath = '/api/me/communities'
