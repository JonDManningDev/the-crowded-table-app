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
