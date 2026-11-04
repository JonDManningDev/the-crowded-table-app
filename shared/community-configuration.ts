export const settingFields = ['auto_approve_users','pause_community_events','allow_public_chat_visibility',
  'allow_public_activity_visibility','allow_public_directory_visibility'] as const
export type CommunitySettings = Record<typeof settingFields[number],boolean>
export const copySlots = {
  'community.hero.eyebrow': 120, 'community.hero.heading': 200, 'community.hero.description': 500,
  'community.welcome.eyebrow': 120, 'community.welcome.heading': 200, 'community.welcome.body': 2000,
  'community.welcome.emphasis': 500,
} as const
export type CopyKey = keyof typeof copySlots
export type CommunityDetailsInput = {
  name: string; country_code: string; state_province: string | null; city: string | null; timezone: string
}
export type Attribution = { created_at: string; updated_at: string; created_by: string | null; updated_by: string | null }
export type CommunityDetails = CommunityDetailsInput & Attribution & { id: string; slug: string; operational_status: 'active' | 'archived' }
export type CommunitySettingsRecord = CommunitySettings & Attribution & { tenant_id: string }
export type PublicCopy = { tenant_id: string; content_key: CopyKey; text_value: string }
export type CommunityCopy = PublicCopy & Attribution
export type CommunityLanding = CommunityDetailsInput & { id: string; slug: string; auto_approve_users: boolean;
  allow_public_chat_visibility: boolean; allow_public_activity_visibility: boolean; allow_public_directory_visibility: boolean; overrides: PublicCopy[] }
