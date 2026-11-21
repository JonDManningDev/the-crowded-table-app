import { sql } from 'kysely'
import { ApplicationError } from '../../http-errors.ts'
import { staffFlags, type ConfigurationKind, type StaffFlag, type StaffPermissions, type Tx } from './types.ts'

/*
 * Types
 */

export type Account = { standing: 'approved' | 'pending' | 'suspended' | 'inactive'; revision: string; approved: boolean; restricted: boolean }

type AccountRecordFacts = Awaited<ReturnType<typeof loadAccountRecordFacts>>

type CommunitySite = { operational_status: string }

type ConfigurationFacts = Awaited<ReturnType<typeof loadConfigurationFacts>>

type Decision = 'allowed' | 'missing' | 'forbidden' | 'stale'


export type Pending = { id: string; user_id: string; kind: 'join' | 'reactivation' }

export type Staff = StaffPermissions & { role: 'owner' | 'admin'; status: 'active' | 'paused' | 'revoked' }

/*
 * Fact Loaders
 */

// Account records and participant permission writes load fresh facts once the
// service holds the tenant root.
export function loadAccountRecordFacts(tx: Tx, actor: string, tenant: string) {
  return loadCommunityStaffFacts(tx, actor, tenant)
}

// Creation and lifecycle. Services call these loaders in tenant-root, target
// account, target Auth order; facts never survive the operation/transaction.
export async function lockCommunityLifecycleRoot(tx: Tx, tenant: string): Promise<CommunitySite | undefined> {
  return (await sql<CommunitySite>`select operational_status from public.tenants where id=${tenant} for no key update`.execute(tx)).rows[0]
}

export async function loadCommunityWithdrawalFacts(tx: Tx, tenant: string, actor: string, requestId: string) {
  return (await sql<CommunitySite & { user_id: string | null; standing: Account['standing'] | null }>`
    select t.operational_status,r.user_id,account.standing
    from public.tenants t
    left join app_private.community_account_requests r
      on r.tenant_id=t.id and r.user_id=${actor} and r.id=${requestId}
    left join lateral (
      select c.standing from public.community_accounts c
      where c.tenant_id=t.id and c.user_id=r.user_id and t.operational_status='active'
      for update of c
    ) account on true
    where t.id=${tenant}`.execute(tx)).rows[0]
}

export async function loadCommunityRequestFacts(tx: Tx, tenant: string, request: string) {
  return (await sql<Pending>`select id,user_id,kind from app_private.community_account_requests
    where tenant_id=${tenant} and id=${request}`.execute(tx)).rows[0]
}

async function loadCommunityStaffFacts(tx: Tx, actor: string, tenant: string) {
  // Services complete the tenant root lock before this statement starts, so
  // all joined facts see authority committed by a preceding lock holder.
  const row = await tx.selectFrom('tenants as t')
    .leftJoin('community_accounts as c', join => join.onRef('c.tenant_id', '=', 't.id').on('c.user_id', '=', actor))
    .leftJoin('tenant_staff_assignments as s', join => join.onRef('s.tenant_id', '=', 't.id').on('s.user_id', '=', actor))
    .select(['t.operational_status', 'c.user_id as accountId', 'c.standing', 's.role', 's.status'])
    .select(staffFlags.map(key => `s.${key}` as const))
    .where('t.id', '=', tenant).executeTakeFirst()
  if (!row) return { site: undefined, account: undefined, assignment: undefined }
  // Only LEFT JOIN absence introduces nulls into these NOT NULL columns.
  // A non-null role preserves assignments whose permission flags are all false.
  // The role/status unions reflect storage CHECKs rather than generated enums.
  const assignment: Staff | undefined = row.role === null ? undefined : {
    role: row.role as Staff['role'], status: row.status as Staff['status'],
    ...Object.fromEntries(staffFlags.map(key => [key, row[key]!])) as StaffPermissions,
  }
  return { site: { operational_status: row.operational_status },
    account: row.accountId === null ? undefined : { standing: row.standing! }, assignment }
}

// Configuration and copy. Services lock the tenant root before loading facts,
// so the facts statement sees authority committed by any preceding lock holder.
export function loadConfigurationFacts(tx: Tx, actor: string, tenant: string) {
  return loadCommunityStaffFacts(tx, actor, tenant)
}

