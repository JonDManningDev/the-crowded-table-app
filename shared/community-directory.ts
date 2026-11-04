import type { OwnProfile } from './self-service.ts'

export type AccountFacts = {
  tenant_id: string; user_id: string; standing: 'pending' | 'approved' | 'suspended' | 'inactive'
  first_approved_at: string | null; has_disciplinary_restriction: boolean
  created_at: string; updated_at: string; created_by: string | null; updated_by: string | null
}
export type CommunityProfile = OwnProfile & { tenant_id: string }
export type RoleBadge = 'owner' | 'admin' | null
export type MemberDirectoryRow = { account: AccountFacts; profile: CommunityProfile | null; staff_role: RoleBadge }
export type PublicDirectoryRow = { display_name: string; staff_role: RoleBadge }
export type DirectoryQuery = { limit?: string; cursor?: string }
export type DirectoryPage<T> = { rows: T[]; next: string | null }
