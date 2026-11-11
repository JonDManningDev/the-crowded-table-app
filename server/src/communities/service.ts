import { randomUUID } from 'node:crypto'
import { publicCommunityLandingAudience, loadPublicDirectoryFacts, requireCanReadPublicDirectory, publicCommunityDirectoryTargetAudience, loadCreateCommunityFacts, requireCanCreateCommunity, loadCommunityActionFacts,
  loadLifecycleAccountFacts, loadStaffAssignmentFacts, loadCommunityRequestFacts,
  requireCanEnterCommunityAction, requireCanSelectCommunityRequest, requireCanTargetCommunityAccount,
  requireCanApproveCommunityRequest, requireCanReturnToCommunity, loadJoinCommunityFacts, decideCommunityEntry,
  requireCanChangeCommunityStanding, loadStaffGrantFacts, requireCanManageCommunityStaff,
  ownCommunityRequestAudience, communityAccountReviewAudience, communityStaffCandidateAudience,
  communityPendingRequestAudience, loadConfigurationFacts, requireCanReadConfiguration, requireCanEditConfiguration,
  loadAccountRecordFacts, requireCanReadAccountRecord, requireCanManageAccountRecords,
  requireCanListCommunityAccounts, requireCanReadCommunityAccountFacts, communityAccountFactsTargetAudience,
  loadHistoryFacts, communityHistoryAudience, communityProfileSourceAudience, ownCommunityProfileEditAudience,
  ownCommunityPreferencesReadAudience, ownCommunityPreferencesEditAudience, loadMemberDirectoryFacts,
  requireCanReadMemberDirectory, communityMemberDirectoryTargetAudience, type Account, type Staff, type Pending } from './policies.ts'
import { sql } from 'kysely'
import { type AppDatabase, withEligibleActorTransaction, withTransactionRetry, type AuthenticatedContext } from '../database.ts'
import { ApplicationError } from '../http-errors.ts'
import type { DirectoryCursors } from '../directory-cursors.ts'
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
  type CommunityProfileInput,
  type DirectoryPage,
  type DirectoryQuery,
  type MemberDirectoryRow,
  type PublicDirectoryRow,
  staffFlags,
  type CommunityCommand,
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
  type Context,
  type Action,
  type OperationalStatus,
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
    listStandings() {
      return withTransactionRetry(db, tx => tx.selectFrom('community_standing').select(standingFields).orderBy('standing').execute())
    },
    readLanding(params: SlugParams) {
      return readCommunityLanding(db, params.slug)
    },
    publicDirectory(params: SlugParams, query: DirectoryQuery) {
      return withTransactionRetry(db, tx => readPublicDirectory(tx, params.slug, query, cursors))
    },
    // Creation and lifecycle
    createCommunity(context: AuthenticatedContext, input: CreateCommunityInput) {
      return withEligibleActorTransaction(db, context, tx => createCommunity(tx, context.actorId, input))
    },
    executeCommand(context: AuthenticatedContext, params: TenantParams, input: CommunityCommand) {
      return withEligibleActorTransaction(db, context, tx => communityCommand(tx, context.actorId, params.tenantId, input))
    },
    // Requests and reviews
    ownRequest(context: AuthenticatedContext, params: TenantParams) {
      return ownRequest(db, context, params)
    },
    reviewAccount(context: AuthenticatedContext, params: ReviewParams) {
      return reviewAccount(db, context, params)
    },
    staffCandidates(context: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
      return staffCandidates(db, context, params, query)
    },
    pendingRequests(context: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
      return pendingRequests(db, context, params, query)
    },
    // Profiles and preferences
    readProfile(context: AuthenticatedContext, params: AccountParams) {
      return readProfile(db, context, params)
    },
    saveOwnProfile(context: AuthenticatedContext, params: TenantParams, input: CommunityProfileInput) {
      return run(db, context, tx => ownCommunityProfile(tx, context.actorId, params.tenantId, input))
    },
    readOwnPreferences(context: AuthenticatedContext, params: TenantParams) {
      return run(db, context, tx => ownCommunityPreferences(tx, context.actorId, params.tenantId))
    },
    saveOwnPreferences(context: AuthenticatedContext, params: TenantParams, input: Partial<CommunityPreferences>) {
      return run(db, context, tx => ownCommunityPreferences(tx, context.actorId, params.tenantId, input))
    },
    // Configuration and copy
    readDetails(context: AuthenticatedContext, params: TenantParams) {
      return run(db, context, tx => configurationDetails(tx, context.actorId, params.tenantId))
    },
    saveDetails(context: AuthenticatedContext, params: TenantParams, input: Partial<CommunityDetailsInput>) {
      return run(db, context, tx => configurationDetails(tx, context.actorId, params.tenantId, input))
    },
    readSettings(context: AuthenticatedContext, params: TenantParams) {
      return run(db, context, tx => configurationSettings(tx, context.actorId, params.tenantId))
    },
    saveSettings(context: AuthenticatedContext, params: TenantParams, input: Partial<CommunitySettings>) {
      return run(db, context, tx => configurationSettings(tx, context.actorId, params.tenantId, input))
    },
    readCopy(context: AuthenticatedContext, params: TenantParams) {
      return run(db, context, tx => configurationCopy(tx, context.actorId, params.tenantId))
    },
    saveCopy(context: AuthenticatedContext, params: CopyParams, input: CopyInput) {
      return run(db, context, tx => configurationCopy(tx, context.actorId, params.tenantId, { key: params.contentKey, text: input.text_value }))
    },
    deleteCopy(context: AuthenticatedContext, params: CopyParams) {
      return run(db, context, tx => configurationCopy(tx, context.actorId, params.tenantId, { key: params.contentKey }))
    },
    // Directories and account facts
    memberDirectory(context: AuthenticatedContext, params: TenantParams, query: DirectoryQuery) {
      return run(db, context, tx => readMemberDirectory(tx, context.actorId, params.tenantId, query, cursors))
    },
    ownerAccounts(context: AuthenticatedContext, params: TenantParams, query: DirectoryQuery) {
      return run(db, context, tx => listOwnerAccounts(tx, context.actorId, params.tenantId, query, cursors))
    },
    accountFacts(context: AuthenticatedContext, params: AccountParams) {
      return run(db, context, tx => readAccountFacts(tx, context.actorId, params.tenantId, params.userId))
    },
    // Staff and participant permissions
    listStaff(context: AuthenticatedContext, params: TenantParams, query: RecordQuery) {
      return run(db, context, tx => listAccountRecords(tx, context.actorId, params.tenantId, 'staff', query))
    },
    readStaff(context: AuthenticatedContext, params: AccountParams) {
      return run(db, context, tx => readAccountRecord(tx, context.actorId, params.tenantId, 'staff', params.userId))
    },
    listParticipantPermissions(context: AuthenticatedContext, params: TenantParams, query: RecordQuery) {
      return run(db, context, tx => listAccountRecords(tx, context.actorId, params.tenantId, 'participant', query))
    },
    readParticipantPermissions(context: AuthenticatedContext, params: AccountParams) {
      return run(db, context, tx => readAccountRecord(tx, context.actorId, params.tenantId, 'participant', params.userId))
    },
    saveParticipantPermissions(context: AuthenticatedContext, params: AccountParams, input: ParticipantPermissionInput) {
      return run(db, context, tx => setParticipantPermission(tx, context.actorId, params.tenantId, params.userId, input.can_post_public_events))
    },
    // Audit history
    history(context: AuthenticatedContext, params: TenantParams, query: HistoryQuery) {
      return history(db, context, params, query)
    }
  }
}

