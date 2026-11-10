import type { Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from '../database.ts'
import type { DirectoryCursors } from '../directory-cursors.ts'
import type { createCommunityService } from './service.ts'

// Public access and standing
export type SlugParams = { slug: string }
export type InternalRow = PublicDirectoryRow & { user_id: string }
export type PublicDirectoryResult = { rows: InternalRow[] | null }

// Creation and lifecycle
export const staffFlags = [
  'can_approve_users',
  'can_grant_staff',
  'can_modify_content',
  'can_discipline_users',
  'can_discipline_staff',
  'can_manage_community_activities',
  'can_manage_official_activities',
  'can_manage_community_permissions',
  'can_see_private_events',
  'can_manage_settings',
  'can_moderate_all_chats',
  'can_audit_community_accounts',
  'can_audit_staff_accounts',
] as const
export type StaffFlag = typeof staffFlags[number]
export type StaffPermissions = Record<StaffFlag, boolean>
export type CuratedProfile = { displayName: string; bio: string | null }
export type CreateCommunityInput = {
  name: string; slug: string; country: string; timezone: string; region: string; city: string; profile: CuratedProfile
}
type DisciplineInput = { target: string; revision: string; reason?: string }
export type CommunityCommand =
  | { kind: 'join'; profile: CuratedProfile }
  | { kind: 'deactivate' }
  | { kind: 'reactivate' }
  | { kind: 'withdraw'; requestId: string }
  | { kind: 'approve'; requestId: string; revision: string }
  | ({ kind: 'suspend' } & DisciplineInput)
  | ({ kind: 'remove' } & DisciplineInput)
  | ({ kind: 'clear' } & DisciplineInput)
  | { kind: 'grant' | 'resume'; target: string }
  | { kind: 'revoke'; target: string; reason?: string }
  | { kind: 'reappoint'; target: string; permissions: StaffPermissions }
  | { kind: 'permissions'; target: string; permissions: Partial<StaffPermissions> }
  | { kind: 'archive'; archived: boolean }
export type CommandResult = { outcome: string; tenantId: string; revision?: string; requestId?: string }
export type Staff = StaffPermissions & { role: 'owner' | 'admin'; status: 'active' | 'paused' | 'revoked' }
export type Account = { standing: 'approved' | 'pending' | 'suspended' | 'inactive'; revision: string; approved: boolean; restricted: boolean }
export type Pending = { id: string; user_id: string; kind: 'join' | 'reactivation' }
export type Context = { tx: Tx; tenant: string; actor: string }
export type Action<K extends CommunityCommand['kind']> = CommunityCommand & { kind: K }
export type ApprovalSettings = { auto_approve_users: boolean }
export type AuthorizationResult = { allowed: boolean }
export type OperationalStatus = { operational_status: string }

// Requests and reviews
export type OwnCommunityRequest = { request_id: string; kind: 'join' | 'reactivation'; requested_at: string }
export type OwnCommunityRequestResponse = { request: OwnCommunityRequest | null }
export type AccountReview = { standing: 'pending' | 'approved' | 'suspended' | 'inactive'; revision: string; request_id: string | null }
export type StaffCandidate = { tenant_id: string; user_id: string; standing: 'approved'; display_name: string | null;
  staff_role: 'owner' | 'admin' | null; staff_status: 'active' | 'paused' | 'revoked' | null }
export type CommunityRequest = { id: string; kind: 'join' | 'reactivation'; user_id: string; requested_at: string;
  revision: string; standing: AccountReview['standing']; first_approved_at: string | null;
  has_disciplinary_restriction: boolean; display_name: string | null }
export type CommunityReadPage<T> = { rows: T[]; next: string | null }
export type ReviewParams = { tenantId: string; target: string }
export type AfterQuery = { after?: string }
export type MissingRequest = { status: 404 }

// Profiles and preferences
export type CommunityProfileInput = { display_name: string; bio: string | null }
export type CommunityProfile = CommunityProfileInput & {
  tenant_id: string; user_id: string; created_at: string; updated_at: string
  created_by: string | null; updated_by: string | null
}

export type CommunityPreferences = {
  show_global_profile: boolean; allow_direct_messages: boolean; allow_private_invitations: boolean
}
export const communityPreferenceFields = ['show_global_profile','allow_direct_messages','allow_private_invitations'] as const
export type AccountParams = { tenantId: string; userId: string }
export type AccountStanding = { standing: string }

// Configuration and copy
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
export type ConfigurationKind = 'details' | 'settings' | 'copy'
export type CopyParams = { tenantId: string; contentKey: CopyKey }
export type CopyInput = { text_value: string }
export type CopyChange = { key: CopyKey; text?: string }

// Directories and account facts
export type AccountFacts = {
  tenant_id: string; user_id: string; standing: 'pending' | 'approved' | 'suspended' | 'inactive'
  first_approved_at: string | null; has_disciplinary_restriction: boolean
  created_at: string; updated_at: string; created_by: string | null; updated_by: string | null
}
export type RoleBadge = 'owner' | 'admin' | null
export type MemberDirectoryRow = { account: AccountFacts; profile: CommunityProfile | null; staff_role: RoleBadge }
export type PublicDirectoryRow = { display_name: string; staff_role: RoleBadge }
export type DirectoryQuery = { limit?: string; cursor?: string }
export type DirectoryPage<T> = { rows: T[]; next: string | null }
export type DirectoryAccess = { active: boolean; owner: boolean; member: boolean }

// Staff and participant permissions
type Identity = { tenant_id: string; user_id: string }
export type StaffRecord = Identity & Attribution & StaffPermissions & {
  role: 'owner' | 'admin'; status: 'active' | 'paused' | 'revoked'
}
export type ParticipantPermissions = Identity & Attribution & { can_post_public_events: boolean }
export type RecordQuery = { cursor?: string; limit?: string }
export type RecordPage<T> = { rows: T[]; next: string | null }
export type RecordKind = 'staff' | 'participant'
export type Records = { staff: StaffRecord; participant: ParticipantPermissions }
export type ParticipantPermissionInput = { can_post_public_events: boolean }

// Audit history
export type HistoryCategory = 'community_account' | 'staff_account'
export type HistoryQuery = {
  target?: string
  category?: HistoryCategory
  eventId?: string
  cursor?: string
  limit?: string
}
export type HistoryEntry = {
  id: string
  tenant_id: string
  action: string
  target_user_id: string | null
  content_key: string | null
  created_at: string
  created_by: string | null
  operation_id: string
  reason: string | null
  details: Record<string, unknown>
  categories: HistoryCategory[]
}
export type HistoryPage = { rows: HistoryEntry[]; next: string | null }
export type Position = { time: string; id: string }
export type AuditAuthority = { role: string; can_audit_community_accounts: boolean; can_audit_staff_accounts: boolean }

// Internal helpers
export type Tx = Transaction<ApiTables>
export type TenantParams = { tenantId: string }
export interface CommunityDependencies { db: AppDatabase; cursors: DirectoryCursors }
export type CommunityService = ReturnType<typeof createCommunityService>
export type PublicCommunityOperations = Pick<CommunityService, "listStandings" | "readLanding" | "publicDirectory">
export type ProtectedCommunityOperations = Pick<CommunityService,
  "createCommunity"
  | "executeCommand"
  | "ownRequest"
  | "reviewAccount"
  | "staffCandidates"
  | "pendingRequests"
  | "readProfile"
  | "saveOwnProfile"
  | "readOwnPreferences"
  | "saveOwnPreferences"
  | "readDetails"
  | "saveDetails"
  | "readSettings"
  | "saveSettings"
  | "readCopy"
  | "saveCopy"
  | "deleteCopy"
  | "memberDirectory"
  | "ownerAccounts"
  | "accountFacts"
  | "listStaff"
  | "readStaff"
  | "listParticipantPermissions"
  | "readParticipantPermissions"
  | "saveParticipantPermissions"
  | "history">
