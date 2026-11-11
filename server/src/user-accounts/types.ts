import type { Transaction } from 'kysely'
import type { AppDatabase } from '../database.ts'
import type { DB } from '../database.types.ts'
import type { DirectoryCursors } from '../directory-cursors.ts'
import type { createUserAccountService } from './service.ts'

// Account preferences
export const accountPreferenceFields = ['user_is_discoverable', 'enable_matchmaking', 'allow_direct_messages'] as const
export type AccountPreferences = Record<(typeof accountPreferenceFields)[number], boolean>

// Own profile
export type ProfileInput = { display_name: string; bio: string | null }
export type OwnProfile = ProfileInput & {
  user_id: string; created_at: Date; updated_at: Date; created_by: string | null; updated_by: string | null
}

// My communities
export type CommunityFilter = 'all' | 'managed' | 'owned'
export type CommunitySummary = {
  id: string; name: string; city: string | null; state_province: string | null; country_code: string
  operational_status: 'active' | 'archived'; created_at: string
  is_owned: boolean; is_managed: boolean; is_member: boolean
}
export type CommunitySummaryQuery = { filter?: CommunityFilter; cursor?: string; limit?: string }
export type CommunitySummaryPage = { rows: CommunitySummary[]; next: string | null }
export type Position = { time: string; id: string }

// Global profiles
export type GlobalProfile = OwnProfile
export type DiscoveryQuery = { q?: string; cursor?: string; limit?: string }
export type ProfilePage<T> = { rows: T[]; next: string | null }

// Account blocks
export type OutgoingBlock = { blocker_user_id: string; blocked_user_id: string; created_at: Date; created_by: string }
export type BlockSource = { kind: 'global_profile' } | { kind: 'community_profile'; tenantId: string }
export type BlockInput = { confirmed: true; source: BlockSource }

// Internal helpers
export type Tx = Transaction<DB>
export interface UserAccountDependencies { db: AppDatabase; cursors: DirectoryCursors }
export type UserAccountService = ReturnType<typeof createUserAccountService>
export interface UserAccountRoutesOptions { service: UserAccountService }