// Public access and standing
const standingFields = ['standing', 'enable_standard_chat_visibility', 'enable_standard_activity_visibility', 'enable_other_profile_visibility', 'enable_own_profile_management', 'enable_standard_participation', 'enable_standard_dms'] as const
async function lockPublicCommunity(tx: Tx, slug: string) {
  await sql`select set_config('ct.public_slug', ${slug}, true)`.execute(tx)
  const site = await tx.selectFrom('tenants').select('id').where('slug', '=', slug).forShare().executeTakeFirst()
  if (site) await sql`select set_config('ct.public_tenant_id', ${site.id}, true)`.execute(tx)
  return site
}
async function readCommunityLanding(db: AppDatabase, slug: string): Promise<CommunityLanding | undefined> {
  return withTransactionRetry(db, async tx => {
    const site = await lockPublicCommunity(tx, slug)
    if (!site) return undefined
    return tx.selectFrom('tenants as t').innerJoin('tenant_settings as s', 's.tenant_id', 't.id')
      .select(['t.id', 't.slug', 't.name', 't.country_code', 't.state_province', 't.city', 't.timezone',
        's.auto_approve_users', 's.allow_public_chat_visibility', 's.allow_public_activity_visibility', 's.allow_public_directory_visibility'])
      .select(sql<PublicCopy[]>`coalesce((select jsonb_agg(jsonb_build_object(
        'tenant_id',o.tenant_id,'content_key',o.content_key,'text_value',o.text_value) order by o.content_key)
        from public.tenant_website_content_overrides o where o.tenant_id=t.id
        and o.content_key in (${sql.join(Object.keys(copySlots))})), '[]'::jsonb)`.as('overrides'))
      .where('t.id', '=', site.id).where(publicCommunityLandingAudience()).executeTakeFirst()
  })
}
export async function readPublicDirectory(tx: Tx, slug: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<PublicDirectoryRow>> {
  const scope = ['public-directory', slug], after = cursors.decode(scope, query.cursor), limit = Number(query.limit ?? 50)
  const site = await lockPublicCommunity(tx, slug)
  if (!site) throw new ApplicationError(404, 'missing')
  requireCanReadPublicDirectory(await loadPublicDirectoryFacts(tx, site.id))
  const rows = await tx.selectFrom('community_accounts as c')
    .innerJoin('community_account_profiles as p', join => join.onRef('p.tenant_id', '=', 'c.tenant_id').onRef('p.user_id', '=', 'c.user_id'))
    .leftJoin('tenant_staff_assignments as s', join => join.onRef('s.tenant_id', '=', 'c.tenant_id').onRef('s.user_id', '=', 'c.user_id'))
    .select(['c.user_id', 'p.display_name'])
    .select(sql<PublicDirectoryRow['staff_role']>`case when c.standing='approved' and s.status='active' then s.role end`.as('staff_role'))
    .where('c.tenant_id', '=', site.id).where(publicCommunityDirectoryTargetAudience())
    .$if(after !== null, q => q.where('c.user_id', '>', after!))
    .orderBy('c.user_id').limit(limit + 1).execute()
  const visible = rows.slice(0, limit), last = visible.at(-1)
  return {
    rows: visible.map(({ display_name, staff_role }) => ({ display_name, staff_role })),
    next: rows.length > limit && last ? cursors.encode(scope, last.user_id) : null
  }
}

// Creation and lifecycle
function stale(): never { throw new ApplicationError(409, 'stale_state') }
async function scope(tx: Tx, tenant: string) {
  await sql`select set_config('ct.tenant_id', ${tenant}, true)`.execute(tx)
}
async function event({ tx, tenant }: Context, user: string | null, action: string,
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
async function setStanding({ tx, tenant }: Context, user: string, standing: Account['standing'], restricted = false) {
  if (standing === 'inactive') {
    // The caller holds the account row. Clear consent explicitly before changing
    // standing; PostgreSQL validates the final state without doing this workflow.
    await sql`update public.community_account_preferences set show_global_profile=false
      where tenant_id=${tenant} and user_id=${user} and show_global_profile`.execute(tx)
  }
  await sql`update public.community_accounts set standing=${standing},has_disciplinary_restriction=${restricted}
    where tenant_id=${tenant} and user_id=${user}`.execute(tx)
}
async function addAccount(c: Context, standing: 'approved' | 'pending', profile: CuratedProfile) {
  const { tx, tenant, actor } = c
  await sql`insert into public.community_accounts(tenant_id,user_id,standing) values(${tenant},${actor},${standing})`.execute(tx)
  await sql`insert into public.community_account_profiles(tenant_id,user_id,display_name,bio)
    values(${tenant},${actor},${profile.displayName.trim()},${profile.bio?.trim() || null})`.execute(tx)
  await sql`insert into public.community_account_preferences(tenant_id,user_id) values(${tenant},${actor})`.execute(tx)
  await sql`insert into public.community_account_permissions(tenant_id,user_id) values(${tenant},${actor})`.execute(tx)
}
export async function createCommunity(tx: Tx, actor: string, input: CreateCommunityInput): Promise<CommandResult> {
  requireCanCreateCommunity(await loadCreateCommunityFacts(tx, actor))
  const tenant = randomUUID(), c = { tx, actor, tenant }
  await scope(tx, tenant)
  await sql`insert into public.tenants(id,name,slug,country_code,timezone,state_province,city)
    values(${tenant},${input.name.trim()},${input.slug},${input.country},${input.timezone},${input.region.trim() || null},${input.city.trim() || null})`.execute(tx)
  await sql`insert into public.tenant_settings(tenant_id) values(${tenant})`.execute(tx)
  await event(c, null, 'tenants.insert')
  await event(c, null, 'tenant_settings.insert')
  await addAccount(c, 'approved', input.profile)
  await sql`insert into public.tenant_staff_assignments(tenant_id,user_id,role,${sql.join(staffFlags.map(key => sql.id(key)))})
    values(${tenant},${actor},'owner',${sql.join(staffFlags.map(() => sql`true`))})`.execute(tx)
  await event(c, actor, 'community_approved', { after_standing: 'approved' })
  await event(c, actor, 'staff_created', { after_status: 'active' })
  return { outcome: 'created', tenantId: tenant }
}
async function request(c: Context, kind: Pending['kind']) {
  const { tx, tenant, actor } = c
  const id = randomUUID()
  await sql`insert into app_private.community_account_requests(id,tenant_id,user_id,requested_by,kind)
    values(${id},${tenant},${actor},${actor},${kind})`.execute(tx)
  await event(c, actor, kind === 'join' ? 'community_join_requested' : 'community_reactivation_requested', { request_id: id })
  return id
}
async function closeRequest({ tx, tenant }: Context, user: string) {
  return (await sql<Pending>`delete from app_private.community_account_requests where tenant_id=${tenant}
    and user_id=${user} returning id,kind,user_id`.execute(tx)).rows[0]
}
async function setStaffStatus(c: Context, user: string, before: Staff['status'], after: Staff['status'], action: string, reason?: string) {
  await sql`update public.tenant_staff_assignments set status=${after} where tenant_id=${c.tenant} and user_id=${user}`.execute(c.tx)
  await event(c, user, action, { before_status: before, after_status: after }, reason)
}
function result(c: Context, outcome: string): CommandResult { return { outcome, tenantId: c.tenant } }
async function joinOrReturn(c: Context, member: Account | undefined, cmd: Action<'join' | 'reactivate'>) {
  const { tx, tenant, actor } = c
  if (cmd.kind === 'join' && member) return result(c, member.standing === 'inactive' ? 'reactivation_required' : 'already_applied')
  requireCanReturnToCommunity(member, cmd.kind)
  const facts = await loadJoinCommunityFacts(tx, tenant, actor, member?.restricted ?? false)
  const decision = decideCommunityEntry(member, facts)
  if (decision.kind === 'review') {
    if (decision.requestId) return { ...result(c, 'review_requested'), requestId: decision.requestId }
    await setStanding(c, actor, 'inactive', true)
    return { ...result(c, 'review_requested'), requestId: await request(c, 'reactivation') }
  }
  const standing = decision.standing
  if (cmd.kind === 'join') await addAccount(c, standing, cmd.profile)
  else await setStanding(c, actor, standing)
  if (standing === 'pending') return { ...result(c, standing), requestId: await request(c, 'join') }
  await event(c, actor, member?.approved ? 'community_reactivated' : 'community_approved', { after_standing: standing })
  return result(c, standing)
}
async function changeStanding(c: Context, user: string, member: Account, assignment: Staff | undefined,
  effective: Staff | undefined, cmd: Action<'deactivate' | 'suspend' | 'remove' | 'clear'>) {
  requireCanChangeCommunityStanding({ account: member, assignment, actorStaff: effective }, cmd.kind)
  if ((cmd.kind === 'deactivate' && member.standing === 'inactive') || (cmd.kind === 'suspend' && member.standing === 'suspended')
    || (cmd.kind === 'remove' && member.standing === 'inactive' && member.restricted)) return result(c, 'already_applied')
  const after = cmd.kind === 'suspend' ? 'suspended' : cmd.kind === 'clear' && member.standing === 'suspended' ? 'approved' : 'inactive'
  const restricted = cmd.kind === 'deactivate' ? member.restricted : cmd.kind !== 'clear'
  const pending = await closeRequest(c, user)
  await setStanding(c, user, after, restricted)
  if (assignment?.status === 'active' && cmd.kind === 'deactivate') await setStaffStatus(c, user, 'active', 'paused', 'staff_paused')
  if (assignment && assignment.status !== 'revoked' && (cmd.kind === 'suspend' || cmd.kind === 'remove')) {
    await setStaffStatus(c, user, assignment.status, 'revoked', 'staff_revoked')
  }
  const action = { deactivate: 'community_deactivated', suspend: 'community_suspended', remove: 'community_removed', clear: 'community_restriction_cleared' }[cmd.kind]
  await event(c, user, action, {
    before_standing: member.standing, after_standing: after, before_restricted: member.restricted,
    after_restricted: restricted, ...(pending && { request_id: pending.id })
  }, 'reason' in cmd ? cmd.reason : undefined)
  return result(c, action)
}
async function changeAssignment(c: Context, user: string, member: Account, assignment: Staff | undefined,
  owner: boolean, cmd: Action<'grant' | 'resume' | 'revoke' | 'permissions' | 'reappoint'>) {
  const { tx, tenant, actor } = c
  const grant = cmd.kind === 'grant' ? await loadStaffGrantFacts(tx, user, member, assignment) : { authEligible: false }
  requireCanManageCommunityStaff({ account: member, assignment, owner, actor, target: user, ...grant }, cmd)
  if (cmd.kind === 'grant') {
    await sql`insert into public.tenant_staff_assignments(tenant_id,user_id,role) values(${tenant},${user},'admin')`.execute(tx)
    await event(c, user, 'staff_created', { after_status: 'active' })
  } else if (cmd.kind === 'resume' || cmd.kind === 'revoke') {
    if (!assignment) stale()
    await setStaffStatus(c, user, assignment.status, cmd.kind === 'resume' ? 'active' : 'revoked',
      cmd.kind === 'resume' ? 'staff_resumed' : 'staff_revoked', 'reason' in cmd ? cmd.reason : undefined)
  } else if (cmd.kind === 'permissions' || cmd.kind === 'reappoint') {
    if (!assignment) stale()
    const keys = staffFlags.filter(key => Object.hasOwn(cmd.permissions, key))
    const changed = keys.filter(k => cmd.permissions[k] !== assignment[k])
    const sets = changed.map(k => sql`${sql.id(k)}=${cmd.permissions[k]}`)
    if (cmd.kind === 'reappoint') sets.push(sql`status='active'`)
    if (!sets.length) return result(c, 'already_applied')
    await sql`update public.tenant_staff_assignments set ${sql.join(sets)} where tenant_id=${tenant} and user_id=${user}`.execute(tx)
    await event(c, user, cmd.kind === 'reappoint' ? 'staff_reappointed' : 'staff_permissions_changed', {
      permissions: Object.fromEntries(changed.map(k => [k, { before: assignment[k], after: cmd.permissions[k] }])),
      ...(cmd.kind === 'reappoint' && { before_status: 'revoked', after_status: 'active' })
    })
  }
  // A staff change invalidates an earlier discipline preview for this target.
  await setStanding(c, user, member.standing, member.restricted)
  return result(c, 'saved')
}
export async function communityCommand(tx: Tx, actor: string, tenant: string, cmd: CommunityCommand): Promise<CommandResult> {
  const c = { tx, actor, tenant }
  await scope(tx, tenant)
  const facts = await loadCommunityActionFacts(tx, actor, tenant)
  requireCanEnterCommunityAction(facts, cmd)
  const effective = facts.assignment?.status === 'active' ? facts.assignment : undefined
  const owner = effective?.role === 'owner'
  if (cmd.kind === 'archive') {
    const status = cmd.archived ? 'archived' : 'active'
    if (facts.site?.operational_status === status) return result(c, 'already_applied')
    await sql`update public.tenants set operational_status=${status} where id=${tenant}`.execute(tx)
    await event(c, null, cmd.archived ? 'tenants.archive' : 'tenants.restore')
    return result(c, status)
  }
  let user = 'target' in cmd ? cmd.target : actor
  if (cmd.kind === 'approve' || cmd.kind === 'withdraw') {
    const current = await loadCommunityRequestFacts(tx, tenant, cmd.requestId)
    requireCanSelectCommunityRequest(current, actor, cmd.kind)
    user = current.user_id
  }
  const member = await loadLifecycleAccountFacts(tx, tenant, user)
  if (cmd.kind === 'join' || cmd.kind === 'reactivate') return joinOrReturn(c, member, cmd)
  const assignment = await loadStaffAssignmentFacts(tx, tenant, user)
  requireCanTargetCommunityAccount(member, assignment, cmd)
  if (cmd.kind === 'approve' || cmd.kind === 'withdraw') {
    const current = await closeRequest(c, user)
    if (!current || current.id !== cmd.requestId) stale()
    if (cmd.kind === 'approve') requireCanApproveCommunityRequest(member)
    if (current.kind === 'join') await setStanding(c, user, cmd.kind === 'approve' ? 'approved' : 'inactive')
    else await setStanding(c, user, 'inactive', true)
    const action = cmd.kind === 'approve' ? 'community_approved' : current.kind === 'join' ? 'community_join_withdrawn' : 'community_reactivation_withdrawn'
    await event(c, user, action, { request_id: current.id })
    return result(c, action)
  }
  if (cmd.kind === 'deactivate' || cmd.kind === 'suspend' || cmd.kind === 'remove' || cmd.kind === 'clear') {
    return changeStanding(c, user, member, assignment, effective, cmd)
  }
  return changeAssignment(c, user, member, assignment, owner, cmd)
}

// Requests and reviews
function ownRequest(db: AppDatabase, context: AuthenticatedContext, params: TenantParams) {
  const actor = context.actorId;
  const tenant = params.tenantId;
  return withEligibleActorTransaction<OwnCommunityRequestResponse | MissingRequest>(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    const row = (await sql<OwnCommunityRequestResponse>`select case when r.id is not null then
        jsonb_build_object('request_id',r.id,'kind',r.kind,'requested_at',r.requested_at) end as request
        from public.community_accounts c join public.tenants t on t.id=c.tenant_id
        left join app_private.community_account_requests r using(tenant_id,user_id)
        where c.tenant_id=${tenant} and ${ownCommunityRequestAudience(actor)}`.execute(tx)).rows[0]
    return row ?? { status: 404 as const }
  })
}
function reviewAccount(db: AppDatabase, context: AuthenticatedContext, params: ReviewParams) {
  const actor = context.actorId;
  const tenantId = params.tenantId;
  const target = params.target;
  return withEligibleActorTransaction(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
    const row = (await sql<AccountReview>`select c.standing,c.revision,case when c.user_id=${actor} then r.id end as request_id
          from public.community_accounts c join public.tenants t on t.id=c.tenant_id
          left join app_private.community_account_requests r using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.user_id=${target} and ${communityAccountReviewAudience(actor)}
          `.execute(tx)).rows[0]
    return row ? { row } : { status: 404 as const }
  })
}
function staffCandidates(db: AppDatabase, context: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
  const tenantId = params.tenantId;
  return withEligibleActorTransaction(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
    const rows = (await sql<StaffCandidate>`select c.tenant_id,c.user_id,c.standing,p.display_name,s.status as staff_status,s.role as staff_role
          from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id)
          left join public.tenant_staff_assignments s using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and ${communityStaffCandidateAudience(context.actorId)}
            and (${query.after ?? null}::uuid is null or c.user_id>${query.after ?? null}::uuid)
          order by c.user_id limit 51`.execute(tx)).rows
    return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].user_id : null }
  })
}
function pendingRequests(db: AppDatabase, context: AuthenticatedContext, params: TenantParams, query: AfterQuery) {
  const actor = context.actorId;
  const tenantId = params.tenantId;
  return withEligibleActorTransaction(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
    const rows = (await sql<CommunityRequest>`select r.id,r.kind,r.user_id,r.requested_at,c.revision,c.standing,c.first_approved_at,
          c.has_disciplinary_restriction,p.display_name from app_private.community_account_requests r
          join public.community_accounts c using(tenant_id,user_id) left join public.community_account_profiles p using(tenant_id,user_id)
          where r.tenant_id=${tenantId} and ${communityPendingRequestAudience(actor)}
            and (${query.after ?? null}::uuid is null or r.id>${query.after ?? null}::uuid)
          order by r.id limit 51`.execute(tx)).rows
    return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].id : null }
  })
}