export async function loadCreateCommunityFacts(tx: Tx, actor: string) {
  return { account: await tx.selectFrom('user_accounts').select('user_id').where('user_id', '=', actor).executeTakeFirst() }
}

export async function loadCommunityAutoApproval(tx: Tx, tenant: string) {
  const settings = await tx.selectFrom('tenant_settings').select('auto_approve_users').where('tenant_id', '=', tenant).executeTakeFirstOrThrow()
  return settings.auto_approve_users
}

export async function loadPendingCommunityReturn(tx: Tx, tenant: string, actor: string) {
  return (await sql<Pick<Pending, 'id'>>`select id from app_private.community_account_requests
    where tenant_id=${tenant} and user_id=${actor}`.execute(tx)).rows[0]
}

export async function loadLifecycleAccountFacts(tx: Tx, tenant: string, user: string) {
  return (await sql<Account>`select standing,revision,first_approved_at is not null as approved,
    has_disciplinary_restriction as restricted from public.community_accounts
    where tenant_id=${tenant} and user_id=${user} for update`.execute(tx)).rows[0]
}

export async function loadStaffAssignmentFacts(tx: Tx, tenant: string, user: string) {
  return (await sql<Staff>`select role,status,${sql.join(staffFlags.map(key => sql.id(key)))}
    from public.tenant_staff_assignments where tenant_id=${tenant} and user_id=${user}`.execute(tx)).rows[0]
}

export async function lockStaffGrantAuthEligibility(tx: Tx, target: string) {
  const { rows } = await sql<{ authEligible: boolean }>`select app_private.auth_identity_eligible(${target},true) as "authEligible"`.execute(tx)
  return rows[0].authEligible
}

// History joins these facts into the statement that reads the audit rows.
export function selectHistoryViewerFacts(tx: Tx, actor: string) {
  return tx.selectFrom('tenants as t')
    .innerJoin('community_accounts as c', join => join.onRef('c.tenant_id', '=', 't.id').on('c.user_id', '=', actor))
    .innerJoin('tenant_staff_assignments as s', join => join.onRef('s.tenant_id', '=', 't.id').on('s.user_id', '=', actor))
    .select(['t.id as tenant_id', 't.operational_status', 'c.standing', 's.role', 's.status',
      's.can_audit_community_accounts', 's.can_audit_staff_accounts'])
}

/*
 * Helpers
 */

function requireDecision(decision: Decision): void {
  if (decision === 'missing') throw new ApplicationError(404, 'missing')
  if (decision === 'forbidden') throw new ApplicationError(403, 'forbidden')
  if (decision === 'stale') throw new ApplicationError(409, 'stale_state')
}

/*
 * Requirements and Decisions
 */

export function requireCanApproveCommunityRequest(account: Account) { requireDecision(canApproveCommunityRequest(account)) }

export function canApproveCommunityRequest(account: Account): Decision {
  return account.standing !== 'pending' || account.restricted || account.approved ? 'stale' : 'allowed'
}

export function requireActiveCommunity(site: CommunitySite | undefined) {
  requireDecision(site?.operational_status === 'active' ? 'allowed' : 'missing')
}

export function requireActiveStaffPermission(assignment: Staff | undefined, permission: StaffFlag): asserts assignment is Staff {
  requireDecision(assignment?.status === 'active' && assignment[permission] ? 'allowed' : 'forbidden')
}

export function requireCommunityLifecycleRoot(site: CommunitySite | undefined): asserts site is CommunitySite {
  requireDecision(site ? 'allowed' : 'missing')
}

export function requireCommunityOwner(assignment: Staff | undefined) {
  requireDecision(assignment?.status === 'active' && assignment.role === 'owner' ? 'allowed' : 'forbidden')
}

export function requireCanDisciplineStaffAccount(actor: Staff, target: Staff | undefined) {
  if (target && target.status !== 'revoked') requireActiveStaffPermission(actor, 'can_discipline_staff')
}

export function requireSuspendableCommunityAccount(standing: Account['standing']) {
  requireDecision(standing === 'approved' || standing === 'suspended' ? 'allowed' : 'stale')
}

export function requireRestrictedCommunityAccount(restricted: boolean) {
  requireDecision(restricted ? 'allowed' : 'stale')
}

