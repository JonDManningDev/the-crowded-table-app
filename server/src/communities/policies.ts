import { sql } from 'kysely'
import { ApplicationError } from '../http-errors.ts'
import { staffFlags, type CommunityCommand, type ConfigurationKind, type RecordKind, type StaffPermissions, type Tx } from './types.ts'

// Creation and lifecycle. Services call these loaders in tenant-root, target
// account, target Auth order; facts never survive the operation/transaction.
export type Staff = StaffPermissions & { role: 'owner' | 'admin'; status: 'active' | 'paused' | 'revoked' }
export type Account = { standing: 'approved' | 'pending' | 'suspended' | 'inactive'; revision: string; approved: boolean; restricted: boolean }
export type Pending = { id: string; user_id: string; kind: 'join' | 'reactivation' }
type Decision = 'allowed' | 'missing' | 'forbidden' | 'stale'
type CommunityActionFacts = { site: { operational_status: string } | undefined; assignment: Staff | undefined }

function requireDecision(decision: Decision): void {
  if (decision === 'missing') throw new ApplicationError(404, 'missing')
  if (decision === 'forbidden') throw new ApplicationError(403, 'forbidden')
  if (decision === 'stale') throw new ApplicationError(409, 'stale_state')
}

export async function loadCreateCommunityFacts(tx: Tx, actor: string) {
  return { account: await tx.selectFrom('user_accounts').select('user_id').where('user_id', '=', actor).executeTakeFirst() }
}
export function canCreateCommunity(facts: Awaited<ReturnType<typeof loadCreateCommunityFacts>>): boolean {
  return facts.account !== undefined
}
export function requireCanCreateCommunity(facts: Awaited<ReturnType<typeof loadCreateCommunityFacts>>): void {
  // A verified identity without its atomically provisioned account is a storage
  // failure, matching the prior required-root/FK failure rather than a new rule.
  if (!canCreateCommunity(facts)) throw new ApplicationError(503, 'unavailable')
}

export async function loadStaffAssignmentFacts(tx: Tx, tenant: string, user: string) {
  return (await sql<Staff>`select role,status,${sql.join(staffFlags.map(key => sql.id(key)))}
    from public.tenant_staff_assignments where tenant_id=${tenant} and user_id=${user}`.execute(tx)).rows[0]
}
export async function loadCommunityActionFacts(tx: Tx, actor: string, tenant: string): Promise<CommunityActionFacts> {
  const site = (await sql<{ operational_status: string }>`select operational_status from public.tenants where id=${tenant} for update`.execute(tx)).rows[0]
  return { site, assignment: await loadStaffAssignmentFacts(tx, tenant, actor) }
}
export function canEnterCommunityAction(facts: CommunityActionFacts, command: CommunityCommand): Decision {
  if (!facts.site) return 'missing'
  const effective = facts.assignment?.status === 'active' ? facts.assignment : undefined
  if (command.kind === 'archive') return canArchiveCommunity(facts)
  if (facts.site.operational_status !== 'active') return 'missing'
  if (command.kind === 'approve' && !effective?.can_approve_users) return 'forbidden'
  if (['suspend', 'remove', 'clear'].includes(command.kind) && !effective?.can_discipline_users) return 'forbidden'
  if (['grant', 'resume', 'permissions'].includes(command.kind) && !effective?.can_grant_staff) return 'forbidden'
  if (command.kind === 'reappoint' && effective?.role !== 'owner') return 'forbidden'
  if (command.kind === 'revoke' && !effective?.can_discipline_staff) return 'forbidden'
  return 'allowed'
}
export function requireCanEnterCommunityAction(facts: CommunityActionFacts, command: CommunityCommand) {
  requireDecision(canEnterCommunityAction(facts, command))
}
export function canArchiveCommunity(facts: CommunityActionFacts): Decision {
  if (!facts.site) return 'missing'
  return facts.assignment?.status === 'active' && facts.assignment.role === 'owner' ? 'allowed' : 'forbidden'
}
export async function loadLifecycleAccountFacts(tx: Tx, tenant: string, user: string) {
  return (await sql<Account>`select standing,revision,first_approved_at is not null as approved,
    has_disciplinary_restriction as restricted from public.community_accounts
    where tenant_id=${tenant} and user_id=${user} for update`.execute(tx)).rows[0]
}
export async function loadCommunityRequestFacts(tx: Tx, tenant: string, request: string) {
  return (await sql<Pending>`select id,user_id,kind from app_private.community_account_requests
    where tenant_id=${tenant} and id=${request}`.execute(tx)).rows[0]
}
export function canSelectCommunityRequest(request: Pending | undefined, actor: string, kind: 'approve' | 'withdraw'): Decision {
  return !request || (kind === 'withdraw' && request.user_id !== actor) || (kind === 'approve' && request.kind !== 'join') ? 'stale' : 'allowed'
}
export function requireCanSelectCommunityRequest(request: Pending | undefined, actor: string, kind: 'approve' | 'withdraw'): asserts request is Pending {
  requireDecision(canSelectCommunityRequest(request, actor, kind))
}
export function canReturnToCommunity(account: Account | undefined, kind: 'join' | 'reactivate'): Decision {
  return kind === 'reactivate' && account?.standing !== 'inactive' ? 'stale' : 'allowed'
}
export function requireCanReturnToCommunity(account: Account | undefined, kind: 'join' | 'reactivate') {
  requireDecision(canReturnToCommunity(account, kind))
}
export async function loadJoinCommunityFacts(tx: Tx, tenant: string, actor: string, restricted: boolean) {
  if (restricted) {
    const request = (await sql<Pending>`select id,kind,user_id from app_private.community_account_requests
      where tenant_id=${tenant} and user_id=${actor}`.execute(tx)).rows[0]
    return { request, autoApprove: false }
  }
  const settings = await tx.selectFrom('tenant_settings').select('auto_approve_users').where('tenant_id', '=', tenant).executeTakeFirstOrThrow()
  return { request: undefined, autoApprove: settings.auto_approve_users }
}
type CommunityEntryDecision = { kind: 'review'; requestId: string | undefined }
  | { kind: 'establish'; standing: 'approved' | 'pending' }