// Profiles and preferences
const communityProfileColumns = ['tenant_id', 'user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by'] as const
function readProfile(db: AppDatabase, context: AuthenticatedContext, params: AccountParams) {
  const actor = context.actorId;
  const tenantId = params.tenantId;
  const userId = params.userId;
  return withEligibleActorTransaction(db, context, async tx => {
    await scope(tx, tenantId)
    // Resolve viewer, target, lifecycle and curated profile in one snapshot.
    const profile = await tx.selectFrom('community_account_profiles as p')
      .innerJoin('community_accounts as target', join => join
        .onRef('target.tenant_id', '=', 'p.tenant_id').onRef('target.user_id', '=', 'p.user_id'))
      .innerJoin('community_accounts as viewer', join => join
        .onRef('viewer.tenant_id', '=', 'p.tenant_id').on('viewer.user_id', '=', actor))
      .where('p.tenant_id', '=', tenantId).where('p.user_id', '=', userId)
      .innerJoin('tenants as t', 't.id', 'p.tenant_id')
      .where(communityProfileSourceAudience(actor))
      .select(communityProfileColumns.map(field => `p.${field}` as const)).executeTakeFirst()
    return profile ? { status: 200 as const, profile } : { status: 404 as const }
  })
}
export async function ownCommunityProfile(tx: Tx, actor: string, tenant: string, input: CommunityProfileInput) {
  // Independent self edits have statement-time lifecycle checks and no tenant lock.
  await scope(tx, tenant)
  const result = await sql`update public.community_account_profiles p set display_name=${input.display_name.trim()},bio=${input.bio?.trim() || null}
    where p.tenant_id=${tenant} and ${ownCommunityProfileEditAudience(actor)}
    returning p.tenant_id`.execute(tx)
  if (!result.rows.length) throw new ApplicationError(404, 'missing')
  return { tenantId: tenant }
}
export async function ownCommunityPreferences(tx: Tx, actor: string, tenant: string, input?: Partial<CommunityPreferences>) {
  await scope(tx, tenant)
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
        where tenant_id=${tenant} and ${ownCommunityPreferencesEditAudience(actor)} returning ${fields}`.execute(tx)
    : await sql<CommunityPreferences>`select ${fields} from public.community_account_preferences where tenant_id=${tenant} and ${ownCommunityPreferencesReadAudience(actor)}`.execute(tx)
  if (!result.rows[0]) throw new ApplicationError(404, 'missing')
  return result.rows[0]
}

// Configuration and copy
const detailFields = sql`id,slug,name,country_code,state_province,city,timezone,operational_status,created_at,updated_at,created_by,updated_by`
const settingsFields = sql`tenant_id,${sql.join(settingFields.map(key => sql.id(key)))},created_at,updated_at,created_by,updated_by`
const copyFields = sql`tenant_id,content_key,text_value,created_at,updated_at,created_by,updated_by`
async function authorizeConfiguration(tx: Tx, actor: string, tenant: string, kind: ConfigurationKind, write: boolean) {
  await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
  // Management reads share the same root so their current authority cannot be
  // revoked between the check and the full-row projection.
  const site = (await sql`select id from public.tenants where id=${tenant} ${write ? sql`for update` : sql`for share`}`.execute(tx)).rows[0]
  if (!site) throw new ApplicationError(404, 'missing')
  const facts = await loadConfigurationFacts(tx, actor, tenant)
  if (write) requireCanEditConfiguration(facts, kind)
  else requireCanReadConfiguration(facts)
}
export async function configurationDetails(tx: Tx, actor: string, tenant: string, input?: Partial<CommunityDetailsInput>) {
  await authorizeConfiguration(tx, actor, tenant, 'details', Boolean(input))
  if (input) {
    if (['name', 'country_code', 'timezone'].some(key => key in input && !String(input[key as keyof CommunityDetailsInput]).trim())) {
      throw new ApplicationError(400, 'invalid_details')
    }
    const entries = Object.entries(input).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value] as const)
    const changed = await sql`update public.tenants set ${sql.join(entries.map(([key, value]) => sql`${sql.id(key)}=${value}`))}
      where id=${tenant} and (${sql.join(entries.map(([key, value]) => sql`${sql.id(key)} is distinct from ${value}`), sql` or `)})`.execute(tx)
    if (changed.numAffectedRows) await event({ tx, actor, tenant }, null, 'tenants.update')
  }
  return (await sql<CommunityDetails>`select ${detailFields} from public.tenants where id=${tenant}`.execute(tx)).rows[0]
}
export async function configurationSettings(tx: Tx, actor: string, tenant: string, input?: Partial<CommunitySettings>) {
  await authorizeConfiguration(tx, actor, tenant, 'settings', Boolean(input))
  if (input) {
    const entries = Object.entries(input)
    const changed = await sql`update public.tenant_settings set ${sql.join(entries.map(([key, value]) => sql`${sql.id(key)}=${value}`))}
      where tenant_id=${tenant} and (${sql.join(entries.map(([key, value]) => sql`${sql.id(key)} is distinct from ${value}`), sql` or `)})`.execute(tx)
    if (changed.numAffectedRows) await event({ tx, actor, tenant }, null, 'tenant_settings.update')
  }
  return (await sql<CommunitySettingsRecord>`select ${settingsFields} from public.tenant_settings where tenant_id=${tenant}`.execute(tx)).rows[0]
}
export async function configurationCopy(tx: Tx, actor: string, tenant: string, change?: CopyChange) {
  await authorizeConfiguration(tx, actor, tenant, 'copy', Boolean(change))
  if (change) {
    if (change.text === undefined) {
      const deleted = await sql`delete from public.tenant_website_content_overrides where tenant_id=${tenant} and content_key=${change.key} returning content_key`.execute(tx)
      if (!deleted.rows.length) throw new ApplicationError(404, 'missing')
      await event({ tx, actor, tenant }, null, 'tenant_website_content_overrides.delete', {}, undefined, change.key)
    } else {
      if (!change.text.trim() || Array.from(change.text).length > copySlots[change.key]) throw new ApplicationError(400, 'invalid_copy')
      const existing = await tx.selectFrom('tenant_website_content_overrides').select('text_value')
        .where('tenant_id', '=', tenant).where('content_key', '=', change.key).forUpdate().executeTakeFirst()
      const changed = await sql`insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value) values(${tenant},${change.key},${change.text})
        on conflict(tenant_id,content_key) do update set text_value=excluded.text_value
        where tenant_website_content_overrides.text_value is distinct from excluded.text_value`.execute(tx)
      if (changed.numAffectedRows) await event({ tx, actor, tenant }, null,
        existing ? 'tenant_website_content_overrides.update' : 'tenant_website_content_overrides.insert', {}, undefined, change.key)
    }
  }
  return { rows: (await sql<CommunityCopy>`select ${copyFields} from public.tenant_website_content_overrides where tenant_id=${tenant} order by content_key`.execute(tx)).rows }
}

// Directories and account facts
const factsFields = ['tenant_id', 'user_id', 'standing', 'first_approved_at', 'has_disciplinary_restriction', 'created_at', 'updated_at', 'created_by', 'updated_by']
const profileFields = ['tenant_id', 'user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by']
const jsonProjection = (alias: string, fields: string[]) => sql`jsonb_build_object(${sql.join(fields.flatMap(key => [sql`${key}::text`, sql.ref(alias + '.' + key)]))})`
export async function readMemberDirectory(tx: Tx, actor: string, tenant: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<MemberDirectoryRow>> {
  await scope(tx, tenant)
  if (!(await sql`select id from public.tenants where id=${tenant} for share`.execute(tx)).rows[0]) throw new ApplicationError(404, 'missing')
  requireCanReadMemberDirectory(await loadMemberDirectoryFacts(tx, actor, tenant))
  const cursorScope = ['member-directory', actor, tenant], after = cursors.decode(cursorScope, query.cursor), limit = Number(query.limit ?? 50)
  const rows = (await sql<MemberDirectoryRow>`select ${jsonProjection('c', factsFields)} as account,
    case when p.user_id is not null then ${jsonProjection('p', profileFields)} end as profile,
    case when c.standing='approved' and s.status='active' then s.role end as staff_role
    from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id)
    left join public.tenant_staff_assignments s using(tenant_id,user_id)
    where c.tenant_id=${tenant} and ${communityMemberDirectoryTargetAudience()} and (${after}::uuid is null or c.user_id>${after}::uuid)
    order by c.user_id limit ${limit + 1}`.execute(tx)).rows
  const visible = rows.slice(0, limit), last = visible.at(-1)
  return { rows: visible, next: rows.length > limit && last ? cursors.encode(cursorScope, last.account.user_id) : null }
}
export async function listOwnerAccounts(tx: Tx, actor: string, tenant: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<AccountFacts>> {
  const facts = await lockAccountFacts(tx, actor, tenant)
  requireCanListCommunityAccounts(facts)
  const scope = ['owner-accounts', actor, tenant], after = cursors.decode(scope, query.cursor), limit = Number(query.limit ?? 50)
  const rows = (await sql<AccountFacts>`select ${sql.join(factsFields.map(key => sql.id(key)))} from public.community_accounts
    where tenant_id=${tenant} and (${after}::uuid is null or user_id>${after}::uuid) order by user_id limit ${limit + 1}`.execute(tx)).rows
  const visible = rows.slice(0, limit), last = visible.at(-1)
  return { rows: visible, next: rows.length > limit && last ? cursors.encode(scope, last.user_id) : null }
}
export async function readAccountFacts(tx: Tx, actor: string, tenant: string, target: string): Promise<AccountFacts> {
  const facts = await lockAccountFacts(tx, actor, tenant)
  requireCanReadCommunityAccountFacts(facts, target === actor)
  const row = (await sql<AccountFacts>`select ${sql.join(factsFields.map(key => sql.id(key)))} from public.community_accounts
    where tenant_id=${tenant} and user_id=${target} and (${communityAccountFactsTargetAudience(facts, target === actor)})`.execute(tx)).rows[0]
  if (!row) throw new ApplicationError(404, 'missing')
  return row
}
async function lockAccountFacts(tx: Tx, actor: string, tenant: string) {
  await scope(tx, tenant)
  if (!(await sql`select id from public.tenants where id=${tenant} for share`.execute(tx)).rows[0]) throw new ApplicationError(404, 'missing')
  return loadAccountRecordFacts(tx, actor, tenant)
}

// Staff and participant permissions
const recordMetadataColumns = ['tenant_id', 'user_id', 'created_at', 'updated_at', 'created_by', 'updated_by']
const table = { staff: 'public.tenant_staff_assignments', participant: 'public.community_account_permissions' }
const columns = {
  staff: [...recordMetadataColumns, 'role', 'status', ...staffFlags],
  participant: [...recordMetadataColumns, 'can_post_public_events'],
}
async function authorizeRecords(tx: Tx, actor: string, tenant: string, kind: RecordKind, target?: string, write = false) {
  await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
  const site = (await sql`select id from public.tenants where id=${tenant} ${write ? sql`for update` : sql`for share`}`.execute(tx)).rows[0]
  if (!site) throw new ApplicationError(404, 'missing')
  const facts = await loadAccountRecordFacts(tx, actor, tenant)
  if (write) requireCanManageAccountRecords(facts, kind)
  else requireCanReadAccountRecord(facts, kind, target === actor)
}
export async function readAccountRecord<K extends RecordKind>(tx: Tx, actor: string, tenant: string, kind: K, target: string): Promise<Records[K]> {
  await authorizeRecords(tx, actor, tenant, kind, target)
  const row = (await sql<Records[K]>`select ${sql.join(columns[kind].map(key => sql.id(key)))} from ${sql.table(table[kind])}
    where tenant_id=${tenant} and user_id=${target}`.execute(tx)).rows[0]
  if (!row) throw new ApplicationError(404, 'missing')
  return row
}
export async function listAccountRecords<K extends RecordKind>(tx: Tx, actor: string, tenant: string, kind: K, query: RecordQuery): Promise<RecordPage<Records[K]>> {
  await authorizeRecords(tx, actor, tenant, kind)
  const scope = [actor, tenant, kind]
  let position: string | null = null
  if (query.cursor) {
    try {
      const value: unknown = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'))
      if (!Array.isArray(value) || value.length !== 4 || JSON.stringify(value.slice(0, 3)) !== JSON.stringify(scope)
        || typeof value[3] !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value[3])) throw new Error()
      position = value[3]
    } catch { throw new ApplicationError(400, 'invalid_cursor') }
  }
  const limit = query.limit ? Number(query.limit) : 50
  const rows = (await sql<Records[K]>`select ${sql.join(columns[kind].map(key => sql.id(key)))} from ${sql.table(table[kind])}
    where tenant_id=${tenant} and (${position}::uuid is null or user_id>${position}::uuid)
    order by user_id limit ${limit + 1}`.execute(tx)).rows
  const visible = rows.slice(0, limit), last = visible.at(-1)
  return { rows: visible, next: rows.length > limit && last ? Buffer.from(JSON.stringify([...scope, last.user_id])).toString('base64url') : null }
}
export async function setParticipantPermission(tx: Tx, actor: string, tenant: string, target: string, enabled: boolean) {
  await authorizeRecords(tx, actor, tenant, 'participant', target, true)
  const before = (await sql<Records['participant']>`select ${sql.join(columns.participant.map(key => sql.id(key)))} from public.community_account_permissions
    where tenant_id=${tenant} and user_id=${target} for update`.execute(tx)).rows[0]
  if (!before) throw new ApplicationError(404, 'missing')
  if (before.can_post_public_events === enabled) return before
  const changed = (await sql<Records['participant']>`update public.community_account_permissions set can_post_public_events=${enabled}
    where tenant_id=${tenant} and user_id=${target} returning ${sql.join(columns.participant.map(key => sql.id(key)))}`.execute(tx)).rows[0]
  if (!changed) throw new ApplicationError(404, 'missing')
  await event({ tx, actor, tenant }, target, 'community_permissions_changed',
    { before: before.can_post_public_events, after: changed.can_post_public_events })
  return changed
}

// Audit history
function history(db: AppDatabase, context: AuthenticatedContext, params: TenantParams, query: HistoryQuery) {
  const actor = context.actorId;
  return withEligibleActorTransaction(db, context, tx => accountHistory(tx, actor, params.tenantId, query))
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
export async function accountHistory(tx: Tx, actor: string, tenant: string, query: HistoryQuery): Promise<HistoryPage> {
  const position = decodeCursor(actor, tenant, query)
  await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
  // Every command takes this row FOR UPDATE. Acquire it before reading the
  // staff flags, so a committed archive or revocation governs this request.
  const site = (await sql<OperationalStatus>`select operational_status from public.tenants
    where id=${tenant} for share`.execute(tx)).rows[0]
  const empty: HistoryPage = { rows: [], next: null }
  if (!site) return empty
  const facts = await loadHistoryFacts(tx, actor, tenant)
  const limit = query.eventId ? 1 : Number(query.limit ?? 50)
  const rows = (await sql<HistoryEntry>`
    select a.id,a.tenant_id,a.action,a.target_user_id,a.content_key,
      to_char(a.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at,
      a.created_by,a.operation_id,a.reason,a.details,
      array(select c.category from app_private.tenant_admin_action_categories c where c.action_id=a.id order by c.category) as categories
    from public.tenant_admin_actions a
    where a.tenant_id=${tenant}
      and (${query.target ?? null}::uuid is null or a.target_user_id=${query.target ?? null}::uuid)
      and (${query.eventId ?? null}::uuid is null or a.id=${query.eventId ?? null}::uuid)
      and (${query.category ?? null}::text is null or exists(select from app_private.tenant_admin_action_categories c
        where c.action_id=a.id and c.category=${query.category ?? null}))
      and (${communityHistoryAudience(facts)})
      and (${position?.time ?? null}::timestamptz is null or (a.created_at,a.id)<(${position?.time ?? null}::timestamptz,${position?.id ?? null}::uuid))
    order by a.created_at desc,a.id desc limit ${query.eventId ? 1 : limit + 1}
  `.execute(tx)).rows
  const visible = rows.slice(0, limit), last = visible.at(-1)
  const next = rows.length > limit && last
    ? Buffer.from(JSON.stringify([...cursorScope(actor, tenant, query), last.created_at, last.id])).toString('base64url') : null
  return { rows: visible, next }
}

// Internal helpers
async function run<T>(db: AppDatabase, context: AuthenticatedContext, work: (tx: Tx) => Promise<T>) {
  const result = await withEligibleActorTransaction(db, context, work)
  if (!result.eligible) throw new ApplicationError(403, 'ineligible')
  return result.value
}

// Community-owned adapter for the explicitly retained archived-card projection.
// The database function binds the caller; personal summary filtering stays with
// user accounts. Returning a query keeps admission and projection in one statement.
export function myCommunityRelationships(tx: Tx) {
  return tx.selectFrom(sql<CommunityRelationship>`app_private.my_community_relationships()`.as('r'))
}
