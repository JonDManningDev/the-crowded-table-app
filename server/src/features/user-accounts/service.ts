import { myCommunityRelationships } from '../communities/service.ts'
import { sql } from 'kysely'
import { withEligibleActorTransaction, type AuthenticatedContext, type AppDatabase } from '../../database.ts'
import { ApplicationError } from '../../http-errors.ts'
import type { DirectoryCursors } from '../../directory-cursors.ts'
import type {
  AccountPreferences,
  ProfileInput,
  OwnProfile,
  CommunitySummary,
  CommunitySummaryPage,
  CommunitySummaryQuery,
  BlockedProfile,
  DiscoveryQuery,
  GlobalProfile,
  GlobalSearchRow,
  OutgoingBlock,
  ProfilePage,
  Position,
  UserAccountDependencies,
} from './types.ts'

export function createUserAccountService({ db, cursors }: UserAccountDependencies) {
  return {
    readAccountPreferences(requestContext: AuthenticatedContext) { return readAccountPreferences(db, requestContext) },
    saveAccountPreferences(requestContext: AuthenticatedContext, input: AccountPreferences) { return saveAccountPreferences(db, requestContext, input) },
    readOwnGlobalProfile(requestContext: AuthenticatedContext) { return readOwnGlobalProfile(db, requestContext) },
    saveGlobalProfile(requestContext: AuthenticatedContext, input: ProfileInput) { return saveGlobalProfile(db, requestContext, input) },
    listMyCommunities(requestContext: AuthenticatedContext, query: CommunitySummaryQuery) { return listMyCommunities(db, requestContext, query) },
    discoverGlobalProfiles(requestContext: AuthenticatedContext, query: DiscoveryQuery) { return discoverGlobalProfiles(db, cursors, requestContext, query) },
    readOtherGlobalProfile(requestContext: AuthenticatedContext, target: string) { return readOtherGlobalProfile(db, requestContext, target) },
    listAccountBlocks(requestContext: AuthenticatedContext, query: DiscoveryQuery) { return listAccountBlocks(db, cursors, requestContext, query) },
    blockUser(requestContext: AuthenticatedContext, target: string) { return blockUser(db, requestContext, target) },
    unblockUser(requestContext: AuthenticatedContext, target: string) { return unblockUser(db, requestContext, target) },
  }
}

// Account preferences

function readAccountPreferences(db: AppDatabase, requestContext: AuthenticatedContext) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const row = await tx.selectFrom('user_accounts')
      .select(['user_is_discoverable', 'enable_matchmaking', 'allow_direct_messages'])
      .where(sql<boolean>`user_id=${requestContext.actorId}`).executeTakeFirst()
    return row ? { status: 200 as const, row } : { status: 404 as const }
  })
}

function saveAccountPreferences(db: AppDatabase, requestContext: AuthenticatedContext, input: AccountPreferences) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const row = await tx.updateTable('user_accounts').set(input)
      .where(sql<boolean>`user_id=${requestContext.actorId}`)
      .returning(['user_is_discoverable', 'enable_matchmaking', 'allow_direct_messages']).executeTakeFirst()
    return row ? { status: 200 as const, row } : { status: 404 as const }
  })
}

// Own profile

export async function readOwnGlobalProfile(db: AppDatabase, requestContext: AuthenticatedContext) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    const fields = sql`user_id,display_name,bio,created_at,updated_at,created_by,updated_by`
    const result = await sql<OwnProfile>`select ${fields} from public.user_account_profiles where user_account_profiles.user_id=${actor}`.execute(tx)
    return { profile: result.rows[0] ?? null }
  })
}

export async function saveGlobalProfile(db: AppDatabase, requestContext: AuthenticatedContext, input: ProfileInput) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    const fields = sql`user_id,display_name,bio,created_at,updated_at,created_by,updated_by`
    const result = await sql<OwnProfile>`insert into public.user_account_profiles(display_name,bio) values(${input.display_name.trim()},${input.bio?.trim() || null})
      on conflict(user_id) do update set display_name=excluded.display_name,bio=excluded.bio
      where user_account_profiles.user_id=${actor} returning ${fields}`.execute(tx)
    return { profile: result.rows[0] ?? null }
  })
}

// My communities

