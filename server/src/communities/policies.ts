import { sql, type RawBuilder } from 'kysely'
import { ApplicationError } from '../http-errors.ts'
import { staffFlags, type CommunityCommand, type ConfigurationKind, type RecordKind, type StaffPermissions, type Tx } from './types.ts'

/*
 * Types
 */

export type Account = { standing: 'approved' | 'pending' | 'suspended' | 'inactive'; revision: string; approved: boolean; restricted: boolean }

type AccountRecordFacts = Awaited<ReturnType<typeof loadAccountRecordFacts>>

type CommunityActionFacts = { site: { operational_status: string } | undefined; assignment: Staff | undefined }

type CommunityEntryDecision = { kind: 'review'; requestId: string | undefined }
  | { kind: 'establish'; standing: 'approved' | 'pending' }

type ConfigurationFacts = Awaited<ReturnType<typeof loadConfigurationFacts>>

type Decision = 'allowed' | 'missing' | 'forbidden' | 'stale'

type HistoryFacts = Awaited<ReturnType<typeof loadHistoryFacts>>

type MemberDirectoryFacts = Awaited<ReturnType<typeof loadMemberDirectoryFacts>>

export type Pending = { id: string; user_id: string; kind: 'join' | 'reactivation' }

export type Staff = StaffPermissions & { role: 'owner' | 'admin'; status: 'active' | 'paused' | 'revoked' }

type StaffChange = Extract<CommunityCommand, { kind: 'grant' | 'resume' | 'revoke' | 'permissions' | 'reappoint' }>

type StaffChangeFacts = { account: Account; assignment: Staff | undefined; owner: boolean; actor: string; target: string; authEligible: boolean }

type StandingChangeFacts = { account: Account; assignment: Staff | undefined; actorStaff: Staff | undefined }

/*
 * Fact Loaders
 */

// Staff and participant records. The service holds the tenant root through the
// projection/mutation; reuse the established staff loader after any lock wait.
export function loadAccountRecordFacts(tx: Tx, actor: string, tenant: string) {
  return loadCommunityStaffFacts(tx, actor, tenant)
}

