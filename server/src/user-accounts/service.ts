import { sql, type Transaction } from 'kysely'
import type { AccountPreferences } from './account-preferences.ts'
import type { ProfileInput, OwnProfile, CommunitySummary, CommunitySummaryPage, CommunitySummaryQuery } from './self-service.ts'
import type { BlockInput, DiscoveryQuery, GlobalProfile, OutgoingBlock, ProfilePage } from './global-profiles.ts'
import { withEligibleActorTransaction, type AuthenticatedContext, type ApiTables, type AppDatabase } from '../database.ts'
import { ApplicationError } from '../http-errors.ts'
import type { DirectoryCursors } from '../directory-cursors.ts'

type Tx = Transaction<ApiTables>
interface UserAccountDependencies { db: AppDatabase; cursors: DirectoryCursors }

// Composition binds resources; implementations follow the shared section order.
export function createUserAccountService({ db, cursors }: UserAccountDependencies) {
  return {
    readAccountPreferences(context: AuthenticatedContext) { return readAccountPreferences(db, context) },
    saveAccountPreferences(context: AuthenticatedContext, input: AccountPreferences) { return saveAccountPreferences(db, context, input) },
    readOwnProfile(context: AuthenticatedContext) { return readOwnProfile(db, context) },
    saveOwnProfile(context: AuthenticatedContext, input: ProfileInput) { return saveOwnProfile(db, context, input) },
    listMyCommunities(context: AuthenticatedContext, query: CommunitySummaryQuery) { return listMyCommunities(db, context, query) },
    discoverGlobalProfiles(context: AuthenticatedContext, query: DiscoveryQuery) { return discoverGlobalProfiles(db, cursors, context, query) },
    readGlobalProfile(context: AuthenticatedContext, target: string) { return readGlobalProfile(db, context, target) },
    listAccountBlocks(context: AuthenticatedContext, query: DiscoveryQuery) { return listAccountBlocks(db, cursors, context, query) },
    blockAccount(context: AuthenticatedContext, target: string, input: BlockInput) { return blockAccount(db, context, target, input) },
    unblockAccount(context: AuthenticatedContext, target: string) { return unblockAccount(db, context, target) },
  }
}
export type UserAccountService = ReturnType<typeof createUserAccountService>

// Account preferences
function readAccountPreferences(db: AppDatabase, context: AuthenticatedContext) {
  return withEligibleActorTransaction(db, context, tx => accountPreferences(tx, context.actorId))
}
function saveAccountPreferences(db: AppDatabase, context: AuthenticatedContext, input: AccountPreferences) {
  return withEligibleActorTransaction(db, context, tx => accountPreferences(tx, context.actorId, input))
}
async function accountPreferences(tx: Tx, actor: string, input?: AccountPreferences) {
  const fields = ['user_is_discoverable', 'enable_matchmaking', 'allow_direct_messages'] as const
  const row = input
    ? await tx.updateTable('user_accounts').set(input).where('user_id', '=', actor).returning(fields).executeTakeFirst()
    : await tx.selectFrom('user_accounts').select(fields).where('user_id', '=', actor).executeTakeFirst()
  return row ? { status: 200 as const, row } : { status: 404 as const }
}

// Own profile
function readOwnProfile(db: AppDatabase, context: AuthenticatedContext) {
  return run(db, context, tx => ownProfile(tx, context.actorId))
}
function saveOwnProfile(db: AppDatabase, context: AuthenticatedContext, input: ProfileInput) {
  return run(db, context, tx => ownProfile(tx, context.actorId, input))
}
export async function ownProfile(tx: Transaction<ApiTables>, actor: string, input?: ProfileInput) {
  const fields = sql`user_id,display_name,bio,created_at,updated_at,created_by,updated_by`
  const result = input
    ? await sql<OwnProfile>`insert into public.user_account_profiles(display_name,bio) values(${input.display_name.trim()},${input.bio?.trim() || null})
        on conflict(user_id) do update set display_name=excluded.display_name,bio=excluded.bio returning ${fields}`.execute(tx)
    : await sql<OwnProfile>`select ${fields} from public.user_account_profiles where user_id=${actor}`.execute(tx)
  return { profile: result.rows[0] ?? null }
}

// My communities
function listMyCommunities(db: AppDatabase, context: AuthenticatedContext, query: CommunitySummaryQuery) {
  return run(db, context, tx => myCommunities(tx, context.actorId, query))
}
async function myCommunities(tx: Transaction<ApiTables>, actor: string, query: CommunitySummaryQuery): Promise<CommunitySummaryPage> {
  const filter = query.filter ?? 'all', scope = [actor,filter]
  let position: { time: string; id: string } | undefined
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
  const result = await sql<CommunitySummary>`select t.id,t.name,t.city,t.state_province,t.country_code,t.operational_status,
    to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at,r.is_owned,r.is_managed,r.is_member
    from app_private.my_community_relationships() r join public.tenants t on t.id=r.tenant_id
    where ${filter === 'owned' ? sql`r.is_owned` : filter === 'managed' ? sql`r.is_managed` : sql`(r.is_owned or r.is_member)`}
      and (${position?.time ?? null}::timestamptz is null or t.created_at<${position?.time ?? null}::timestamptz
        or (t.created_at=${position?.time ?? null}::timestamptz and t.id>${position?.id ?? null}::uuid))
    order by t.created_at desc,t.id asc limit ${limit+1}`.execute(tx)
  const rows = result.rows.slice(0,limit), last = rows.at(-1)
  return { rows, next: result.rows.length>limit && last ? Buffer.from(JSON.stringify([...scope,last.created_at,last.id])).toString('base64url') : null }
}

