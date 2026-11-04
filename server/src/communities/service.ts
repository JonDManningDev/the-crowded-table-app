import { randomUUID } from 'node:crypto'
import { sql, type Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from '../database.ts'
import { withEligibleActorTransaction, type AuthenticatedContext } from '../actor-transaction.ts'
import { ApplicationError } from '../application-errors.ts'
import type { DirectoryCursors } from '../directory-cursors.ts'
import { type CommunityLanding } from '../../../shared/community-configuration.ts'
import { type DirectoryPage, type DirectoryQuery, type PublicDirectoryRow } from '../../../shared/community-directory.ts'
import { staffFlags, type CommunityCommand, type CommandResult, type CreateCommunityInput, type CuratedProfile, type StaffPermissions } from '../../../shared/community-commands.ts'
import { type AccountReview, type CommunityRequest, type OwnCommunityRequestResponse, type StaffCandidate } from '../../../shared/community-reads.ts'
import { communityPreferenceFields, type CommunityPreferences, type ProfileInput } from '../../../shared/self-service.ts'

type Tx = Transaction<ApiTables>
interface CommunityDependencies { db: AppDatabase; cursors: DirectoryCursors }

export function createCommunityService({ db, cursors }: CommunityDependencies) {
  return {
    // Public access and standing
    listStandings() {
      return db.selectFrom('community_standing').select(standingFields).orderBy('standing').execute()
    },
    readLanding(params: { slug: string }) {
      return readCommunityLanding(db, params.slug)
    },
    publicDirectory(params: { slug: string }, query: DirectoryQuery) {
      return db.transaction().execute(tx => readPublicDirectory(tx, params.slug, query, cursors))
    },
    // Creation and lifecycle
    createCommunity(context: AuthenticatedContext, input: CreateCommunityInput) {
      return withEligibleActorTransaction(db, context, tx => createCommunity(tx, context.actorId, input))
    },
    executeCommand(context: AuthenticatedContext, params: { tenantId: string }, input: CommunityCommand) {
      return withEligibleActorTransaction(db, context, tx => communityCommand(tx, context.actorId, params.tenantId, input))
    },
    // Requests and reviews
    ownRequest(context: AuthenticatedContext, params: { tenantId: string }) {
      return ownRequest(db, context, params)
    },
    reviewAccount(context: AuthenticatedContext, params: { tenantId: string; target: string }) {
      return reviewAccount(db, context, params)
    },
    staffCandidates(context: AuthenticatedContext, params: { tenantId: string }, query: { after?: string }) {
      return staffCandidates(db, context, params, query)
    },
    pendingRequests(context: AuthenticatedContext, params: { tenantId: string }, query: { after?: string }) {
      return pendingRequests(db, context, params, query)
    },
    // Profiles and preferences
    readProfile(context: AuthenticatedContext, params: { tenantId: string; userId: string }) {
      return readProfile(db, context, params)
    },
    saveOwnProfile(context: AuthenticatedContext, params: { tenantId: string }, input: ProfileInput) {
      return run(db, context, tx => ownCommunityProfile(tx, context.actorId, params.tenantId, input))
    },
    readOwnPreferences(context: AuthenticatedContext, params: { tenantId: string }) {
      return run(db, context, tx => ownCommunityPreferences(tx, context.actorId, params.tenantId))
    },
    saveOwnPreferences(context: AuthenticatedContext, params: { tenantId: string }, input: Partial<CommunityPreferences>) {
      return run(db, context, tx => ownCommunityPreferences(tx, context.actorId, params.tenantId, input))
    }
  }
}
export type CommunityService = ReturnType<typeof createCommunityService>

// Public access and standing
const standingFields = ['standing', 'enable_standard_chat_visibility', 'enable_standard_activity_visibility', 'enable_other_profile_visibility', 'enable_own_profile_management', 'enable_standard_participation', 'enable_standard_dms'] as const
async function readCommunityLanding(db: AppDatabase, slug: string) {
  return (await sql<CommunityLanding>`select * from app_private.community_landing(${slug})`.execute(db)).rows[0]
}
export async function readPublicDirectory(tx: Tx, slug: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<PublicDirectoryRow>> {
  const scope = ['public-directory', slug], after = cursors.decode(scope, query.cursor), limit = Number(query.limit ?? 50)
  type InternalRow = PublicDirectoryRow & { user_id: string }
  const result = (await sql<{ rows: InternalRow[] | null }>`select app_private.public_community_directory(${slug},${after}::uuid,${limit}) as rows`.execute(tx)).rows[0]
  if (result.rows === null) throw new ApplicationError(404, 'missing')
  const visible = result.rows.slice(0, limit), last = visible.at(-1)
  return {
    rows: visible.map(({ display_name, staff_role }) => ({ display_name, staff_role })),
    next: result.rows.length > limit && last ? cursors.encode(scope, last.user_id) : null
  }
}

// Creation and lifecycle
type Staff = StaffPermissions & { role: 'owner' | 'admin'; status: 'active' | 'paused' | 'revoked' }
type Account = { standing: 'approved' | 'pending' | 'suspended' | 'inactive'; revision: string; approved: boolean; restricted: boolean }
type Pending = { id: string; user_id: string; kind: 'join' | 'reactivation' }
type Context = { tx: Tx; tenant: string; actor: string }
function deny(): never { throw new ApplicationError(403, 'forbidden') }
function stale(): never { throw new ApplicationError(409, 'stale_state') }
async function scope(tx: Tx, tenant: string) {
  await sql`select set_config('ct.tenant_id', ${tenant}, true)`.execute(tx)
}
async function account({ tx, tenant }: Context, user: string) {
  return (await sql<Account>`select standing,revision,first_approved_at is not null as approved,
    has_disciplinary_restriction as restricted from public.community_accounts
    where tenant_id=${tenant} and user_id=${user} for update`.execute(tx)).rows[0]
}
async function staff({ tx, tenant }: Context, user: string) {
  return (await sql<Staff>`select role,status,${sql.join(staffFlags.map(key => sql.id(key)))}
    from public.tenant_staff_assignments where tenant_id=${tenant} and user_id=${user}`.execute(tx)).rows[0]
}
async function event({ tx, tenant }: Context, user: string, action: string, details: object = {}, reason?: string) {
  await sql`insert into public.tenant_admin_actions(tenant_id,target_user_id,action,details,reason)
    values(${tenant},${user},${action},${JSON.stringify(details)}::jsonb,${reason?.trim() || null})`.execute(tx)
}
async function setStanding({ tx, tenant }: Context, user: string, standing: Account['standing'], restricted = false) {
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
  const tenant = randomUUID(), c = { tx, actor, tenant }
  await scope(tx, tenant)
  await sql`insert into public.tenants(id,name,slug,country_code,timezone,state_province,city)
    values(${tenant},${input.name.trim()},${input.slug},${input.country},${input.timezone},${input.region.trim() || null},${input.city.trim() || null})`.execute(tx)
  await sql`insert into public.tenant_settings(tenant_id) values(${tenant})`.execute(tx)
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
type Action<K extends CommunityCommand['kind']> = CommunityCommand & { kind: K }
function result(c: Context, outcome: string): CommandResult { return { outcome, tenantId: c.tenant } }
async function joinOrReturn(c: Context, member: Account | undefined, cmd: Action<'join' | 'reactivate'>) {
  const { tx, tenant, actor } = c
  if (cmd.kind === 'join' && member) return result(c, member.standing === 'inactive' ? 'reactivation_required' : 'already_applied')
  if (cmd.kind === 'reactivate' && member?.standing !== 'inactive') stale()
  if (member?.restricted) {
    const existing = (await sql<Pending>`select id from app_private.community_account_requests where tenant_id=${tenant} and user_id=${actor}`.execute(tx)).rows[0]
    if (existing) return { ...result(c, 'review_requested'), requestId: existing.id }
    await setStanding(c, actor, 'inactive', true)
    return { ...result(c, 'review_requested'), requestId: await request(c, 'reactivation') }
  }
  const settings = (await sql<{ auto_approve_users: boolean }>`select auto_approve_users from public.tenant_settings where tenant_id=${tenant}`.execute(tx)).rows[0]
  const standing = member?.approved || settings.auto_approve_users ? 'approved' : 'pending'
  if (cmd.kind === 'join') await addAccount(c, standing, cmd.profile)
  else await setStanding(c, actor, standing)
  if (standing === 'pending') return { ...result(c, standing), requestId: await request(c, 'join') }
  await event(c, actor, member?.approved ? 'community_reactivated' : 'community_approved', { after_standing: standing })
  return result(c, standing)
}
async function changeStanding(c: Context, user: string, member: Account, assignment: Staff | undefined,
  effective: Staff | undefined, cmd: Action<'deactivate' | 'suspend' | 'remove' | 'clear'>) {
  if ((cmd.kind === 'suspend' || cmd.kind === 'remove') && assignment && assignment.status !== 'revoked' && !effective?.can_discipline_staff) deny()
  if ((cmd.kind === 'deactivate' && member.standing === 'inactive') || (cmd.kind === 'suspend' && member.standing === 'suspended')
    || (cmd.kind === 'remove' && member.standing === 'inactive' && member.restricted)) return result(c, 'already_applied')
  if (cmd.kind === 'suspend' && member.standing !== 'approved' || cmd.kind === 'clear' && !member.restricted) stale()
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
  if (cmd.kind === 'grant') {
    if (member.standing !== 'approved' || assignment) stale()
    const eligible = await sql<{ allowed: boolean }>`select app_private.is_staff_candidate(${tenant},${user},true) as allowed`.execute(tx)
    if (!eligible.rows[0].allowed) stale()
    await sql`insert into public.tenant_staff_assignments(tenant_id,user_id,role) values(${tenant},${user},'admin')`.execute(tx)
    await event(c, user, 'staff_created', { after_status: 'active' })
  } else if (cmd.kind === 'resume' || cmd.kind === 'revoke') {
    if (!assignment || assignment.status === 'revoked') stale()
    if (cmd.kind === 'resume' && (user === actor || member.standing !== 'approved' || assignment.status !== 'paused')) stale()
    await setStaffStatus(c, user, assignment.status, cmd.kind === 'resume' ? 'active' : 'revoked',
      cmd.kind === 'resume' ? 'staff_resumed' : 'staff_revoked', 'reason' in cmd ? cmd.reason : undefined)
  } else if (cmd.kind === 'permissions' || cmd.kind === 'reappoint') {
    if (!assignment || (cmd.kind === 'reappoint' ? assignment.status !== 'revoked' || member.standing !== 'approved' : assignment.status === 'revoked')) stale()
    const keys = staffFlags.filter(key => Object.hasOwn(cmd.permissions, key))
    if (!owner && keys.some(k => k !== 'can_audit_community_accounts' && k !== 'can_audit_staff_accounts')) deny()
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
  const site = (await sql<{ operational_status: string }>`select operational_status from public.tenants where id=${tenant} for update`.execute(tx)).rows[0]
  if (!site) throw new ApplicationError(404, 'missing')
  const me = await staff(c, actor)
  // The deferred active-assignment FK also requires approved community standing.
  const effective = me?.status === 'active' ? me : undefined
  const owner = effective?.role === 'owner'
  if (cmd.kind === 'archive') {
    if (!owner) deny()
    const status = cmd.archived ? 'archived' : 'active'
    if (site.operational_status === status) return result(c, 'already_applied')
    await sql`update public.tenants set operational_status=${status} where id=${tenant}`.execute(tx)
    return result(c, status)
  }
  if (site.operational_status !== 'active') throw new ApplicationError(404, 'missing')
  if (cmd.kind === 'approve' && !effective?.can_approve_users) deny()
  if (['suspend', 'remove', 'clear'].includes(cmd.kind) && !effective?.can_discipline_users) deny()
  if (['grant', 'resume', 'permissions'].includes(cmd.kind) && !effective?.can_grant_staff) deny()
  if (cmd.kind === 'reappoint' && !owner) deny()
  if (cmd.kind === 'revoke' && !effective?.can_discipline_staff) deny()
  let user = 'target' in cmd ? cmd.target : actor
  if (cmd.kind === 'approve' || cmd.kind === 'withdraw') {
    const current = (await sql<Pending>`select id,user_id,kind from app_private.community_account_requests
      where tenant_id=${tenant} and id=${cmd.requestId}`.execute(tx)).rows[0]
    if (!current || (cmd.kind === 'withdraw' && current.user_id !== actor) || (cmd.kind === 'approve' && current.kind !== 'join')) stale()
    user = current.user_id
  }
  const member = await account(c, user)
  if (cmd.kind === 'join' || cmd.kind === 'reactivate') return joinOrReturn(c, member, cmd)
  if (!member) stale()
  if ('revision' in cmd && cmd.revision !== member.revision) stale()
  const assignment = await staff(c, user)
  if (assignment?.role === 'owner') deny()
  if (cmd.kind === 'approve' || cmd.kind === 'withdraw') {
    const current = await closeRequest(c, user)
    if (!current || current.id !== cmd.requestId) stale()
    if (cmd.kind === 'approve' && (member.standing !== 'pending' || member.restricted || member.approved)) stale()
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
function ownRequest(db: AppDatabase, context: AuthenticatedContext, params: { tenantId: string }) {
  const actor = context.actorId;
  const tenant = params.tenantId;
  return withEligibleActorTransaction<OwnCommunityRequestResponse | { status: 404 }>(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    const row = (await sql<OwnCommunityRequestResponse>`select case when r.id is not null then
        jsonb_build_object('request_id',r.id,'kind',r.kind,'requested_at',r.requested_at) end as request
        from public.community_accounts c join public.tenants t on t.id=c.tenant_id
        left join app_private.community_account_requests r using(tenant_id,user_id)
        where c.tenant_id=${tenant} and c.user_id=${actor} and t.operational_status='active'`.execute(tx)).rows[0]
    return row ?? { status: 404 as const }
  })
}
function reviewAccount(db: AppDatabase, context: AuthenticatedContext, params: { tenantId: string; target: string }) {
  const actor = context.actorId;
  const tenantId = params.tenantId;
  const target = params.target;
  return withEligibleActorTransaction(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
    const row = (await sql<AccountReview>`select c.standing,c.revision,case when c.user_id=${actor} then r.id end as request_id
          from public.community_accounts c join public.tenants t on t.id=c.tenant_id
          left join app_private.community_account_requests r using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.user_id=${target} and t.operational_status='active'
            and (c.user_id=${actor} or exists(select from public.tenant_staff_assignments s where
              s.tenant_id=c.tenant_id and s.user_id=${actor} and s.status='active' and s.can_discipline_users))
          `.execute(tx)).rows[0]
    return row ? { row } : { status: 404 as const }
  })
}
function staffCandidates(db: AppDatabase, context: AuthenticatedContext, params: { tenantId: string }, query: { after?: string }) {
  const tenantId = params.tenantId;
  return withEligibleActorTransaction(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
    const rows = (await sql<StaffCandidate>`select c.tenant_id,c.user_id,c.standing,p.display_name,s.status as staff_status,s.role as staff_role
          from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id)
          left join public.tenant_staff_assignments s using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.standing='approved' and app_private.is_staff_candidate(c.tenant_id,c.user_id,false)
            and (${query.after ?? null}::uuid is null or c.user_id>${query.after ?? null}::uuid)
          order by c.user_id limit 51`.execute(tx)).rows
    return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].user_id : null }
  })
}
function pendingRequests(db: AppDatabase, context: AuthenticatedContext, params: { tenantId: string }, query: { after?: string }) {
  const actor = context.actorId;
  const tenantId = params.tenantId;
  return withEligibleActorTransaction(db, context, async tx => {
    await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
    const rows = (await sql<CommunityRequest>`select r.id,r.kind,r.user_id,r.requested_at,c.revision,c.standing,c.first_approved_at,
          c.has_disciplinary_restriction,p.display_name from app_private.community_account_requests r
          join public.community_accounts c using(tenant_id,user_id) left join public.community_account_profiles p using(tenant_id,user_id)
          join public.tenant_staff_assignments s on s.tenant_id=r.tenant_id and s.user_id=${actor} and s.status='active'
          where r.tenant_id=${tenantId} and app_private.active_tenant(r.tenant_id)
            and (s.can_approve_users or (s.can_discipline_users and r.kind='reactivation' and c.standing='inactive' and c.has_disciplinary_restriction))
            and (${query.after ?? null}::uuid is null or r.id>${query.after ?? null}::uuid)
          order by r.id limit 51`.execute(tx)).rows
    return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].id : null }
  })
}