async function listMyCommunities(db: AppDatabase, requestContext: AuthenticatedContext, query: CommunitySummaryQuery): Promise<CommunitySummaryPage> {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    const filter = query.filter ?? 'all', scope = [actor,filter]
    let position: Position | undefined
    if (query.cursor) {
      try {
        const value: unknown = JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'))
        if (!Array.isArray(value) || value.length !== 4 || JSON.stringify(value.slice(0,2)) !== JSON.stringify(scope)
          || typeof value[2] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value[2])
          || value[2].startsWith('0000-') || !Number.isFinite(Date.parse(value[2]))
          || new Date(value[2]).toISOString().slice(0,19) !== value[2].slice(0,19)
          || typeof value[3] !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value[3])) throw Error('cursor')
        position = { time: value[2], id: value[3] }
      } catch { throw new ApplicationError(400,'invalid_cursor') }
    }
    const limit = Number(query.limit ?? 50)
    const rowsResult = await myCommunityRelationships(tx).innerJoin('tenants as t', 't.id', 'r.tenant_id')
      .select(['t.id','t.name','t.city','t.state_province','t.country_code','t.operational_status',
        'r.is_owned','r.is_managed','r.is_member'])
      .select(sql<string>`to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.as('created_at'))
      .where(filter === 'owned' ? sql<boolean>`r.is_owned` : filter === 'managed' ? sql<boolean>`r.is_managed`
        : sql<boolean>`(r.is_owned or r.is_member)`)
      .where(sql<boolean>`(${position?.time ?? null}::timestamptz is null or t.created_at<${position?.time ?? null}::timestamptz
        or (t.created_at=${position?.time ?? null}::timestamptz and t.id>${position?.id ?? null}::uuid))`)
      .orderBy('t.created_at','desc').orderBy('t.id','asc').limit(limit+1)
      .$narrowType<Pick<CommunitySummary, 'operational_status'>>().execute()
    const rows = rowsResult.slice(0,limit), last = rows.at(-1)
    return { rows, next: rowsResult.length>limit && last ? Buffer.from(JSON.stringify([...scope,last.created_at,last.id])).toString('base64url') : null }
  })
}

// Global profiles

async function discoverGlobalProfiles(db: AppDatabase, cursors: DirectoryCursors, requestContext: AuthenticatedContext, query: DiscoveryQuery): Promise<ProfilePage<GlobalSearchRow>> {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    const term = (query.q ?? '').trim().toLowerCase(), scope = ['global-discovery',actor,term]
    const after = cursors.decode(scope,query.cursor), limit = Number(query.limit ?? 50)
    // Admission and projection share a fresh statement snapshot, before pagination.
    const rows = (await sql<GlobalSearchRow>`select user_id,display_name from public.user_account_profiles p
      where exists(select from public.user_accounts u where u.user_id=p.user_id and u.user_is_discoverable)
        and strpos(lower(display_name),${term})>0
        and (${after}::uuid is null or user_id>${after}::uuid) order by user_id limit ${limit+1}`.execute(tx)).rows
    const visible=rows.slice(0,limit), last=visible.at(-1)
    return {rows:visible,next:rows.length>limit && last ? cursors.encode(scope,last.user_id):null}
  })
}
const fields = sql`user_id,display_name,bio,created_at,updated_at,created_by,updated_by`
export async function readOtherGlobalProfile(db: AppDatabase, requestContext: AuthenticatedContext, target: string): Promise<GlobalProfile | BlockedProfile> {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    // Shared-community consent and standing follow the community-owned sharing rule.
    const row = (await sql<GlobalProfile & { blocked: boolean }>`select block_status.blocked, details.*
      from public.user_account_profiles p
      cross join lateral (select exists(select from public.user_account_blocks b where
        (b.blocker_user_id,b.blocked_user_id) in ((${actor}::uuid,p.user_id),(p.user_id,${actor}::uuid))) as blocked) block_status
      left join lateral (select ${fields} where not block_status.blocked) details on true
      where p.user_id=${target} and (exists(select from public.user_accounts u where u.user_id=p.user_id and u.user_is_discoverable)
        or exists(select from public.community_accounts viewer
          join public.community_accounts target using(tenant_id)
          join public.community_account_preferences prefs on (prefs.tenant_id,prefs.user_id)=(target.tenant_id,target.user_id)
          join public.tenants t on t.id=target.tenant_id
          where viewer.user_id=${actor} and target.user_id=p.user_id
            and viewer.standing in ('approved','suspended') and target.standing in ('approved','suspended')
            and t.operational_status='active' and prefs.show_global_profile))`.execute(tx)).rows[0]
    if (!row) throw new ApplicationError(404,'missing')
    const { blocked, ...profile } = row
    return blocked ? { status: 'blocked' } : profile
  })
}

// Account blocks

const blockFields = sql`blocker_user_id,blocked_user_id,created_at,created_by`

async function listAccountBlocks(db: AppDatabase, cursors: DirectoryCursors, requestContext: AuthenticatedContext, query: DiscoveryQuery): Promise<ProfilePage<OutgoingBlock>> {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    const scope=['outgoing-blocks',actor],after=cursors.decode(scope,query.cursor),limit=Number(query.limit??50)
    const rows=(await sql<OutgoingBlock>`select ${blockFields} from public.user_account_blocks where blocker_user_id=${actor}
      and (${after}::uuid is null or blocked_user_id>${after}::uuid) order by blocked_user_id limit ${limit+1}`.execute(tx)).rows
    const visible=rows.slice(0,limit),last=visible.at(-1)
    return {rows:visible,next:rows.length>limit && last?cursors.encode(scope,last.blocked_user_id):null}
  })
}

function blockUser(db: AppDatabase, requestContext: AuthenticatedContext, target: string) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    if (requestContext.actorId.toLowerCase() === target.toLowerCase()) throw new ApplicationError(400, 'invalid_target')
    // Acknowledge the command identically when the target account is absent.
    await sql`insert into public.user_account_blocks(blocked_user_id)
      select user_id from public.user_accounts where user_id=${target}
      on conflict(blocker_user_id,blocked_user_id) do nothing`.execute(tx)
    return { blocked: true }
  })
}

function unblockUser(db: AppDatabase, requestContext: AuthenticatedContext, target: string) {
  return withEligibleActorTransaction(db, requestContext, async tx => {
    const actor = requestContext.actorId
    if (actor.toLowerCase() === target.toLowerCase()) throw new ApplicationError(400, 'invalid_target')
    await sql`delete from public.user_account_blocks where blocker_user_id=${actor} and blocked_user_id=${target}`.execute(tx)
    return {blocked:false}
  })
}
