import { sql, type RawBuilder } from 'kysely'
import { communityGlobalSharingAudience, communityBlockProfileSourceAudience } from '../communities/policies.ts'
import type { BlockSource, CommunityFilter, Tx } from './types.ts'

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

// Global admission and projection share one statement snapshot. Discovery never
// inherits the exact-target self/shared-community alternatives.
function noBilateralProfileBlock(actor: string, target: RawBuilder<string>) {
  return sql<boolean>`not exists(select from public.user_account_blocks b where
    (b.blocker_user_id,b.blocked_user_id) in ((${actor}::uuid,${target}),(${target},${actor}::uuid)))`
}
function discoverableProfileTarget(target: RawBuilder<string>) {
  return sql<boolean>`exists(select from public.user_accounts u where u.user_id=${target} and u.user_is_discoverable)`
}
export function globalProfileDiscoveryAudience(actor: string, target: RawBuilder<string>) {
  return sql<boolean>`${discoverableProfileTarget(target)} and ${noBilateralProfileBlock(actor,target)}`
}
export function exactGlobalProfileAudience(actor: string, target: RawBuilder<string>, lockedTenants?: readonly string[]) {
  return sql<boolean>`(${target}=${actor}::uuid or (${noBilateralProfileBlock(actor,target)}
    and (${discoverableProfileTarget(target)} or ${communityGlobalSharingAudience(actor,target,lockedTenants)})))`
}
export function ownOutgoingBlocksAudience(actor: string) { return sql<boolean>`blocker_user_id=${actor}` }
export function blockProfileSourceAudience(actor: string, target: string, source: BlockSource, lockedTenants: readonly string[]) {
  const admitted = source.kind === 'community_profile'
    ? communityBlockProfileSourceAudience(actor,target,source.tenantId)
    : sql<boolean>`exists(select from public.user_account_profiles p where p.user_id=${target}
        and ${exactGlobalProfileAudience(actor,sql<string>`p.user_id`,lockedTenants)})`
  return admitted
}
export function loadOwnBlockFacts(tx: Tx, actor: string, target: string) {
  return tx.selectFrom('user_account_blocks').select('blocked_user_id')
    .where('blocker_user_id', '=', actor).where('blocked_user_id', '=', target).executeTakeFirst()
}
