import { randomUUID } from 'node:crypto'
import { loadCreateCommunityFacts, requireCanCreateCommunity, lockCommunityLifecycleRoot,
  loadLifecycleAccountFacts, loadStaffAssignmentFacts, loadCommunityRequestFacts, loadCommunityWithdrawalFacts,
  requireActiveCommunity, requireActiveStaffPermission, requireCommunityLifecycleRoot, requireCommunityOwner,
  requireOwnActivationRequest, requireCommunityJoinRequest, requireNonOwnerCommunityAccount, requireWithdrawableCommunityAccount,
  requireCanApproveCommunityRequest, requireInactiveCommunityAccount, loadPendingCommunityReturn,
  loadCommunityAutoApproval, decideCommunityEntryStanding, requireCanDisciplineStaffAccount,
  requireSuspendableCommunityAccount, requireRestrictedCommunityAccount, requireNewStaffAssignment,
  requireEligibleStaffGrantTarget, lockStaffGrantAuthEligibility, requireResumableStaffAssignment,
  requireActiveOrPausedStaffAssignment, requireReappointableStaffAssignment, requireEditableStaffPermissions,
  loadConfigurationFacts, requireCanEditConfiguration,
  loadAccountRecordFacts, requireCanManageParticipantPermissions,
  selectHistoryViewerFacts, type Account, type Staff, type Pending } from './policies.ts'
import { sql } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/postgres'
import { type AppDatabase, withEligibleActorTransaction, withTransactionRetry, type AuthenticatedContext } from '../../database.ts'
import { ApplicationError } from '../../http-errors.ts'
import type { DirectoryCursors } from '../../directory-cursors.ts'
import {
  copySlots,
  settingFields,
  type CommunityLanding,
  type PublicCopy,
  type CommunityCopy,
  type CommunityDetails,
  type CommunityDetailsInput,
  type CommunitySettings,
  type CommunitySettingsRecord,
  type AccountFacts,
  type CommunityProfile,
  type CommunityProfileInput,
  type DirectoryPage,
  type DirectoryQuery,
  type MemberDirectoryRow,
  type PublicDirectoryRow,
  staffFlags,
  type CommunityDisciplineInput,
  type StaffPermissions,
  type CommandResult,
  type CreateCommunityInput,
  type CuratedProfile,
  type AccountReview,
  type CommunityRequest,
  type OwnCommunityRequestResponse,
  type StaffCandidate,
  communityPreferenceFields,
  type CommunityPreferences,
  type RecordPage,
  type RecordQuery,
  type HistoryEntry,
  type HistoryPage,
  type HistoryQuery,
  type SlugParams,
  type CommunityTransactionContext,
  type ReviewParams,
  type AfterQuery,
  type MissingRequest,
  type AccountParams,
  type AccountStanding,
  type ConfigurationKind,
  type CopyParams,
  type CopyInput,
  type CopyChange,
  type RecordKind,
  type Records,
  type ParticipantPermissionInput,
  type Position,
  type Tx,
  type TenantParams,
  type CommunityRelationship,
  type CommunityDependencies,
} from './types.ts'

export function createCommunityService({ db, cursors }: CommunityDependencies) {
  return {
    // Public access and standing
    getCommunityStandingReference() {
      return getCommunityStandingReference(db)
    },
    readCommunityLanding(params: SlugParams) {
      return readCommunityLanding(db, params.slug)
    },
    getPublicCommunityDirectory(params: SlugParams, query: DirectoryQuery) {
      return getPublicCommunityDirectory(db, params.slug, query, cursors)
    },
    // Creation and lifecycle
    createCommunity(requestContext: AuthenticatedContext, input: CreateCommunityInput) {
      return createCommunity(db, requestContext, input)
    },
    joinCommunity(requestContext: AuthenticatedContext, tenant: string, profile: CuratedProfile) {
      return joinCommunity(db, requestContext, tenant, profile)
    },
    deactivateOwnCommunityAccount(requestContext: AuthenticatedContext, tenant: string) {
      return deactivateOwnCommunityAccount(db, requestContext, tenant)
    },
    reactivateOwnCommunityAccount(requestContext: AuthenticatedContext, tenant: string) {
      return reactivateOwnCommunityAccount(db, requestContext, tenant)
    },
    withdrawCommunityEntryRequest(requestContext: AuthenticatedContext, tenant: string, requestId: string) {
      return withdrawCommunityEntryRequest(db, requestContext, tenant, requestId)
    },
    approveCommunityJoinRequest(requestContext: AuthenticatedContext, tenant: string, requestId: string, revision: string) {
      return approveCommunityJoinRequest(db, requestContext, tenant, requestId, revision)
    },
    suspendCommunityAccount(requestContext: AuthenticatedContext, tenant: string, input: CommunityDisciplineInput) {
      return suspendCommunityAccount(db, requestContext, tenant, input)
    },
    removeUserFromCommunity(requestContext: AuthenticatedContext, tenant: string, input: CommunityDisciplineInput) {
      return removeUserFromCommunity(db, requestContext, tenant, input)
    },
    clearCommunityAccountRestriction(requestContext: AuthenticatedContext, tenant: string, input: CommunityDisciplineInput) {
      return clearCommunityAccountRestriction(db, requestContext, tenant, input)
    },
    grantCommunityStaffAssignment(requestContext: AuthenticatedContext, tenant: string, target: string) {
      return grantCommunityStaffAssignment(db, requestContext, tenant, target)
    },
    resumeCommunityStaffAssignment(requestContext: AuthenticatedContext, tenant: string, target: string) {
      return resumeCommunityStaffAssignment(db, requestContext, tenant, target)
    },
    revokeCommunityStaffAssignment(requestContext: AuthenticatedContext, tenant: string, target: string, reason?: string) {
      return revokeCommunityStaffAssignment(db, requestContext, tenant, target, reason)
    },
    reappointCommunityStaff(requestContext: AuthenticatedContext, tenant: string, target: string, permissions: StaffPermissions) {
      return reappointCommunityStaff(db, requestContext, tenant, target, permissions)
    },
    updateCommunityStaffPermissions(requestContext: AuthenticatedContext, tenant: string, target: string, permissions: Partial<StaffPermissions>) {
      return updateCommunityStaffPermissions(db, requestContext, tenant, target, permissions)
    },
    archiveCommunity(requestContext: AuthenticatedContext, tenant: string) {
      return archiveCommunity(db, requestContext, tenant)
    },
    restoreCommunity(requestContext: AuthenticatedContext, tenant: string) {
      return restoreCommunity(db, requestContext, tenant)
    },
    // Requests and reviews
    readOwnCommunityEntryRequest(requestContext: AuthenticatedContext, params: TenantParams) {
      return readOwnCommunityEntryRequest(db, requestContext, params)
    },
    reviewAccount(requestContext: AuthenticatedContext, params: ReviewParams) {
      return reviewAccount(db, requestContext, params)
    },
    staffCandidates(requestContext: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
      return staffCandidates(db, requestContext, params, query)
    },
    pendingRequests(requestContext: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
      return pendingRequests(db, requestContext, params, query)
    },
    // Profiles and preferences
    readProfile(requestContext: AuthenticatedContext, params: AccountParams) {
      return readProfile(db, requestContext, params)
    },
    saveOwnProfile(requestContext: AuthenticatedContext, params: TenantParams, input: CommunityProfileInput) {
      return withEligibleActorTransaction(db, requestContext, tx => ownCommunityProfile(tx, requestContext.actorId, params.tenantId, input), { initialTenantId: params.tenantId })
    },
    readOwnPreferences(requestContext: AuthenticatedContext, params: TenantParams) {
      return withEligibleActorTransaction(db, requestContext, tx => ownCommunityPreferences(tx, requestContext.actorId, params.tenantId))
    },
    saveOwnPreferences(requestContext: AuthenticatedContext, params: TenantParams, input: Partial<CommunityPreferences>) {
      return withEligibleActorTransaction(db, requestContext, tx => ownCommunityPreferences(tx, requestContext.actorId, params.tenantId, input), { initialTenantId: params.tenantId })
    },
    // Configuration and copy
    readDetails(requestContext: AuthenticatedContext, params: TenantParams) {
      return withEligibleActorTransaction(db, requestContext, tx => readConfigurationDetails(tx, requestContext.actorId, params.tenantId))
    },
    saveDetails(requestContext: AuthenticatedContext, params: TenantParams, input: Partial<CommunityDetailsInput>) {
      return withEligibleActorTransaction(db, requestContext, tx => configurationDetails(tx, requestContext.actorId, params.tenantId, input), { initialTenantId: params.tenantId })
    },
    readSettings(requestContext: AuthenticatedContext, params: TenantParams) {
      return withEligibleActorTransaction(db, requestContext, tx => readConfigurationSettings(tx, requestContext.actorId, params.tenantId))
    },
    saveSettings(requestContext: AuthenticatedContext, params: TenantParams, input: Partial<CommunitySettings>) {
      return withEligibleActorTransaction(db, requestContext, tx => configurationSettings(tx, requestContext.actorId, params.tenantId, input), { initialTenantId: params.tenantId })
    },
    readCopy(requestContext: AuthenticatedContext, params: TenantParams) {
      return withEligibleActorTransaction(db, requestContext, tx => readConfigurationCopy(tx, requestContext.actorId, params.tenantId))
    },
    saveCopy(requestContext: AuthenticatedContext, params: CopyParams, input: CopyInput) {
      return withEligibleActorTransaction(db, requestContext, tx => configurationCopy(tx, requestContext.actorId, params.tenantId, { key: params.contentKey, text: input.text_value }), { initialTenantId: params.tenantId })
    },
    deleteCopy(requestContext: AuthenticatedContext, params: CopyParams) {
      return withEligibleActorTransaction(db, requestContext, tx => configurationCopy(tx, requestContext.actorId, params.tenantId, { key: params.contentKey }), { initialTenantId: params.tenantId })
    },
    // Directories and account facts
    memberDirectory(requestContext: AuthenticatedContext, params: TenantParams, query: DirectoryQuery) {
      return withEligibleActorTransaction(db, requestContext, tx => readMemberDirectory(tx, requestContext.actorId, params.tenantId, query, cursors))
    },
    ownerAccounts(requestContext: AuthenticatedContext, params: TenantParams, query: DirectoryQuery) {
      return withEligibleActorTransaction(db, requestContext, tx => listOwnerAccounts(tx, requestContext.actorId, params.tenantId, query, cursors))
    },
    accountFacts(requestContext: AuthenticatedContext, params: AccountParams) {
      return withEligibleActorTransaction(db, requestContext, tx => readAccountFacts(tx, requestContext.actorId, params.tenantId, params.userId))
    },
    // Staff and participant permissions
    listStaff(requestContext: AuthenticatedContext, params: TenantParams, query: RecordQuery) {
      return withEligibleActorTransaction(db, requestContext, tx => listAccountRecords(tx, requestContext.actorId, params.tenantId, 'staff', query))
    },
    readStaff(requestContext: AuthenticatedContext, params: AccountParams) {
      return withEligibleActorTransaction(db, requestContext, tx => readAccountRecord(tx, requestContext.actorId, params.tenantId, 'staff', params.userId))
    },
    listParticipantPermissions(requestContext: AuthenticatedContext, params: TenantParams, query: RecordQuery) {
      return withEligibleActorTransaction(db, requestContext, tx => listAccountRecords(tx, requestContext.actorId, params.tenantId, 'participant', query))
    },
    readParticipantPermissions(requestContext: AuthenticatedContext, params: AccountParams) {
      return withEligibleActorTransaction(db, requestContext, tx => readAccountRecord(tx, requestContext.actorId, params.tenantId, 'participant', params.userId))
    },
    saveParticipantPermissions(requestContext: AuthenticatedContext, params: AccountParams, input: ParticipantPermissionInput) {
      return withEligibleActorTransaction(db, requestContext, tx => setParticipantPermission(tx, requestContext.actorId, params.tenantId, params.userId, input.can_post_public_events), { initialTenantId: params.tenantId })
    },
    // Audit history
    history(requestContext: AuthenticatedContext, params: TenantParams, query: HistoryQuery) {
      return history(db, requestContext, params, query)
    }
  }
}

