import type { StaffPermissions } from './community-commands.ts'

type Attribution = { created_at: string; updated_at: string; created_by: string | null; updated_by: string | null }
type Identity = { tenant_id: string; user_id: string }
export type StaffRecord = Identity & Attribution & StaffPermissions & {
  role: 'owner' | 'admin'; status: 'active' | 'paused' | 'revoked'
}
export type ParticipantPermissions = Identity & Attribution & { can_post_public_events: boolean }
export type RecordQuery = { cursor?: string; limit?: string }
export type RecordPage<T> = { rows: T[]; next: string | null }
