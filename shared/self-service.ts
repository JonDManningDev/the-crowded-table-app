export type ProfileInput = { display_name: string; bio: string | null }
export type OwnProfile = ProfileInput & {
  user_id: string; created_at: string; updated_at: string; created_by: string | null; updated_by: string | null
}
export type OwnProfileResponse = { profile: OwnProfile | null }
export type CommunityPreferences = {
  show_global_profile: boolean; allow_direct_messages: boolean; allow_private_invitations: boolean
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
export const profileInputSchema = {
  type: 'object', required: ['display_name','bio'], additionalProperties: false,
  properties: { display_name: { type: 'string', minLength: 1, maxLength: 80 }, bio: { type: ['string','null'], maxLength: 2000 } },
} as const
export const communityPreferenceFields = ['show_global_profile','allow_direct_messages','allow_private_invitations'] as const