// Public access and standing
function getCommunityStandingReference(db: AppDatabase) {
  return withTransactionRetry(db, tx => tx.selectFrom('community_standing').selectAll().orderBy('standing').execute())
}

async function readCommunityLanding(db: AppDatabase, slug: string): Promise<CommunityLanding | undefined> {
  return withTransactionRetry(db, tx =>
    tx.selectFrom('tenants as t').innerJoin('tenant_settings as s', 's.tenant_id', 't.id')
      .select(['t.id', 't.slug', 't.name', 't.country_code', 't.state_province', 't.city', 't.timezone',
        's.auto_approve_users', 's.allow_public_directory_visibility'])
      .select(sql<PublicCopy[]>`coalesce((select jsonb_agg(jsonb_build_object(
        'tenant_id',o.tenant_id,'content_key',o.content_key,'text_value',o.text_value) order by o.content_key)
        from public.tenant_website_content_overrides o where o.tenant_id=t.id
        and o.content_key in (${sql.join(Object.keys(copySlots))})), '[]'::jsonb)`.as('overrides'))
      .where('t.slug', '=', slug).where('t.operational_status', '=', 'active').executeTakeFirst())
}
function getPublicCommunityDirectory(db: AppDatabase, slug: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<PublicDirectoryRow>> {
  return withTransactionRetry(db, async tx => {
    const scope = ['public-directory', slug], after = cursors.decode(scope, query.cursor), limit = Number(query.limit ?? 50)
    const page = await tx.selectFrom('tenants as t').innerJoin('tenant_settings as settings', 'settings.tenant_id', 't.id')
      .where('t.slug', '=', slug).where('t.operational_status', '=', 'active')
      .where('settings.allow_public_directory_visibility', '=', true)
      .select(eb => jsonArrayFrom(eb.selectFrom('community_accounts as c')
        .innerJoin('community_account_profiles as p', join => join.onRef('p.tenant_id', '=', 'c.tenant_id').onRef('p.user_id', '=', 'c.user_id'))
        .leftJoin('tenant_staff_assignments as s', join => join.onRef('s.tenant_id', '=', 'c.tenant_id').onRef('s.user_id', '=', 'c.user_id'))
        .select(['c.user_id', 'p.display_name'])
        .select(sql<PublicDirectoryRow['staff_role']>`case when c.standing='approved' and s.status='active' then s.role end`.as('staff_role'))
        .whereRef('c.tenant_id', '=', 't.id').where('c.standing', 'in', ['approved', 'suspended'])
        .$if(after !== null, q => q.where('c.user_id', '>', after!))
        .orderBy('c.user_id').limit(limit + 1)).as('rows'))
      .executeTakeFirst()
    if (!page) throw new ApplicationError(404, 'missing')
    const { rows } = page
    const visible = rows.slice(0, limit), last = visible.at(-1)
    return {
      rows: visible.map(({ display_name, staff_role }) => ({ display_name, staff_role })),
      next: rows.length > limit && last ? cursors.encode(scope, last.user_id) : null
    }
  })
}

// Creation and lifecycle
async function appendCommunityAuditEvent({ tx, tenant }: CommunityTransactionContext, user: string | null, action: string,
  details: Record<string, unknown> = {}, reason?: string, contentKey: string | null = null) {
  const row = await tx.insertInto('tenant_admin_actions').values({
    tenant_id: tenant, target_user_id: user, action, details: JSON.stringify(details),
    reason: reason?.trim() || null, content_key: contentKey,
  }).returning('id').executeTakeFirstOrThrow()
  // Classification belongs to the trusted API writer. Linked discipline events
  // carry no community reason; revocation from paused staff is staff-only.
  const categories: string[] = []
  if (action.startsWith('staff_')) categories.push('staff_account')
  if (action.startsWith('community_') || action === 'staff_created' || action === 'staff_reappointed'
    || (action === 'staff_revoked' && details.before_status === 'active')) categories.push('community_account')
  if (categories.length) await tx.insertInto('app_private.tenant_admin_action_categories')
    .values(categories.map(category => ({ action_id: row.id, category }))).execute()
}

async function setStandingAndRestriction({ tx, tenant }: CommunityTransactionContext, user: string, newStanding: Account['standing'], restricted = false) {
  if (newStanding === 'inactive') {
    // For privacy reasons, show_global_profile must be set to false when a user leaves a community
    await sql`update public.community_account_preferences set show_global_profile=false
      where tenant_id=${tenant} and user_id=${user} and show_global_profile`.execute(tx)
  }
  return sql`update public.community_accounts set standing=${newStanding},has_disciplinary_restriction=${restricted}
    where tenant_id=${tenant} and user_id=${user}`.execute(tx)
}

async function createCommunityAccount(transactionContext: CommunityTransactionContext, standing: 'approved' | 'pending', profile: CuratedProfile) {
  const { tx, tenant, actor } = transactionContext
  await sql`insert into public.community_accounts(tenant_id,user_id,standing) values(${tenant},${actor},${standing})`.execute(tx)
  await sql`insert into public.community_account_profiles(tenant_id,user_id,display_name,bio)
    values(${tenant},${actor},${profile.displayName.trim()},${profile.bio?.trim() || null})`.execute(tx)
  await sql`insert into public.community_account_preferences(tenant_id,user_id) values(${tenant},${actor})`.execute(tx)
  await sql`insert into public.community_account_permissions(tenant_id,user_id) values(${tenant},${actor})`.execute(tx)
}

function createCommunity(db: AppDatabase, requestContext: AuthenticatedContext, input: CreateCommunityInput): Promise<CommandResult> {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    requireCanCreateCommunity(await loadCreateCommunityFacts(tx, actor))
    const tenant = randomUUID(), c = { tx, actor, tenant }
    await sql`select set_config('ct.tenant_id', ${tenant}, true)`.execute(tx)

    // New community inserts
    await sql`insert into public.tenants(id,name,slug,country_code,timezone,state_province,city)
      values(${tenant},${input.name.trim()},${input.slug},${input.country},${input.timezone},${input.region.trim() || null},${input.city.trim() || null})`.execute(tx)
    await sql`insert into public.tenant_settings(tenant_id) values(${tenant})`.execute(tx)
    await appendCommunityAuditEvent(c, null, 'tenants.insert')
    await appendCommunityAuditEvent(c, null, 'tenant_settings.insert')

    // New community account and owner staff inserts
    await createCommunityAccount(c, 'approved', input.profile)
    await sql`insert into public.tenant_staff_assignments(tenant_id,user_id,role,${sql.join(staffFlags.map(key => sql.id(key)))})
      values(${tenant},${actor},'owner',${sql.join(staffFlags.map(() => sql`true`))})`.execute(tx)
    await appendCommunityAuditEvent(c, actor, 'community_approved', { after_standing: 'approved' })
    await appendCommunityAuditEvent(c, actor, 'staff_created', { after_status: 'active' })
    return { outcome: 'created', tenantId: tenant }
  })
}

