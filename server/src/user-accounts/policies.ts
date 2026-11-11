import { sql } from 'kysely'
import type { CommunityFilter } from './types.ts'

// Identity is verified and eligibility locked by the authenticated transaction.
// Self-service queries retain explicit row audiences independently of SQL grants.
export function ownAccountPreferencesAudience(actor: string) { return sql<boolean>`user_id=${actor}` }
export function ownGlobalProfileAudience(actor: string) { return sql<boolean>`user_account_profiles.user_id=${actor}` }

// Relationship facts come from the community-owned caller-only adapter. Personal
// collection filtering belongs here and runs before ordering/cursors/pagination.
export function myCommunitySummaryAudience(filter: CommunityFilter) {
  return filter === 'owned' ? sql<boolean>`r.is_owned` : filter === 'managed' ? sql<boolean>`r.is_managed`
    : sql<boolean>`(r.is_owned or r.is_member)`
}