// Creation and lifecycle. Services call these loaders in tenant-root, target
// account, target Auth order; facts never survive the operation/transaction.
export async function loadCommunityActionFacts(tx: Tx, actor: string, tenant: string): Promise<CommunityActionFacts> {
  const site = (await sql<{ operational_status: string }>`select operational_status from public.tenants where id=${tenant} for update`.execute(tx)).rows[0]
  return { site, assignment: await loadStaffAssignmentFacts(tx, tenant, actor) }
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

// Candidate roots are facts, not admission. Block services lock these tenant
// and account roots, then re-evaluate sharing against only the locked set.
export async function loadGlobalProfileSharingRoots(tx: Tx, actor: string, target: string) {
  return tx.selectFrom('community_accounts as viewer').innerJoin('community_accounts as target', 'target.tenant_id', 'viewer.tenant_id')
    .select('target.tenant_id').where('viewer.user_id', '=', actor).where('target.user_id', '=', target)
    .orderBy('target.tenant_id').execute()
}

export function loadHistoryFacts(tx: Tx, actor: string, tenant: string) {
  return loadCommunityStaffFacts(tx, actor, tenant)
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

export async function loadLifecycleAccountFacts(tx: Tx, tenant: string, user: string) {
  return (await sql<Account>`select standing,revision,first_approved_at is not null as approved,
    has_disciplinary_restriction as restricted from public.community_accounts
    where tenant_id=${tenant} and user_id=${user} for update`.execute(tx)).rows[0]
}

// Member-directory services hold the tenant SHARE lock before loading facts.
export function loadMemberDirectoryFacts(tx: Tx, actor: string, tenant: string) {
  return tx.selectFrom('tenants as t').leftJoin('community_accounts as c', join => join
    .onRef('c.tenant_id', '=', 't.id').on('c.user_id', '=', actor))
    .select(['t.operational_status','c.standing']).where('t.id', '=', tenant).executeTakeFirst()
}

// Public reads use no actor context. The service locks the exact slug's root,
// then loads these gates in a new statement after any lock wait.
export async function loadPublicDirectoryFacts(tx: Tx, tenant: string) {
  return tx.selectFrom('tenants as t').innerJoin('tenant_settings as s', 's.tenant_id', 't.id')
    .select(['t.operational_status', 's.allow_public_directory_visibility']).where('t.id', '=', tenant).executeTakeFirst()
}

export async function loadStaffAssignmentFacts(tx: Tx, tenant: string, user: string) {
  return (await sql<Staff>`select role,status,${sql.join(staffFlags.map(key => sql.id(key)))}
    from public.tenant_staff_assignments where tenant_id=${tenant} and user_id=${user}`.execute(tx)).rows[0]
}

export async function loadStaffGrantFacts(tx: Tx, target: string, account: Account, assignment: Staff | undefined) {
  // Only protected Auth facts/locking remain privileged. Product facts and grant
  // authority are evaluated here in the API, never by the private primitive.
  if (account.standing !== 'approved' || assignment) return { authEligible: false }
  return (await sql<{ authEligible: boolean }>`select app_private.auth_identity_eligible(${target},true) as "authEligible"`.execute(tx)).rows[0]
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

export function canArchiveCommunity(facts: CommunityActionFacts): Decision {
  if (!facts.site) return 'missing'
  return facts.assignment?.status === 'active' && facts.assignment.role === 'owner' ? 'allowed' : 'forbidden'
}

export function requireCanChangeCommunityStanding(facts: StandingChangeFacts, kind: 'deactivate' | 'suspend' | 'remove' | 'clear') {
  requireDecision(canChangeCommunityStanding(facts, kind))
}

export function canChangeCommunityStanding(facts: StandingChangeFacts, kind: 'deactivate' | 'suspend' | 'remove' | 'clear'): Decision {
  if ((kind === 'suspend' || kind === 'remove') && facts.assignment && facts.assignment.status !== 'revoked'
    && !(facts.actorStaff?.status === 'active' && facts.actorStaff.can_discipline_staff)) return 'forbidden'
  if (kind === 'suspend' && facts.account.standing !== 'approved' && facts.account.standing !== 'suspended') return 'stale'
  if (kind === 'clear' && !facts.account.restricted) return 'stale'
  return 'allowed'
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

export function requireCanEnterCommunityAction(facts: CommunityActionFacts, command: CommunityCommand) {
  requireDecision(canEnterCommunityAction(facts, command))
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

export function requireCanListCommunityAccounts(facts: AccountRecordFacts) { requireDecision(canListCommunityAccounts(facts)) }

export function canListCommunityAccounts(facts: AccountRecordFacts): Decision {
  return facts.site && facts.account?.standing === 'approved'
    && facts.assignment?.role === 'owner' && facts.assignment.status === 'active' ? 'allowed' : 'missing'
}

export function requireCanManageAccountRecords(facts: AccountRecordFacts, kind: RecordKind) {
  requireDecision(canManageAccountRecords(facts, kind))
}

export function canManageAccountRecords(facts: AccountRecordFacts, kind: RecordKind): Decision {
  if (!facts.site) return 'missing'
  const staff = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' ? facts.assignment : undefined
  if (!staff || (facts.site.operational_status !== 'active' && staff.role !== 'owner')) return 'forbidden'
  return (kind === 'staff' ? staff.can_grant_staff : staff.can_manage_community_permissions) ? 'allowed' : 'forbidden'
}

export function requireCanManageCommunityStaff(facts: StaffChangeFacts, command: StaffChange) {
  requireDecision(canManageCommunityStaff(facts, command))
}

export function canManageCommunityStaff(facts: StaffChangeFacts, command: StaffChange): Decision {
  const { account, assignment } = facts
  if (command.kind === 'grant') return account.standing === 'approved' && !assignment && facts.authEligible ? 'allowed' : 'stale'
  if (!assignment || (command.kind === 'reappoint' ? assignment.status !== 'revoked' || account.standing !== 'approved' : assignment.status === 'revoked')) return 'stale'
  if (command.kind === 'resume' && (facts.target === facts.actor || account.standing !== 'approved' || assignment.status !== 'paused')) return 'stale'
  if ((command.kind === 'permissions' || command.kind === 'reappoint') && !facts.owner
    && Object.keys(command.permissions).some(key => key !== 'can_audit_community_accounts' && key !== 'can_audit_staff_accounts')) return 'forbidden'
  return 'allowed'
}

export function requireCanReadAccountRecord(facts: AccountRecordFacts, kind: RecordKind, own: boolean) {
  requireDecision(canReadAccountRecord(facts, kind, own))
}

export function canReadAccountRecord(facts: AccountRecordFacts, kind: RecordKind, own: boolean): Decision {
  return canManageAccountRecords(facts, kind) === 'allowed' || (own && facts.site?.operational_status === 'active') ? 'allowed' : 'missing'
}

export function requireCanReadCommunityAccountFacts(facts: AccountRecordFacts, own: boolean) {
  requireDecision(canReadCommunityAccountFacts(facts, own))
}

export function canReadCommunityAccountFacts(facts: AccountRecordFacts, own: boolean): Decision {
  return canListCommunityAccounts(facts) === 'allowed' || (facts.site?.operational_status === 'active'
    && (own || facts.account?.standing === 'approved' || facts.account?.standing === 'suspended')) ? 'allowed' : 'missing'
}

export function requireCanReadConfiguration(facts: ConfigurationFacts) { requireDecision(canReadConfiguration(facts)) }

export function canReadConfiguration(facts: ConfigurationFacts): Decision {
  if (!facts.site) return 'missing'
  const owner = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' && facts.assignment.role === 'owner'
  return owner || (facts.site.operational_status === 'active'
    && (facts.account?.standing === 'approved' || facts.account?.standing === 'suspended')) ? 'allowed' : 'missing'
}

export function requireCanReadMemberDirectory(facts: MemberDirectoryFacts) {
  requireDecision(canReadMemberDirectory(facts))
}

export function canReadMemberDirectory(facts: MemberDirectoryFacts): Decision {
  return facts?.operational_status === 'active'
    && (facts.standing === 'approved' || facts.standing === 'suspended') ? 'allowed' : 'missing'
}

export function requireCanReadPublicDirectory(facts: Awaited<ReturnType<typeof loadPublicDirectoryFacts>>) {
  requireDecision(canReadPublicDirectory(facts))
}

export function canReadPublicDirectory(facts: Awaited<ReturnType<typeof loadPublicDirectoryFacts>>): Decision {
  return facts?.operational_status === 'active' && facts.allow_public_directory_visibility ? 'allowed' : 'missing'
}

export function requireCanReturnToCommunity(account: Account | undefined, kind: 'join' | 'reactivate') {
  requireDecision(canReturnToCommunity(account, kind))
}

export function canReturnToCommunity(account: Account | undefined, kind: 'join' | 'reactivate'): Decision {
  return kind === 'reactivate' && account?.standing !== 'inactive' ? 'stale' : 'allowed'
}

export function requireCanSelectCommunityRequest(request: Pending | undefined, actor: string, kind: 'approve' | 'withdraw'): asserts request is Pending {
  requireDecision(canSelectCommunityRequest(request, actor, kind))
}

export function canSelectCommunityRequest(request: Pending | undefined, actor: string, kind: 'approve' | 'withdraw'): Decision {
  return !request || (kind === 'withdraw' && request.user_id !== actor) || (kind === 'approve' && request.kind !== 'join') ? 'stale' : 'allowed'
}

export function requireCanTargetCommunityAccount(account: Account | undefined, assignment: Staff | undefined, command: CommunityCommand): asserts account is Account {
  requireDecision(canTargetCommunityAccount(account, assignment, command))
}

export function canTargetCommunityAccount(account: Account | undefined, assignment: Staff | undefined, command: CommunityCommand): Decision {
  if (!account || ('revision' in command && command.revision !== account.revision)) return 'stale'
  return assignment?.role === 'owner' ? 'forbidden' : 'allowed'
}

export function decideCommunityEntry(account: Account | undefined, facts: Awaited<ReturnType<typeof loadJoinCommunityFacts>>): CommunityEntryDecision {
  if (account?.restricted) return { kind: 'review', requestId: facts.request?.id }
  return { kind: 'establish', standing: account?.approved || facts.autoApprove ? 'approved' : 'pending' }
}

/*
 * Audience Predicates
 */

// Community profiles and preferences. These predicates use operation-local
// statement snapshots; ordinary community identity is independent of blocks.
// The caller supplies the tenant `t` alias. Archive RLS independently protects
// underlying account/profile content even if a trusted writer omits a predicate.
function approvedCommunityOwnerAudience(actor: string) {
  return sql<boolean>`exists(select from public.tenant_staff_assignments owner_staff
    join public.community_accounts owner_account using(tenant_id,user_id)
    where owner_staff.tenant_id=t.id and owner_staff.user_id=${actor}
      and owner_staff.role='owner' and owner_staff.status='active' and owner_account.standing='approved')`
}

export function communityAccountFactsTargetAudience(facts: AccountRecordFacts, own: boolean) {
  return sql`${canListCommunityAccounts(facts) === 'allowed' || own} or standing in ('approved','suspended','inactive')`
}

export function communityAccountReviewAudience(actor: string) {
  return sql`t.operational_status='active' and (c.user_id=${actor} or exists(
    select from public.tenant_staff_assignments s where s.tenant_id=c.tenant_id
    and s.user_id=${actor} and s.status='active' and s.can_discipline_users))`
}

export function communityBlockProfileSourceAudience(actor: string, target: string, tenant: string) {
  return sql<boolean>`exists(select from public.community_account_profiles p
    join public.community_accounts target on (target.tenant_id,target.user_id)=(p.tenant_id,p.user_id)
    join public.community_accounts viewer on viewer.tenant_id=p.tenant_id and viewer.user_id=${actor}
    join public.tenants t on t.id=p.tenant_id
    where t.id=${tenant} and p.user_id=${target} and ${communityProfileSourceAudience(actor)})`
}

// Global sharing is a separate audience from ordinary community identity.
// A single qualifying active shared community suffices; no affiliation is returned.
export function communityGlobalSharingAudience(actor: string, target: RawBuilder<string>, lockedTenants?: readonly string[]) {
  return sql<boolean>`exists(select from public.community_accounts viewer
    join public.community_accounts target using(tenant_id)
    join public.community_account_preferences prefs on (prefs.tenant_id,prefs.user_id)=(target.tenant_id,target.user_id)
    join public.tenants t on t.id=target.tenant_id
    where viewer.user_id=${actor} and target.user_id=${target}
      and viewer.standing in ('approved','suspended') and target.standing in ('approved','suspended')
      and t.operational_status='active' and prefs.show_global_profile
      and ${lockedTenants === undefined ? sql<boolean>`true` : sql<boolean>`t.id=any(${lockedTenants}::uuid[])`})`
}

// Audit history. The service holds a tenant SHARE lock before these facts are
// loaded; category filtering must precede cursor/order/limit, including exact IDs.
export function communityHistoryAudience(facts: HistoryFacts) {
  const staff = facts.account?.standing === 'approved' && facts.assignment?.status === 'active' ? facts.assignment : undefined
  const owner = staff?.role === 'owner'
  return sql`${Boolean(owner)} or (${facts.site?.operational_status === 'active'} and exists(
    select from app_private.tenant_admin_action_categories c where c.action_id=a.id
    and ((c.category='community_account' and ${Boolean(staff?.can_audit_community_accounts)})
      or (c.category='staff_account' and ${Boolean(staff?.can_audit_staff_accounts)}))))`
}

export function communityMemberDirectoryTargetAudience() {
  return sql<boolean>`c.standing in ('approved','suspended')`
}

export function communityPendingRequestAudience(actor: string) {
  return sql`exists(select from public.tenant_staff_assignments s join public.tenants t on t.id=s.tenant_id
    where s.tenant_id=r.tenant_id and s.user_id=${actor} and s.status='active' and t.operational_status='active'
    and (s.can_approve_users or (s.can_discipline_users and r.kind='reactivation' and c.standing='inactive' and c.has_disciplinary_restriction)))`
}

// Narrow source-access export for exact community profiles and later block-source
// composition. Requires p/target/viewer/t aliases with the same tenant linkage.
export function communityProfileSourceAudience(actor: string) {
  return sql<boolean>`((t.operational_status='active' and (
    (p.user_id=${actor} and viewer.standing='pending') or
    (viewer.standing in ('approved','suspended') and target.standing in ('approved','suspended','inactive'))))
    or (t.operational_status='archived' and ${approvedCommunityOwnerAudience(actor)}))`
}

export function communityStaffCandidateAudience(actor: string) {
  return sql`c.standing='approved' and exists(select from public.tenant_staff_assignments a
    join public.tenants t on t.id=a.tenant_id where a.tenant_id=c.tenant_id and a.user_id=${actor}
    and a.status='active' and a.can_grant_staff and t.operational_status='active')
    and app_private.auth_identity_eligible(c.user_id,false)`
}

export function ownCommunityPreferencesEditAudience(actor: string) {
  return sql<boolean>`user_id=${actor} and exists(select from public.community_accounts c
    join public.tenants t on t.id=c.tenant_id
    where c.tenant_id=community_account_preferences.tenant_id and c.user_id=community_account_preferences.user_id
      and t.operational_status='active' and c.standing in ('pending','approved'))`
}

export function ownCommunityPreferencesReadAudience(actor: string) {
  return sql<boolean>`user_id=${actor} and exists(select from public.tenants t
    where t.id=community_account_preferences.tenant_id and
    (t.operational_status='active' or ${approvedCommunityOwnerAudience(actor)}))`
}

export function ownCommunityProfileEditAudience(actor: string) {
  return sql<boolean>`p.user_id=${actor} and exists(select from public.community_accounts c
    join public.tenants t on t.id=c.tenant_id where c.tenant_id=p.tenant_id and c.user_id=p.user_id
    and t.operational_status='active' and c.standing in ('pending','approved','suspended'))`
}

// Requests and reviews. Audiences are applied before ordering and pagination;
// queue visibility does not confer command authority or expose applicant Auth.
export function ownCommunityRequestAudience(actor: string) {
  return sql`c.user_id=${actor} and t.operational_status='active'`
}

export function publicCommunityDirectoryTargetAudience() {
  return sql<boolean>`c.standing in ('approved','suspended')`
}

export function publicCommunityLandingAudience() {
  return sql<boolean>`t.operational_status='active'`
}