async function createCommunityEntryRequestRecord(transactionContext: CommunityTransactionContext, kind: Pending['kind']) {
  const { tx, tenant, actor } = transactionContext
  const id = randomUUID()
  await sql`insert into app_private.community_account_requests(id,tenant_id,user_id,requested_by,kind)
    values(${id},${tenant},${actor},${actor},${kind})`.execute(tx)
  await appendCommunityAuditEvent(transactionContext, actor, kind === 'join' ? 'community_join_requested' : 'community_reactivation_requested', { request_id: id })
  return id
}

async function closeRequest({ tx, tenant }: CommunityTransactionContext, user: string) {
  return (await sql<Pending>`delete from app_private.community_account_requests where tenant_id=${tenant}
    and user_id=${user} returning id,kind,user_id`.execute(tx)).rows[0]
}

async function setStaffStatus(c: CommunityTransactionContext, user: string, before: Staff['status'], after: Staff['status'], action: string, reason?: string) {
  await sql`update public.tenant_staff_assignments set status=${after} where tenant_id=${c.tenant} and user_id=${user}`.execute(c.tx)
  await appendCommunityAuditEvent(c, user, action, { before_status: before, after_status: after }, reason)
}
function result(c: CommunityTransactionContext, outcome: string): CommandResult { return { outcome, tenantId: c.tenant } }
async function loadActiveCommunityStaff({ tx, actor, tenant }: CommunityTransactionContext) {
  requireActiveCommunity(await lockCommunityLifecycleRoot(tx, tenant))
  return loadStaffAssignmentFacts(tx, tenant, actor)
}

async function loadCommunityAccountTarget({ tx, tenant }: CommunityTransactionContext, user: string, revision?: string) {
  const account = await loadLifecycleAccountFacts(tx, tenant, user)
  const assignment = await loadStaffAssignmentFacts(tx, tenant, user)
  requireNonOwnerCommunityAccount(account, assignment, revision)
  return { account, assignment }
}

function joinCommunity(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, profile: CuratedProfile) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    const { actor } = c
    requireActiveCommunity(await lockCommunityLifecycleRoot(tx, tenant))
    const account = await loadLifecycleAccountFacts(tx, tenant, actor)
    if (account) return result(c, account.standing === 'inactive' ? 'reactivation_required' : 'already_applied')

    const standing = decideCommunityEntryStanding(false, await loadCommunityAutoApproval(tx, tenant))
    await createCommunityAccount(c, standing, profile)
    if (standing === 'pending') return { ...result(c, standing), requestId: await createCommunityEntryRequestRecord(c, 'join') }
    await appendCommunityAuditEvent(c, actor, 'community_approved', { after_standing: standing })
    return result(c, standing)
  }, { initialTenantId: tenant })
}

function deactivateOwnCommunityAccount(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string) {
  return withEligibleActorTransaction(db, requestContext,
    tx => deactivateOwnCommunityAccountInTransaction({ tx, tenant, actor: requestContext.actorId }),
    { initialTenantId: tenant })
}

export async function deactivateOwnCommunityAccountInTransaction(c: CommunityTransactionContext) {
  const { tx, actor, tenant } = c
  requireActiveCommunity(await lockCommunityLifecycleRoot(tx, tenant))
  const { account, assignment } = await loadCommunityAccountTarget(c, actor)
  if (account.standing === 'inactive') return result(c, 'already_applied')

  const pending = await closeRequest(c, actor)
  await setStandingAndRestriction(c, actor, 'inactive', account.restricted)
  if (assignment?.status === 'active') await setStaffStatus(c, actor, 'active', 'paused', 'staff_paused')
  return recordStandingChange(c, actor, account, 'inactive', account.restricted, 'community_deactivated', pending)
}

function reactivateOwnCommunityAccount(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    const c = { tx, tenant, actor }
    requireActiveCommunity(await lockCommunityLifecycleRoot(tx, tenant))
    const account = await loadLifecycleAccountFacts(tx, tenant, actor)
    requireInactiveCommunityAccount(account)
    if (account.restricted) {
      const pending = await loadPendingCommunityReturn(tx, tenant, actor)
      if (pending) return { ...result(c, 'review_requested'), requestId: pending.id }
      await setStandingAndRestriction(c, actor, 'inactive', true)
      return { ...result(c, 'review_requested'), requestId: await createCommunityEntryRequestRecord(c, 'reactivation') }
    }

    const standing = decideCommunityEntryStanding(account.approved, await loadCommunityAutoApproval(tx, tenant))
    await setStandingAndRestriction(c, actor, standing)
    if (standing === 'pending') return { ...result(c, standing), requestId: await createCommunityEntryRequestRecord(c, 'join') }
    await appendCommunityAuditEvent(c, actor, account.approved ? 'community_reactivated' : 'community_approved', { after_standing: standing })
    return result(c, standing)
  }, { initialTenantId: tenant })
}

async function deleteCommunityEntryRequestRecord({ tx, tenant }: CommunityTransactionContext, user: string, requestId: string) {
  const deletedRequest = (await sql<Pending>`delete from app_private.community_account_requests
    where tenant_id=${tenant} and user_id=${user} and id=${requestId} returning id,kind,user_id`.execute(tx)).rows[0]
  if (!deletedRequest) throw new ApplicationError(409, 'stale_state')
  return deletedRequest
}