export function decideCommunityEntry(account: Account | undefined, facts: Awaited<ReturnType<typeof loadJoinCommunityFacts>>): CommunityEntryDecision {
  if (account?.restricted) return { kind: 'review', requestId: facts.request?.id }
  return { kind: 'establish', standing: account?.approved || facts.autoApprove ? 'approved' : 'pending' }
}
export function canTargetCommunityAccount(account: Account | undefined, assignment: Staff | undefined, command: CommunityCommand): Decision {
  if (!account || ('revision' in command && command.revision !== account.revision)) return 'stale'
  return assignment?.role === 'owner' ? 'forbidden' : 'allowed'
}
export function requireCanTargetCommunityAccount(account: Account | undefined, assignment: Staff | undefined, command: CommunityCommand): asserts account is Account {
  requireDecision(canTargetCommunityAccount(account, assignment, command))
}
export function canApproveCommunityRequest(account: Account): Decision {
  return account.standing !== 'pending' || account.restricted || account.approved ? 'stale' : 'allowed'
}
export function requireCanApproveCommunityRequest(account: Account) { requireDecision(canApproveCommunityRequest(account)) }
type StandingChangeFacts = { account: Account; assignment: Staff | undefined; actorStaff: Staff | undefined }
export function canChangeCommunityStanding(facts: StandingChangeFacts, kind: 'deactivate' | 'suspend' | 'remove' | 'clear'): Decision {
  if ((kind === 'suspend' || kind === 'remove') && facts.assignment && facts.assignment.status !== 'revoked'
    && !(facts.actorStaff?.status === 'active' && facts.actorStaff.can_discipline_staff)) return 'forbidden'
  if (kind === 'suspend' && facts.account.standing !== 'approved' && facts.account.standing !== 'suspended') return 'stale'
  if (kind === 'clear' && !facts.account.restricted) return 'stale'
  return 'allowed'
}
export function requireCanChangeCommunityStanding(facts: StandingChangeFacts, kind: 'deactivate' | 'suspend' | 'remove' | 'clear') {
  requireDecision(canChangeCommunityStanding(facts, kind))
}
export async function loadStaffGrantFacts(tx: Tx, target: string, account: Account, assignment: Staff | undefined) {
  // Only protected Auth facts/locking remain privileged. Product facts and grant
  // authority are evaluated here in the API, never by the private primitive.
  if (account.standing !== 'approved' || assignment) return { authEligible: false }
  return (await sql<{ authEligible: boolean }>`select app_private.auth_identity_eligible(${target},true) as "authEligible"`.execute(tx)).rows[0]
}
type StaffChangeFacts = { account: Account; assignment: Staff | undefined; owner: boolean; actor: string; target: string; authEligible: boolean }
type StaffChange = Extract<CommunityCommand, { kind: 'grant' | 'resume' | 'revoke' | 'permissions' | 'reappoint' }>
export function canManageCommunityStaff(facts: StaffChangeFacts, command: StaffChange): Decision {
  const { account, assignment } = facts
  if (command.kind === 'grant') return account.standing === 'approved' && !assignment && facts.authEligible ? 'allowed' : 'stale'
  if (!assignment || (command.kind === 'reappoint' ? assignment.status !== 'revoked' || account.standing !== 'approved' : assignment.status === 'revoked')) return 'stale'
  if (command.kind === 'resume' && (facts.target === facts.actor || account.standing !== 'approved' || assignment.status !== 'paused')) return 'stale'
  if ((command.kind === 'permissions' || command.kind === 'reappoint') && !facts.owner
    && Object.keys(command.permissions).some(key => key !== 'can_audit_community_accounts' && key !== 'can_audit_staff_accounts')) return 'forbidden'
  return 'allowed'
}
export function requireCanManageCommunityStaff(facts: StaffChangeFacts, command: StaffChange) {
  requireDecision(canManageCommunityStaff(facts, command))
}