export function requireCanCreateCommunity(facts: Awaited<ReturnType<typeof loadCreateCommunityFacts>>): void {
  // A verified identity without its atomically provisioned account is a storage
  // failure, matching the prior required-root/FK failure rather than a new rule.
  if (!canCreateCommunity(facts)) throw new ApplicationError(503, 'unavailable')
}

export function canCreateCommunity(facts: Awaited<ReturnType<typeof loadCreateCommunityFacts>>): boolean {
  return facts.account !== undefined
}

export function requireCanEditConfiguration(facts: ConfigurationFacts, kind: ConfigurationKind) { requireDecision(canEditConfiguration(facts, kind)) }

export function canEditConfiguration(facts: ConfigurationFacts, kind: ConfigurationKind): Decision {
  if (!facts.site) return 'missing'
  const staff = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' ? facts.assignment : undefined
  if (!staff || (facts.site.operational_status !== 'active' && staff.role !== 'owner')) return 'forbidden'
  return (kind === 'details' ? staff.role === 'owner' : kind === 'settings' ? staff.can_manage_settings : staff.can_modify_content)
    ? 'allowed' : 'forbidden'
}

export function requireNewStaffAssignment(standing: Account['standing'], assignment: Staff | undefined) {
  requireDecision(standing === 'approved' && !assignment ? 'allowed' : 'stale')
}

export function requireEligibleStaffGrantTarget(eligible: boolean) {
  requireDecision(eligible ? 'allowed' : 'stale')
}

export function requireResumableStaffAssignment(
  standing: Account['standing'], assignment: Staff | undefined, isSelf: boolean,
): asserts assignment is Staff {
  requireDecision(!isSelf && standing === 'approved' && assignment?.status === 'paused' ? 'allowed' : 'stale')
}

export function requireReappointableStaffAssignment(
  standing: Account['standing'], assignment: Staff | undefined,
): asserts assignment is Staff {
  requireDecision(standing === 'approved' && assignment?.status === 'revoked' ? 'allowed' : 'stale')
}

export function requireActiveOrPausedStaffAssignment(assignment: Staff | undefined): asserts assignment is Staff {
  requireDecision(assignment?.status === 'active' || assignment?.status === 'paused' ? 'allowed' : 'stale')
}

export function requireEditableStaffPermissions(role: Staff['role'], permissions: Partial<StaffPermissions>) {
  const auditOnly = Object.keys(permissions).every(key => key === 'can_audit_community_accounts' || key === 'can_audit_staff_accounts')
  requireDecision(role === 'owner' || auditOnly ? 'allowed' : 'forbidden')
}

export function requireCanManageParticipantPermissions(facts: AccountRecordFacts) {
  requireDecision(canManageParticipantPermissions(facts))
}

export function canManageParticipantPermissions(facts: AccountRecordFacts): Decision {
  if (!facts.site) return 'missing'
  const staff = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' ? facts.assignment : undefined
  if (!staff || (facts.site.operational_status !== 'active' && staff.role !== 'owner')) return 'forbidden'
  return staff.can_manage_community_permissions ? 'allowed' : 'forbidden'
}

export function requireInactiveCommunityAccount(account: Account | undefined): asserts account is Account {
  requireDecision(account?.standing === 'inactive' ? 'allowed' : 'stale')
}

export function requireWithdrawableCommunityAccount(standing: Account['standing'] | null | undefined) {
  requireDecision(standing === 'pending' || standing === 'inactive' ? 'allowed' : 'stale')
}

export function requireOwnActivationRequest(requestOwner: string | null | undefined, actor: string) {
  requireDecision(requestOwner === actor ? 'allowed' : 'stale')
}

export function requireCommunityJoinRequest(request: Pending | undefined): asserts request is Pending {
  requireDecision(request?.kind === 'join' ? 'allowed' : 'stale')
}

export function requireNonOwnerCommunityAccount(
  account: Account | undefined, assignment: Staff | undefined, revision?: string,
): asserts account is Account {
  if (!account || (revision !== undefined && revision !== account.revision)) requireDecision('stale')
  requireDecision(assignment?.role === 'owner' ? 'forbidden' : 'allowed')
}

export function decideCommunityEntryStanding(previouslyApproved: boolean, autoApprove: boolean) {
  return previouslyApproved || autoApprove ? 'approved' : 'pending'
}