function withdrawCommunityEntryRequest(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, requestId: string) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    const c = { tx, tenant, actor }
    const facts = await loadCommunityWithdrawalFacts(tx, tenant, actor, requestId)
    requireActiveCommunity(facts)
    requireOwnActivationRequest(facts?.user_id, actor)
    requireWithdrawableCommunityAccount(facts?.standing)
    const deletedRequest = await deleteCommunityEntryRequestRecord(c, actor, requestId)
    const reactivation = deletedRequest.kind === 'reactivation'
    const changed = await setStandingAndRestriction(c, actor, 'inactive', reactivation)
    if (changed.numAffectedRows !== 1n) throw new ApplicationError(404, 'missing')
    const action = reactivation ? 'community_reactivation_withdrawn' : 'community_join_withdrawn'
    await appendCommunityAuditEvent(c, actor, action, { request_id: deletedRequest.id })
    return result(c, action)
  }, { initialTenantId: tenant })
}

function approveCommunityJoinRequest(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, requestId: string, revision: string) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    requireActiveStaffPermission(await loadActiveCommunityStaff(c), 'can_approve_users')
    const pending = await loadCommunityRequestFacts(tx, tenant, requestId)
    requireCommunityJoinRequest(pending)
    const { account } = await loadCommunityAccountTarget(c, pending.user_id, revision)
    const deletedRequest = await deleteCommunityEntryRequestRecord(c, pending.user_id, requestId)
    requireCommunityJoinRequest(deletedRequest)
    requireCanApproveCommunityRequest(account)
    await setStandingAndRestriction(c, pending.user_id, 'approved')
    await appendCommunityAuditEvent(c, pending.user_id, 'community_approved', { request_id: deletedRequest.id })
    return result(c, 'community_approved')
  }, { initialTenantId: tenant })
}

async function recordStandingChange(c: CommunityTransactionContext, user: string, before: Account, standing: Account['standing'], restricted: boolean,
  action: string, pending: Pending | undefined, reason?: string) {
  await appendCommunityAuditEvent(c, user, action, {
    before_standing: before.standing, after_standing: standing, before_restricted: before.restricted,
    after_restricted: restricted, ...(pending && { request_id: pending.id })
  }, reason)
  return result(c, action)
}

async function revokeStaffForDiscipline(c: CommunityTransactionContext, target: string, assignment: Staff | undefined) {
  if (assignment && assignment.status !== 'revoked') await setStaffStatus(c, target, assignment.status, 'revoked', 'staff_revoked')
}

function suspendCommunityAccount(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, input: CommunityDisciplineInput) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    const { target, revision, reason } = input
    const staff = await loadActiveCommunityStaff(c)
    requireActiveStaffPermission(staff, 'can_discipline_users')
    const { account, assignment } = await loadCommunityAccountTarget(c, target, revision)
    requireCanDisciplineStaffAccount(staff, assignment)
    requireSuspendableCommunityAccount(account.standing)
    if (account.standing === 'suspended') return result(c, 'already_applied')

    const pending = await closeRequest(c, target)
    await setStandingAndRestriction(c, target, 'suspended', true)
    await revokeStaffForDiscipline(c, target, assignment)
    return recordStandingChange(c, target, account, 'suspended', true, 'community_suspended', pending, reason)
  }, { initialTenantId: tenant })
}

function removeUserFromCommunity(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, input: CommunityDisciplineInput) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    const { target, revision, reason } = input
    const staff = await loadActiveCommunityStaff(c)
    requireActiveStaffPermission(staff, 'can_discipline_users')
    const { account, assignment } = await loadCommunityAccountTarget(c, target, revision)
    requireCanDisciplineStaffAccount(staff, assignment)
    if (account.standing === 'inactive' && account.restricted) return result(c, 'already_applied')

    const pending = await closeRequest(c, target)
    await setStandingAndRestriction(c, target, 'inactive', true)
    await revokeStaffForDiscipline(c, target, assignment)
    return recordStandingChange(c, target, account, 'inactive', true, 'community_removed', pending, reason)
  }, { initialTenantId: tenant })
}

function clearCommunityAccountRestriction(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, input: CommunityDisciplineInput) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    const { target, revision, reason } = input
    requireActiveStaffPermission(await loadActiveCommunityStaff(c), 'can_discipline_users')
    const { account } = await loadCommunityAccountTarget(c, target, revision)
    requireRestrictedCommunityAccount(account.restricted)
    const standing = account.standing === 'suspended' ? 'approved' : 'inactive'
    const pending = await closeRequest(c, target)
    await setStandingAndRestriction(c, target, standing)
    return recordStandingChange(c, target, account, standing, false, 'community_restriction_cleared', pending, reason)
  }, { initialTenantId: tenant })
}

async function finishStaffChange(c: CommunityTransactionContext, target: string, account: Account) {
  // A staff change invalidates an earlier discipline preview for this target.
  await setStandingAndRestriction(c, target, account.standing, account.restricted)
  return result(c, 'saved')
}

function grantCommunityStaffAssignment(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, target: string) {
  return withEligibleActorTransaction(db, requestContext,
    tx => grantCommunityStaffAssignmentInTransaction({ tx, tenant, actor: requestContext.actorId }, target),
    { initialTenantId: tenant })
}

export async function grantCommunityStaffAssignmentInTransaction(c: CommunityTransactionContext, target: string) {
  const { tx, tenant } = c
  requireActiveStaffPermission(await loadActiveCommunityStaff(c), 'can_grant_staff')
  const { account, assignment } = await loadCommunityAccountTarget(c, target)
  requireNewStaffAssignment(account.standing, assignment)
  requireEligibleStaffGrantTarget(await lockStaffGrantAuthEligibility(tx, target))
  await sql`insert into public.tenant_staff_assignments(tenant_id,user_id,role) values(${tenant},${target},'admin')`.execute(tx)
  await appendCommunityAuditEvent(c, target, 'staff_created', { after_status: 'active' })
  return finishStaffChange(c, target, account)
}

function resumeCommunityStaffAssignment(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, target: string) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    requireActiveStaffPermission(await loadActiveCommunityStaff(c), 'can_grant_staff')
    const { account, assignment } = await loadCommunityAccountTarget(c, target)
    requireResumableStaffAssignment(account.standing, assignment, target === c.actor)
    await setStaffStatus(c, target, assignment.status, 'active', 'staff_resumed')
    return finishStaffChange(c, target, account)
  }, { initialTenantId: tenant })
}

function revokeCommunityStaffAssignment(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, target: string, reason?: string) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    requireActiveStaffPermission(await loadActiveCommunityStaff(c), 'can_discipline_staff')
    const { account, assignment } = await loadCommunityAccountTarget(c, target)
    requireActiveOrPausedStaffAssignment(assignment)
    await setStaffStatus(c, target, assignment.status, 'revoked', 'staff_revoked', reason)
    return finishStaffChange(c, target, account)
  }, { initialTenantId: tenant })
}

function staffPermissionChanges(assignment: Staff, permissions: Partial<StaffPermissions>) {
  const changed = staffFlags.filter(key => Object.hasOwn(permissions, key) && permissions[key] !== assignment[key])
  return {
    sets: changed.map(key => sql`${sql.id(key)}=${permissions[key]}`),
    audit: Object.fromEntries(changed.map(key => [key, { before: assignment[key], after: permissions[key] }])),
  }
}

function reappointCommunityStaff(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, target: string, permissions: StaffPermissions) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const c = { tx, tenant, actor: requestContext.actorId }
    requireCommunityOwner(await loadActiveCommunityStaff(c))
    const { account, assignment } = await loadCommunityAccountTarget(c, target)
    requireReappointableStaffAssignment(account.standing, assignment)
    const changes = staffPermissionChanges(assignment, permissions)
    await sql`update public.tenant_staff_assignments set ${sql.join([...changes.sets, sql`status='active'`])}
      where tenant_id=${tenant} and user_id=${target}`.execute(tx)
    await appendCommunityAuditEvent(c, target, 'staff_reappointed', { permissions: changes.audit, before_status: 'revoked', after_status: 'active' })
    return finishStaffChange(c, target, account)
  }, { initialTenantId: tenant })
}

function updateCommunityStaffPermissions(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string, target: string, permissions: Partial<StaffPermissions>) {
  return withEligibleActorTransaction(db, requestContext,
    tx => updateCommunityStaffPermissionsInTransaction({ tx, tenant, actor: requestContext.actorId }, target, permissions),
    { initialTenantId: tenant })
}