// Profiles and preferences
const communityProfileColumns = ['tenant_id', 'user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by'] as const
function readProfile(db: AppDatabase, context: AuthenticatedContext, params: { tenantId: string; userId: string }) {
  const actor = context.actorId;
  const tenantId = params.tenantId;
  const userId = params.userId;
  return withEligibleActorTransaction(db, context, async tx => {
    // Resolve viewer, target and curated profile in the same snapshot.
    const profile = await tx.selectFrom('community_account_profiles as p')
      .innerJoin('community_accounts as target', join => join
        .onRef('target.tenant_id', '=', 'p.tenant_id').onRef('target.user_id', '=', 'p.user_id'))
      .innerJoin('community_accounts as viewer', join => join
        .onRef('viewer.tenant_id', '=', 'p.tenant_id').on('viewer.user_id', '=', actor))
      .where('p.tenant_id', '=', tenantId).where('p.user_id', '=', userId)
      .where(eb => eb.or([
        eb.and([sql<boolean>`app_private.active_tenant(p.tenant_id)`, eb.or([
          eb.and([eb('p.user_id', '=', actor), eb('viewer.standing', '=', 'pending')]),
          eb.and([eb('viewer.standing', 'in', ['approved', 'suspended']),
          eb('target.standing', 'in', ['approved', 'suspended', 'inactive'])]),
        ])]),
        eb.and([sql<boolean>`not app_private.active_tenant(p.tenant_id)`, sql<boolean>`app_private.is_approved_owner(p.tenant_id)`]),
      ]))
      .select(communityProfileColumns.map(field => `p.${field}` as const)).executeTakeFirst()
    return profile ? { status: 200 as const, profile } : { status: 404 as const }
  })
}
export async function ownCommunityProfile(tx: Transaction<ApiTables>, actor: string, tenant: string, input: ProfileInput) {
  // Independent self edits have statement-time lifecycle checks and no tenant lock.
  const result = await sql`update public.community_account_profiles p set display_name=${input.display_name.trim()},bio=${input.bio?.trim() || null}
    where p.tenant_id=${tenant} and p.user_id=${actor} and app_private.active_tenant(p.tenant_id)
      and exists(select from public.community_accounts c join public.community_standing s using(standing)
        where c.tenant_id=p.tenant_id and c.user_id=p.user_id and s.enable_own_profile_management)
    returning p.tenant_id`.execute(tx)
  if (!result.rows.length) throw new ApplicationError(404, 'missing')
  return { tenantId: tenant }
}
export async function ownCommunityPreferences(tx: Transaction<ApiTables>, actor: string, tenant: string, input?: Partial<CommunityPreferences>) {
  if (input) {
    // Account then preference is also the lifecycle writer's order. Do not take
    // a tenant lock: other members' independent saves must remain concurrent.
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    const account = (await sql<{ standing: string }>`select standing from public.community_accounts
      where tenant_id=${tenant} and user_id=${actor} for update`.execute(tx)).rows[0]
    if (!account || !['pending', 'approved'].includes(account.standing)) throw new ApplicationError(404, 'missing')
  }
  const fields = sql.join(communityPreferenceFields.map(field => sql.id(field)))
  const result = input
    ? await sql<CommunityPreferences>`update public.community_account_preferences set ${sql.join(Object.entries(input).map(([key, value]) => sql`${sql.id(key)}=${value}`))}
        where tenant_id=${tenant} and user_id=${actor} and app_private.active_tenant(tenant_id) returning ${fields}`.execute(tx)
    : await sql<CommunityPreferences>`select ${fields} from public.community_account_preferences where tenant_id=${tenant} and user_id=${actor}
        and (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id))`.execute(tx)
  if (!result.rows[0]) throw new ApplicationError(404, 'missing')
  return result.rows[0]
}

// Internal helpers
async function run<T>(db: AppDatabase, context: AuthenticatedContext, work: (tx: Tx) => Promise<T>) {
  const result = await withEligibleActorTransaction(db, context, work)
  if (!result.eligible) throw new ApplicationError(403, 'ineligible')
  return result.value
}