// Requests and reviews. Audiences are applied before ordering and pagination;
// queue visibility does not confer command authority or expose applicant Auth.
export function ownCommunityRequestAudience(actor: string) {
  return sql`c.user_id=${actor} and t.operational_status='active'`
}
export function communityAccountReviewAudience(actor: string) {
  return sql`t.operational_status='active' and (c.user_id=${actor} or exists(
    select from public.tenant_staff_assignments s where s.tenant_id=c.tenant_id
    and s.user_id=${actor} and s.status='active' and s.can_discipline_users))`
}
export function communityStaffCandidateAudience(actor: string) {
  return sql`c.standing='approved' and exists(select from public.tenant_staff_assignments a
    join public.tenants t on t.id=a.tenant_id where a.tenant_id=c.tenant_id and a.user_id=${actor}
    and a.status='active' and a.can_grant_staff and t.operational_status='active')
    and app_private.auth_identity_eligible(c.user_id,false)`
}
export function communityPendingRequestAudience(actor: string) {
  return sql`exists(select from public.tenant_staff_assignments s join public.tenants t on t.id=s.tenant_id
    where s.tenant_id=r.tenant_id and s.user_id=${actor} and s.status='active' and t.operational_status='active'
    and (s.can_approve_users or (s.can_discipline_users and r.kind='reactivation' and c.standing='inactive' and c.has_disciplinary_restriction)))`
}

// Configuration and copy. Services lock the tenant root before loading facts,
// so each statement sees the authority committed by any preceding lock holder.
async function loadCommunityStaffFacts(tx: Tx, actor: string, tenant: string) {
  const site = await tx.selectFrom('tenants').select('operational_status').where('id', '=', tenant).executeTakeFirst()
  const account = await tx.selectFrom('community_accounts').select('standing')
    .where('tenant_id', '=', tenant).where('user_id', '=', actor).executeTakeFirst()
  return { site, account, assignment: await loadStaffAssignmentFacts(tx, tenant, actor) }
}
export function loadConfigurationFacts(tx: Tx, actor: string, tenant: string) {
  return loadCommunityStaffFacts(tx, actor, tenant)
}
type ConfigurationFacts = Awaited<ReturnType<typeof loadConfigurationFacts>>
export function canReadConfiguration(facts: ConfigurationFacts): Decision {
  if (!facts.site) return 'missing'
  const owner = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' && facts.assignment.role === 'owner'
  return owner || (facts.site.operational_status === 'active'
    && (facts.account?.standing === 'approved' || facts.account?.standing === 'suspended')) ? 'allowed' : 'missing'
}
export function canEditConfiguration(facts: ConfigurationFacts, kind: ConfigurationKind): Decision {
  if (!facts.site) return 'missing'
  const staff = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' ? facts.assignment : undefined
  if (!staff || (facts.site.operational_status !== 'active' && staff.role !== 'owner')) return 'forbidden'
  return (kind === 'details' ? staff.role === 'owner' : kind === 'settings' ? staff.can_manage_settings : staff.can_modify_content)
    ? 'allowed' : 'forbidden'
}
export function requireCanReadConfiguration(facts: ConfigurationFacts) { requireDecision(canReadConfiguration(facts)) }
export function requireCanEditConfiguration(facts: ConfigurationFacts, kind: ConfigurationKind) { requireDecision(canEditConfiguration(facts, kind)) }