export async function updateCommunityStaffPermissionsInTransaction(c: CommunityTransactionContext, target: string, permissions: Partial<StaffPermissions>) {
  const { tx, tenant } = c
  const staff = await loadActiveCommunityStaff(c)
  requireActiveStaffPermission(staff, 'can_grant_staff')
  const { account, assignment } = await loadCommunityAccountTarget(c, target)
  requireActiveOrPausedStaffAssignment(assignment)
  requireEditableStaffPermissions(staff.role, permissions)
  const changes = staffPermissionChanges(assignment, permissions)
  if (!changes.sets.length) return result(c, 'already_applied')
  await sql`update public.tenant_staff_assignments set ${sql.join(changes.sets)}
    where tenant_id=${tenant} and user_id=${target}`.execute(tx)
  await appendCommunityAuditEvent(c, target, 'staff_permissions_changed', { permissions: changes.audit })
  return finishStaffChange(c, target, account)
}

async function setCommunityArchiveStatus(c: CommunityTransactionContext, status: 'active' | 'archived', action: 'tenants.archive' | 'tenants.restore') {
  const { tx, tenant, actor } = c
  const site = await lockCommunityLifecycleRoot(tx, tenant)
  requireCommunityLifecycleRoot(site)
  requireCommunityOwner(await loadStaffAssignmentFacts(tx, tenant, actor))
  if (site.operational_status === status) return result(c, 'already_applied')
  await sql`update public.tenants set operational_status=${status} where id=${tenant}`.execute(tx)
  await appendCommunityAuditEvent(c, null, action)
  return result(c, status)
}

function archiveCommunity(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string) {
  return withEligibleActorTransaction(db, requestContext,
    tx => archiveCommunityInTransaction({ tx, tenant, actor: requestContext.actorId }),
    { initialTenantId: tenant })
}

export function archiveCommunityInTransaction(c: CommunityTransactionContext) {
  return setCommunityArchiveStatus(c, 'archived', 'tenants.archive')
}

function restoreCommunity(db: AppDatabase, requestContext: AuthenticatedContext, tenant: string) {
  return withEligibleActorTransaction(db, requestContext,
    tx => setCommunityArchiveStatus({ tx, tenant, actor: requestContext.actorId }, 'active', 'tenants.restore'),
    { initialTenantId: tenant })
}

// Requests and reviews
// Queue visibility does not confer command authority or expose applicant Auth.
function readOwnCommunityEntryRequest(db: AppDatabase, requestContext: AuthenticatedContext, params: TenantParams) {
  const actor = requestContext.actorId;
  const tenant = params.tenantId;
  return withEligibleActorTransaction<OwnCommunityRequestResponse | MissingRequest>(db, requestContext, async tx => {
    const row = (await sql<OwnCommunityRequestResponse>`select case when r.id is not null then
        jsonb_build_object('request_id',r.id,'kind',r.kind,'requested_at',r.requested_at) end as request
        from public.community_accounts c join public.tenants t on t.id=c.tenant_id
        left join app_private.community_account_requests r using(tenant_id,user_id)
        where c.tenant_id=${tenant} and c.user_id=${actor} and t.operational_status='active'`.execute(tx)).rows[0]
    return row ?? { status: 404 as const }
  })
}
function reviewAccount(db: AppDatabase, requestContext: AuthenticatedContext, params: ReviewParams) {
  const actor = requestContext.actorId;
  const tenantId = params.tenantId;
  const target = params.target;
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const row = (await sql<AccountReview>`select c.standing,c.revision,case when c.user_id=${actor} then r.id end as request_id
          from public.community_accounts c join public.tenants t on t.id=c.tenant_id
          left join app_private.community_account_requests r using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.user_id=${target} and t.operational_status='active' and (c.user_id=${actor} or exists(
            select from public.tenant_staff_assignments s where s.tenant_id=c.tenant_id
            and s.user_id=${actor} and s.status='active' and s.can_discipline_users))
          `.execute(tx)).rows[0]
    return row ? { row } : { status: 404 as const }
  })
}
function staffCandidates(db: AppDatabase, requestContext: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
  const tenantId = params.tenantId;
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const rows = (await sql<StaffCandidate>`select c.tenant_id,c.user_id,c.standing,p.display_name,s.status as staff_status,s.role as staff_role
          from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id)
          left join public.tenant_staff_assignments s using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.standing='approved' and exists(select from public.tenant_staff_assignments a
            join public.tenants t on t.id=a.tenant_id where a.tenant_id=c.tenant_id and a.user_id=${requestContext.actorId}
            and a.status='active' and a.can_grant_staff and t.operational_status='active')
            and app_private.auth_identity_eligible(c.user_id,false)
            and (${query.after ?? null}::uuid is null or c.user_id>${query.after ?? null}::uuid)
          order by c.user_id limit 51`.execute(tx)).rows
    return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].user_id : null }
  })
}
function pendingRequests(db: AppDatabase, requestContext: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
  const actor = requestContext.actorId;
  const tenantId = params.tenantId;
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const rows = (await sql<CommunityRequest>`select r.id,r.kind,r.user_id,r.requested_at,c.revision,c.standing,c.first_approved_at,
          c.has_disciplinary_restriction,p.display_name from app_private.community_account_requests r
          join public.community_accounts c using(tenant_id,user_id) left join public.community_account_profiles p using(tenant_id,user_id)
          where r.tenant_id=${tenantId} and exists(select from public.tenant_staff_assignments s join public.tenants t on t.id=s.tenant_id
            where s.tenant_id=r.tenant_id and s.user_id=${actor} and s.status='active' and t.operational_status='active'
            and (s.can_approve_users or (s.can_discipline_users and r.kind='reactivation' and c.standing='inactive' and c.has_disciplinary_restriction)))
            and (${query.after ?? null}::uuid is null or r.id>${query.after ?? null}::uuid)
          order by r.id limit 51`.execute(tx)).rows
    return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].id : null }
  })
}

