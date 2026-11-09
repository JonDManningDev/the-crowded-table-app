export type CommunityPreferences = {
  show_global_profile: boolean; allow_direct_messages: boolean; allow_private_invitations: boolean
}
export const communityPreferenceFields = ['show_global_profile','allow_direct_messages','allow_private_invitations'] as const
