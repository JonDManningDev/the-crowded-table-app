import type { OwnProfile } from './self-service.ts'
export type GlobalProfile = OwnProfile
export type DiscoveryQuery = { q?: string; cursor?: string; limit?: string }
export type ProfilePage<T> = { rows: T[]; next: string | null }
export type OutgoingBlock = { blocker_user_id: string; blocked_user_id: string; created_at: string; created_by: string }
export type BlockSource = { kind: 'global_profile' } | { kind: 'community_profile'; tenantId: string }
export type BlockInput = { confirmed: true; source: BlockSource }