// Profiles and preferences
const communityProfileColumns = ['tenant_id', 'user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by'] as const
function readProfile(db: AppDatabase, requestContext: AuthenticatedContext, params: AccountParams) {
  const actor = requestContext.actorId;
  const tenantId = params.tenantId;
  const userId = params.userId;
  return withEligibleActorTransaction(db, requestContext, async tx => {
    // Resolve viewer, target, lifecycle and curated profile in one snapshot.
    const profile = await tx.selectFrom('community_account_profiles as p')
      .innerJoin('community_accounts as target', join => join
        .onRef('target.tenant_id', '=', 'p.tenant_id').onRef('target.user_id', '=', 'p.user_id'))
      .innerJoin('community_accounts as viewer', join => join
        .onRef('viewer.tenant_id', '=', 'p.tenant_id').on('viewer.user_id', '=', actor))
      .where('p.tenant_id', '=', tenantId).where('p.user_id', '=', userId)
      .innerJoin('tenants as t', 't.id', 'p.tenant_id')
      .innerJoinLateral(sql<{ blocked: boolean }>`(select exists(select from public.user_account_blocks b
        where (b.blocker_user_id,b.blocked_user_id) in ((${actor}::uuid,p.user_id),(p.user_id,${actor}::uuid))) as blocked)`.as('block_status'), join => join.onTrue())
      .leftJoinLateral(sql<CommunityProfile>`(select ${sql.join(communityProfileColumns.map(field => sql.ref(`p.${field}`)))}
        where not block_status.blocked)`.as('details'), join => join.onTrue())
      .where(sql<boolean>`((t.operational_status='active' and (
        (p.user_id=${actor} and viewer.standing='pending') or
        (viewer.standing in ('approved','suspended') and target.standing in ('approved','suspended','inactive'))))
        or (t.operational_status='archived' and exists(select from public.tenant_staff_assignments owner_staff
          join public.community_accounts owner_account using(tenant_id,user_id)
          where owner_staff.tenant_id=t.id and owner_staff.user_id=${actor}
            and owner_staff.role='owner' and owner_staff.status='active' and owner_account.standing='approved')))`)
      .select('block_status.blocked').selectAll('details').executeTakeFirst()
    if (!profile) return { status: 404 as const }
    const { blocked, ...details } = profile
    if (blocked) return { status: 200 as const, profile: { status: 'blocked' as const } }
    // The lateral projection emits all profile columns when blocked is false.
    return { status: 200 as const, profile: details as CommunityProfile }
  })
}
// Both self-edit helpers require an authenticated transaction scoped to tenant.
export async function ownCommunityProfile(tx: Tx, actor: string, tenant: string, input: CommunityProfileInput) {
  // Independent self edits have statement-time lifecycle checks and no tenant lock.
  const result = await sql`update public.community_account_profiles p set display_name=${input.display_name.trim()},bio=${input.bio?.trim() || null}
    where p.tenant_id=${tenant} and p.user_id=${actor} and exists(select from public.community_accounts c
      join public.tenants t on t.id=c.tenant_id where c.tenant_id=p.tenant_id and c.user_id=p.user_id
      and t.operational_status='active' and c.standing in ('pending','approved','suspended'))
    returning p.tenant_id`.execute(tx)
  if (!result.rows.length) throw new ApplicationError(404, 'missing')
  return { tenantId: tenant }
}
export async function ownCommunityPreferences(tx: Tx, actor: string, tenant: string, input?: Partial<CommunityPreferences>) {
  if (input) {
    // Account then preference is also the lifecycle writer's order. Do not take
    // a tenant lock: other members' independent saves must remain concurrent.
    const account = (await sql<AccountStanding>`select standing from public.community_accounts
      where tenant_id=${tenant} and user_id=${actor} for update`.execute(tx)).rows[0]
    if (!account) throw new ApplicationError(404, 'missing')
  }
  const fields = sql.join(communityPreferenceFields.map(field => sql.id(field)))
  const result = input
    ? await sql<CommunityPreferences>`update public.community_account_preferences set ${sql.join(Object.entries(input).map(([key, value]) => sql`${sql.id(key)}=${value}`))}
        where tenant_id=${tenant} and user_id=${actor} and exists(select from public.community_accounts c
          join public.tenants t on t.id=c.tenant_id
          where c.tenant_id=community_account_preferences.tenant_id and c.user_id=community_account_preferences.user_id
            and t.operational_status='active' and c.standing in ('pending','approved')) returning ${fields}`.execute(tx)
    : await sql<CommunityPreferences>`select ${fields} from public.community_account_preferences where tenant_id=${tenant} and user_id=${actor} and exists(select from public.tenants t
        where t.id=community_account_preferences.tenant_id and
        (t.operational_status='active' or exists(select from public.tenant_staff_assignments owner_staff
          join public.community_accounts owner_account using(tenant_id,user_id)
          where owner_staff.tenant_id=t.id and owner_staff.user_id=${actor}
            and owner_staff.role='owner' and owner_staff.status='active' and owner_account.standing='approved')))`.execute(tx)
  if (!result.rows[0]) throw new ApplicationError(404, 'missing')
  return result.rows[0]
}

// Configuration and copy
const detailFields = sql`id,slug,name,country_code,state_province,city,timezone,operational_status,created_at,updated_at,created_by,updated_by`
const settingsFields = sql`tenant_id,${sql.join(settingFields.map(key => sql.id(key)))},created_at,updated_at,created_by,updated_by`
const copyFields = sql`tenant_id,content_key,text_value,created_at,updated_at,created_by,updated_by`

export async function readConfigurationDetails(tx: Tx, actor: string, tenant: string): Promise<CommunityDetails> {
  const result = await sql<CommunityDetails>`select ${detailFields} from public.tenants t where t.id=${tenant}
    and exists(select from public.community_accounts viewer where viewer.tenant_id=t.id and viewer.user_id=${actor}
      and ((t.operational_status='active' and viewer.standing in ('approved','suspended'))
        or (t.operational_status='archived' and viewer.standing='approved' and exists(
          select from public.tenant_staff_assignments s where s.tenant_id=t.id and s.user_id=viewer.user_id
          and s.role='owner' and s.status='active'))))`.execute(tx)
  const row = result.rows[0]
  if (!row) throw new ApplicationError(404, 'missing')
  return row
}
export async function configurationDetails(tx: Tx, actor: string, tenant: string, input: Partial<CommunityDetailsInput>) {
  await authorizeConfigurationWrite(tx, actor, tenant, 'details')
  if (['name', 'country_code', 'timezone'].some(key => key in input && !String(input[key as keyof CommunityDetailsInput]).trim())) {
    throw new ApplicationError(400, 'invalid_details')
  }
  const entries = Object.entries(input).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value] as const)
  const changed = await sql`update public.tenants set ${sql.join(entries.map(([key, value]) => sql`${sql.id(key)}=${value}`))}
    where id=${tenant} and (${sql.join(entries.map(([key, value]) => sql`${sql.id(key)} is distinct from ${value}`), sql` or `)})`.execute(tx)
  if (changed.numAffectedRows) await appendCommunityAuditEvent({ tx, actor, tenant }, null, 'tenants.update')
  return (await sql<CommunityDetails>`select ${detailFields} from public.tenants where id=${tenant}`.execute(tx)).rows[0]
}
async function readConfigurationSettings(tx: Tx, actor: string, tenant: string): Promise<CommunitySettingsRecord> {
  const result = await sql<CommunitySettingsRecord>`select ${settingsFields} from public.tenant_settings settings
    where settings.tenant_id=${tenant} and exists(select from public.tenants t
      join public.community_accounts viewer on viewer.tenant_id=t.id
      where t.id=settings.tenant_id and viewer.user_id=${actor}
        and ((t.operational_status='active' and viewer.standing in ('approved','suspended'))
          or (t.operational_status='archived' and viewer.standing='approved' and exists(
            select from public.tenant_staff_assignments s where s.tenant_id=t.id and s.user_id=viewer.user_id
            and s.role='owner' and s.status='active'))))`.execute(tx)
  const row = result.rows[0]
  if (!row) throw new ApplicationError(404, 'missing')
  return row
}
export async function configurationSettings(tx: Tx, actor: string, tenant: string, input: Partial<CommunitySettings>) {
  await authorizeConfigurationWrite(tx, actor, tenant, 'settings')
  const entries = Object.entries(input)
  const changed = await sql`update public.tenant_settings set ${sql.join(entries.map(([key, value]) => sql`${sql.id(key)}=${value}`))}
    where tenant_id=${tenant} and (${sql.join(entries.map(([key, value]) => sql`${sql.id(key)} is distinct from ${value}`), sql` or `)})`.execute(tx)
  if (changed.numAffectedRows) await appendCommunityAuditEvent({ tx, actor, tenant }, null, 'tenant_settings.update')
  return (await sql<CommunitySettingsRecord>`select ${settingsFields} from public.tenant_settings where tenant_id=${tenant}`.execute(tx)).rows[0]
}
async function readConfigurationCopy(tx: Tx, actor: string, tenant: string): Promise<{ rows: CommunityCopy[] }> {
  // The left join represents an authorized community with no overrides by a null row.
  const { rows } = await sql<CommunityCopy | Record<keyof CommunityCopy, null>>`select o.* from public.tenants t
    left join lateral (select ${copyFields} from public.tenant_website_content_overrides where tenant_id=t.id) o on true
    where t.id=${tenant} and exists(select from public.community_accounts viewer
      where viewer.tenant_id=t.id and viewer.user_id=${actor}
        and ((t.operational_status='active' and viewer.standing in ('approved','suspended'))
          or (t.operational_status='archived' and viewer.standing='approved' and exists(
            select from public.tenant_staff_assignments s where s.tenant_id=t.id and s.user_id=viewer.user_id
            and s.role='owner' and s.status='active')))) order by o.content_key`.execute(tx)
  if (!rows.length) throw new ApplicationError(404, 'missing')
  return { rows: rows.filter(row => row.tenant_id !== null) }
}
export async function configurationCopy(tx: Tx, actor: string, tenant: string, change: CopyChange) {
  await authorizeConfigurationWrite(tx, actor, tenant, 'copy')
  if (change.text === undefined) {
    const deleted = await sql`delete from public.tenant_website_content_overrides where tenant_id=${tenant} and content_key=${change.key} returning content_key`.execute(tx)
    if (!deleted.rows.length) throw new ApplicationError(404, 'missing')
    await appendCommunityAuditEvent({ tx, actor, tenant }, null, 'tenant_website_content_overrides.delete', {}, undefined, change.key)
  } else {
    if (!change.text.trim() || Array.from(change.text).length > copySlots[change.key]) throw new ApplicationError(400, 'invalid_copy')
    const existing = await tx.selectFrom('tenant_website_content_overrides').select('text_value')
      .where('tenant_id', '=', tenant).where('content_key', '=', change.key).forUpdate().executeTakeFirst()
    const changed = await sql`insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value) values(${tenant},${change.key},${change.text})
      on conflict(tenant_id,content_key) do update set text_value=excluded.text_value
      where tenant_website_content_overrides.text_value is distinct from excluded.text_value`.execute(tx)
    if (changed.numAffectedRows) await appendCommunityAuditEvent({ tx, actor, tenant }, null,
      existing ? 'tenant_website_content_overrides.update' : 'tenant_website_content_overrides.insert', {}, undefined, change.key)
  }
  return { rows: (await sql<CommunityCopy>`select ${copyFields} from public.tenant_website_content_overrides where tenant_id=${tenant} order by content_key`.execute(tx)).rows }
}
// Configuration writes require tenant scope and fresh facts after the root lock.
async function authorizeConfigurationWrite(tx: Tx, actor: string, tenant: string, kind: ConfigurationKind) {
  const site = (await sql`select id from public.tenants where id=${tenant} for no key update`.execute(tx)).rows[0]
  if (!site) throw new ApplicationError(404, 'missing')
  const facts = await loadConfigurationFacts(tx, actor, tenant)
  requireCanEditConfiguration(facts, kind)
}