// Staff and participant records. The service holds the tenant root through the
// projection/mutation; reuse the established staff loader after any lock wait.
export function loadAccountRecordFacts(tx: Tx, actor: string, tenant: string) {
  return loadCommunityStaffFacts(tx, actor, tenant)
}
type AccountRecordFacts = Awaited<ReturnType<typeof loadAccountRecordFacts>>
export function canManageAccountRecords(facts: AccountRecordFacts, kind: RecordKind): Decision {
  if (!facts.site) return 'missing'
  const staff = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' ? facts.assignment : undefined
  if (!staff || (facts.site.operational_status !== 'active' && staff.role !== 'owner')) return 'forbidden'
  return (kind === 'staff' ? staff.can_grant_staff : staff.can_manage_community_permissions) ? 'allowed' : 'forbidden'
}
export function canReadAccountRecord(facts: AccountRecordFacts, kind: RecordKind, own: boolean): Decision {
  return canManageAccountRecords(facts, kind) === 'allowed' || (own && facts.site?.operational_status === 'active') ? 'allowed' : 'missing'
}
export function requireCanReadAccountRecord(facts: AccountRecordFacts, kind: RecordKind, own: boolean) {
  requireDecision(canReadAccountRecord(facts, kind, own))
}
export function requireCanManageAccountRecords(facts: AccountRecordFacts, kind: RecordKind) {
  requireDecision(canManageAccountRecords(facts, kind))
}
export function canListCommunityAccounts(facts: AccountRecordFacts): Decision {
  return facts.site && facts.account?.standing === 'approved'
    && facts.assignment?.role === 'owner' && facts.assignment.status === 'active' ? 'allowed' : 'missing'
}
export function requireCanListCommunityAccounts(facts: AccountRecordFacts) { requireDecision(canListCommunityAccounts(facts)) }
export function canReadCommunityAccountFacts(facts: AccountRecordFacts, own: boolean): Decision {
  return canListCommunityAccounts(facts) === 'allowed' || (facts.site?.operational_status === 'active'
    && (own || facts.account?.standing === 'approved' || facts.account?.standing === 'suspended')) ? 'allowed' : 'missing'
}
export function requireCanReadCommunityAccountFacts(facts: AccountRecordFacts, own: boolean) {
  requireDecision(canReadCommunityAccountFacts(facts, own))
}
export function communityAccountFactsTargetAudience(facts: AccountRecordFacts, own: boolean) {
  return sql`${canListCommunityAccounts(facts) === 'allowed' || own} or standing in ('approved','suspended','inactive')`
}

// Audit history. The service holds a tenant SHARE lock before these facts are
// loaded; category filtering must precede cursor/order/limit, including exact IDs.
export function loadHistoryFacts(tx: Tx, actor: string, tenant: string) {
  return loadCommunityStaffFacts(tx, actor, tenant)
}
type HistoryFacts = Awaited<ReturnType<typeof loadHistoryFacts>>
export function communityHistoryAudience(facts: HistoryFacts) {
  const staff = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' ? facts.assignment : undefined
  const owner = staff?.role === 'owner'
  return sql`${Boolean(owner)} or (${facts.site?.operational_status === 'active'} and exists(
    select from app_private.tenant_admin_action_categories c where c.action_id=a.id
    and ((c.category='community_account' and ${Boolean(staff?.can_audit_community_accounts)})
      or (c.category='staff_account' and ${Boolean(staff?.can_audit_staff_accounts)}))))`
}