// Global profiles
function discoverGlobalProfiles(db: AppDatabase, cursors: DirectoryCursors, context: AuthenticatedContext, query: DiscoveryQuery) {
  return run(db, context, tx => discoverProfiles(tx, context.actorId, query, cursors))
}
async function discoverProfiles(tx: Tx, actor: string, query: DiscoveryQuery, cursors: DirectoryCursors): Promise<ProfilePage<GlobalProfile>> {
  const term = (query.q ?? '').trim().toLowerCase(), scope = ['global-discovery',actor,term]
  const after = cursors.decode(scope,query.cursor), limit = Number(query.limit ?? 50)
  // RLS also enforces discoverability/blocking; explicitly exclude a hidden self.
  // This statement performs admission and projection together, with no cached check.
  const rows = (await sql<GlobalProfile>`select ${fields} from public.user_account_profiles
    where app_private.can_discover_global_profile(user_id) and strpos(lower(display_name),${term})>0
      and (${after}::uuid is null or user_id>${after}::uuid) order by user_id limit ${limit+1}`.execute(tx)).rows
  const visible=rows.slice(0,limit), last=visible.at(-1)
  return {rows:visible,next:rows.length>limit && last ? cursors.encode(scope,last.user_id):null}
}
function readGlobalProfile(db: AppDatabase, context: AuthenticatedContext, target: string) {
  return run(db, context, tx => inspectGlobalProfile(tx, target))
}
const fields = sql`user_id,display_name,bio,created_at,updated_at,created_by,updated_by`
export async function inspectGlobalProfile(tx: Tx, target: string): Promise<GlobalProfile> {
  const row = (await sql<GlobalProfile>`select ${fields} from app_private.inspect_global_profile(${target})`.execute(tx)).rows[0]
  if (!row) throw new ApplicationError(404,'missing')
  return row
}

// Account blocks
function listAccountBlocks(db: AppDatabase, cursors: DirectoryCursors, context: AuthenticatedContext, query: DiscoveryQuery) {
  return run(db, context, tx => listOwnBlocks(tx, context.actorId, query, cursors))
}
const blockFields = sql`blocker_user_id,blocked_user_id,created_at,created_by`
async function listOwnBlocks(tx: Tx, actor: string, query: DiscoveryQuery, cursors: DirectoryCursors): Promise<ProfilePage<OutgoingBlock>> {
  const scope=['outgoing-blocks',actor],after=cursors.decode(scope,query.cursor),limit=Number(query.limit??50)
  const rows=(await sql<OutgoingBlock>`select ${blockFields} from public.user_account_blocks where blocker_user_id=${actor}
    and (${after}::uuid is null or blocked_user_id>${after}::uuid) order by blocked_user_id limit ${limit+1}`.execute(tx)).rows
  const visible=rows.slice(0,limit),last=visible.at(-1)
  return {rows:visible,next:rows.length>limit && last?cursors.encode(scope,last.blocked_user_id):null}
}
function blockAccount(db: AppDatabase, context: AuthenticatedContext, target: string, input: BlockInput) {
  return run(db, context, tx => setOwnBlock(tx, context.actorId, target, input))
}
function unblockAccount(db: AppDatabase, context: AuthenticatedContext, target: string) {
  return run(db, context, tx => setOwnBlock(tx, context.actorId, target))
}
export async function setOwnBlock(tx: Tx, actor: string, target: string, input?: BlockInput) {
  if (actor===target) throw new ApplicationError(400,'invalid_target')
  // Serialize one caller's retries/unblocks so conflict readback cannot lose
  // its row to another command between INSERT and SELECT.
  await sql`select pg_advisory_xact_lock(hashtextextended('ct.profile-block:' || ${actor}::text,0))`.execute(tx)
  if (!input) {
    await sql`delete from public.user_account_blocks where blocker_user_id=${actor} and blocked_user_id=${target}`.execute(tx)
    return {blocked:false}
  }
  await sql`select set_config('ct.block_source',${input.source.kind},true),
    set_config('ct.block_tenant',${input.source.kind==='community_profile'?input.source.tenantId:''},true)`.execute(tx)
  // The predicate is repeated by INSERT RLS in the same mutation statement.
  const rows=(await sql<OutgoingBlock>`insert into public.user_account_blocks(blocked_user_id)
    select ${target}::uuid where app_private.can_block_from_profile(${target})
    on conflict(blocker_user_id,blocked_user_id) do nothing returning ${blockFields}`.execute(tx)).rows
  const row=rows[0]??(await sql<OutgoingBlock>`select ${blockFields} from public.user_account_blocks
    where blocker_user_id=${actor} and blocked_user_id=${target}`.execute(tx)).rows[0]
  if (!row) throw new ApplicationError(404,'missing')
  return {blocked:true}
}

// Internal helpers
async function run<T>(db: AppDatabase, context: AuthenticatedContext, work: (tx: Tx) => Promise<T>) {
  const result = await withEligibleActorTransaction(db, context, work)
  if (!result.eligible) throw new ApplicationError(403, 'ineligible')
  return result.value
}