// Directories and account facts
// Directory/account reads use explicit tenant filters and API authorization.
const factsFields = ['tenant_id', 'user_id', 'standing', 'first_approved_at', 'has_disciplinary_restriction', 'created_at', 'updated_at', 'created_by', 'updated_by'] as const
async function readMemberDirectory(tx: Tx, actor: string, tenant: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<MemberDirectoryRow>> {
  const cursorScope = ['member-directory', actor, tenant], limit = Number(query.limit ?? 50)
  let after: string | null = null
  let cursorError: ApplicationError | undefined
  try {
    after = cursors.decode(cursorScope, query.cursor)
  } catch (error) {
    if (!(error instanceof ApplicationError) || error.message !== 'invalid_cursor') throw error
    cursorError = error
  }

  const page = await tx.selectFrom('tenants as t')
    .innerJoin('community_accounts as viewer', join => join.onRef('viewer.tenant_id', '=', 't.id').on('viewer.user_id', '=', actor))
    .where('t.id', '=', tenant).where('t.operational_status', '=', 'active').where('viewer.standing', 'in', ['approved', 'suspended'])
    .select(eb => jsonArrayFrom(eb.selectFrom('community_accounts as c')
      .leftJoin('community_account_profiles as p', join => join.onRef('p.tenant_id', '=', 'c.tenant_id').onRef('p.user_id', '=', 'c.user_id'))
      .leftJoin('tenant_staff_assignments as s', join => join.onRef('s.tenant_id', '=', 'c.tenant_id').onRef('s.user_id', '=', 'c.user_id'))
      .select([
        sql<MemberDirectoryRow['account']>`jsonb_build_object(${sql.join(factsFields.flatMap(key => [sql`${key}::text`, sql.ref('c.' + key)]))})`.as('account'),
        sql<MemberDirectoryRow['profile']>`case when p.user_id is not null then jsonb_build_object('display_name',p.display_name) end`.as('profile'),
        sql<MemberDirectoryRow['staff_role']>`case when c.standing='approved' and s.status='active' then s.role end`.as('staff_role'),
      ])
      .whereRef('c.tenant_id', '=', 't.id').where('c.standing', 'in', ['approved', 'suspended'])
      .$if(after !== null, q => q.where('c.user_id', '>', after!))
      .orderBy('c.user_id').limit(cursorError ? 0 : limit + 1)).as('rows'))
    .executeTakeFirst()
  // Preserve the member route's 404 before reporting a malformed cursor.
  if (!page) throw new ApplicationError(404, 'missing')
  if (cursorError) throw cursorError
  const { rows } = page
  const visible = rows.slice(0, limit), last = visible.at(-1)
  return { rows: visible, next: rows.length > limit && last ? cursors.encode(cursorScope, last.account.user_id) : null }
}
export async function listOwnerAccounts(tx: Tx, actor: string, tenant: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<AccountFacts>> {
  const scope = ['owner-accounts', actor, tenant], limit = Number(query.limit ?? 50)
  let after: string | null = null
  let cursorError: ApplicationError | undefined
  try {
    after = cursors.decode(scope, query.cursor)
  } catch (error) {
    if (!(error instanceof ApplicationError) || error.message !== 'invalid_cursor') throw error
    cursorError = error
  }

  const selected = await tx.selectFrom('tenants as t')
    .innerJoin('community_accounts as viewer', join => join.onRef('viewer.tenant_id', '=', 't.id').on('viewer.user_id', '=', actor))
    .innerJoin('tenant_staff_assignments as staff', join => join.onRef('staff.tenant_id', '=', 'viewer.tenant_id').onRef('staff.user_id', '=', 'viewer.user_id'))
    .where('t.id', '=', tenant).where('viewer.standing', '=', 'approved')
    .where('staff.role', '=', 'owner').where('staff.status', '=', 'active')
    .leftJoinLateral(eb => eb.selectFrom('community_accounts as c')
      .select(factsFields.map(field => `c.${field}` as const))
      .whereRef('c.tenant_id', '=', 't.id')
      .$if(after !== null, q => q.where('c.user_id', '>', after!))
      .orderBy('c.user_id').limit(cursorError ? 0 : limit + 1)
      .$narrowType<Pick<AccountFacts, 'standing'>>().as('page'), join => join.onTrue())
    .selectAll('page').orderBy('page.user_id').execute()
  // An authorized empty page has one null row. Keep the 404 ahead of cursor errors.
  if (!selected.length) throw new ApplicationError(404, 'missing')
  if (cursorError) throw cursorError
  const rows = selected.filter((row): row is AccountFacts => row.user_id !== null)
  const visible = rows.slice(0, limit), last = visible.at(-1)
  return { rows: visible, next: rows.length > limit && last ? cursors.encode(scope, last.user_id) : null }
}
export async function readAccountFacts(tx: Tx, actor: string, tenant: string, target: string): Promise<AccountFacts> {
  const row = await tx.selectFrom('community_accounts as c')
    .innerJoin('tenants as t', 't.id', 'c.tenant_id')
    .innerJoin('community_accounts as viewer', join => join.onRef('viewer.tenant_id', '=', 't.id').on('viewer.user_id', '=', actor))
    .leftJoin('tenant_staff_assignments as staff', join => join.onRef('staff.tenant_id', '=', 'viewer.tenant_id').onRef('staff.user_id', '=', 'viewer.user_id'))
    .where('c.tenant_id', '=', tenant).where('c.user_id', '=', target)
    .where(eb => eb.or([
      eb.and([eb('viewer.standing', '=', 'approved'), eb('staff.role', '=', 'owner'), eb('staff.status', '=', 'active')]),
      eb.and([eb('t.operational_status', '=', 'active'), eb.or([
        eb.val(target === actor),
        eb.and([eb('viewer.standing', 'in', ['approved', 'suspended']), eb('c.standing', 'in', ['approved', 'suspended', 'inactive'])]),
      ])]),
    ]))
    .select(factsFields.map(field => `c.${field}` as const))
    .$narrowType<Pick<AccountFacts, 'standing'>>().executeTakeFirst()
  if (!row) throw new ApplicationError(404, 'missing')
  return row
}

// Staff and participant permissions
const recordMetadataColumns = ['tenant_id', 'user_id', 'created_at', 'updated_at', 'created_by', 'updated_by']
const recordTables = { staff: 'public.tenant_staff_assignments', participant: 'public.community_account_permissions' }
const columns = {
  staff: [...recordMetadataColumns, 'role', 'status', ...staffFlags],
  participant: [...recordMetadataColumns, 'can_post_public_events'],
}
async function readAccountRecord<K extends RecordKind>(tx: Tx, actor: string, tenant: string, kind: K, target: string): Promise<Records[K]> {
  // Keep the exact route and verified identity strings for self-access.
  const row = (await sql<Records[K]>`
    select ${sql.join(columns[kind].map(key => sql.ref(`r.${key}`)))}
    from ${sql.table(recordTables[kind])} r
    join public.tenants t on t.id=r.tenant_id
    left join public.community_accounts viewer on viewer.tenant_id=t.id and viewer.user_id=${actor}
    left join public.tenant_staff_assignments staff on staff.tenant_id=t.id and staff.user_id=${actor}
    where r.tenant_id=${tenant} and r.user_id=${target}
      and ((t.operational_status='active' and ${target}::text=${actor}::text)
        or (viewer.standing='approved' and staff.status='active'
          and ${sql.ref(kind === 'staff' ? 'staff.can_grant_staff' : 'staff.can_manage_community_permissions')}
          and (t.operational_status='active' or staff.role='owner')))
  `.execute(tx)).rows[0]
  if (!row) throw new ApplicationError(404, 'missing')
  return row
}
async function listAccountRecords<K extends RecordKind>(tx: Tx, actor: string, tenant: string, kind: K, query: RecordQuery): Promise<RecordPage<Records[K]>> {
  const scope = [actor, tenant, kind]
  let position: string | null = null
  let invalidCursor = false
  if (query.cursor) {
    try {
      const value: unknown = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'))
      if (!Array.isArray(value) || value.length !== 4 || JSON.stringify(value.slice(0, 3)) !== JSON.stringify(scope)
        || typeof value[3] !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value[3])) throw new Error()
      position = value[3]
    } catch { invalidCursor = true }
  }
  const limit = query.limit ? Number(query.limit) : 50
  // The lateral join retains native timestamp values and a null row for an authorized empty page.
  const page = (await sql<Records[K] | { user_id: null }>`
    select page.*
    from public.tenants t
    join public.community_accounts viewer on viewer.tenant_id=t.id and viewer.user_id=${actor}
    join public.tenant_staff_assignments staff on staff.tenant_id=t.id and staff.user_id=${actor}
    left join lateral (
      select ${sql.join(columns[kind].map(key => sql.ref(`r.${key}`)))}
      from ${sql.table(recordTables[kind])} r
      where r.tenant_id=t.id and (${position}::uuid is null or r.user_id>${position}::uuid)
      order by r.user_id limit ${invalidCursor ? 0 : limit + 1}
    ) page on true
    where t.id=${tenant} and viewer.standing='approved' and staff.status='active'
      and ${sql.ref(kind === 'staff' ? 'staff.can_grant_staff' : 'staff.can_manage_community_permissions')}
      and (t.operational_status='active' or staff.role='owner')
    order by page.user_id
  `.execute(tx)).rows
  // Only an authorized requester gets an empty page or a cursor error.
  if (!page.length) throw new ApplicationError(404, 'missing')
  if (invalidCursor) throw new ApplicationError(400, 'invalid_cursor')
  const rows = page.filter(row => row.user_id !== null)
  const visible = rows.slice(0, limit), last = visible.at(-1)
  return { rows: visible, next: rows.length > limit && last ? Buffer.from(JSON.stringify([...scope, last.user_id])).toString('base64url') : null }
}
export async function setParticipantPermission(tx: Tx, actor: string, tenant: string, target: string, enabled: boolean) {
  const site = (await sql`select id from public.tenants where id=${tenant} for no key update`.execute(tx)).rows[0]
  if (!site) throw new ApplicationError(404, 'missing')
  requireCanManageParticipantPermissions(await loadAccountRecordFacts(tx, actor, tenant))
  const before = (await sql<Records['participant']>`select ${sql.join(columns.participant.map(key => sql.id(key)))} from public.community_account_permissions
    where tenant_id=${tenant} and user_id=${target} for update`.execute(tx)).rows[0]
  if (!before) throw new ApplicationError(404, 'missing')
  if (before.can_post_public_events === enabled) return before
  const changed = (await sql<Records['participant']>`update public.community_account_permissions set can_post_public_events=${enabled}
    where tenant_id=${tenant} and user_id=${target} returning ${sql.join(columns.participant.map(key => sql.id(key)))}`.execute(tx)).rows[0]
  if (!changed) throw new ApplicationError(404, 'missing')
  await appendCommunityAuditEvent({ tx, actor, tenant }, target, 'community_permissions_changed',
    { before: before.can_post_public_events, after: changed.can_post_public_events })
  return changed
}

// Audit history
// History reads use explicit tenant filters and API authorization.
function history(db: AppDatabase, requestContext: AuthenticatedContext, params: TenantParams, query: HistoryQuery) {
  return withEligibleActorTransaction(db, requestContext, tx => accountHistory(tx, requestContext.actorId, params.tenantId, query))
}
function cursorScope(actor: string, tenant: string, query: HistoryQuery) {
  return [actor, tenant, query.target ?? null, query.category ?? null]
}
function decodeCursor(actor: string, tenant: string, query: HistoryQuery): Position | null {
  if (!query.cursor || query.eventId) return null
  try {
    const value: unknown = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'))
    if (!Array.isArray(value) || value.length !== 6
      || JSON.stringify(value.slice(0, 4)) !== JSON.stringify(cursorScope(actor, tenant, query))
      || typeof value[4] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value[4])
      || value[4].startsWith('0000-')
      || !Number.isFinite(Date.parse(value[4]))
      || new Date(value[4]).toISOString().slice(0, 19) !== value[4].slice(0, 19)
      || typeof value[5] !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value[5])) {
      throw new Error('Invalid cursor')
    }
    return { time: value[4], id: value[5] }
  } catch { throw new ApplicationError(400, 'invalid_cursor') }
}
async function accountHistory(tx: Tx, actor: string, tenant: string, query: HistoryQuery): Promise<HistoryPage> {
  const position = decodeCursor(actor, tenant, query)
  const limit = query.eventId ? 1 : Number(query.limit ?? 50)
  const rows = (await sql<HistoryEntry>`
    select a.id,a.tenant_id,a.action,a.target_user_id,a.content_key,
      to_char(a.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at,
      a.created_by,a.operation_id,a.reason,a.details,
      array(select c.category from app_private.tenant_admin_action_categories c where c.action_id=a.id order by c.category) as categories
    from public.tenant_admin_actions a
    join (${selectHistoryViewerFacts(tx, actor)}) viewer on viewer.tenant_id=a.tenant_id
    where a.tenant_id=${tenant}
      and viewer.standing='approved' and viewer.status='active'
      and (viewer.role='owner' or (viewer.operational_status='active' and exists(
        select from app_private.tenant_admin_action_categories c where c.action_id=a.id
        and ((c.category='community_account' and viewer.can_audit_community_accounts)
          or (c.category='staff_account' and viewer.can_audit_staff_accounts)))))
      and (${query.target ?? null}::uuid is null or a.target_user_id=${query.target ?? null}::uuid)
      and (${query.eventId ?? null}::uuid is null or a.id=${query.eventId ?? null}::uuid)
      and (${query.category ?? null}::text is null or exists(select from app_private.tenant_admin_action_categories c
        where c.action_id=a.id and c.category=${query.category ?? null}))
      and (${position?.time ?? null}::timestamptz is null or (a.created_at,a.id)<(${position?.time ?? null}::timestamptz,${position?.id ?? null}::uuid))
    order by a.created_at desc,a.id desc limit ${query.eventId ? 1 : limit + 1}
  `.execute(tx)).rows
  const visible = rows.slice(0, limit), last = visible.at(-1)
  const next = rows.length > limit && last
    ? Buffer.from(JSON.stringify([...cursorScope(actor, tenant, query), last.created_at, last.id])).toString('base64url') : null
  return { rows: visible, next }
}

// Community-owned adapter for the explicitly retained archived-card projection.
// The database function binds the caller; personal summary filtering stays with
// user accounts. Returning a query keeps admission and projection in one statement.
export function myCommunityRelationships(tx: Tx) {
  return tx.selectFrom(sql<CommunityRelationship>`app_private.my_community_relationships()`.as('r'))
}
