import type { FastifyInstance } from 'fastify'
import { sql, type Transaction } from 'kysely'
import type { BlockInput, DiscoveryQuery, GlobalProfile, OutgoingBlock, ProfilePage } from '../../../shared/global-profiles.ts'
import type { ApiTables, AppDatabase } from '../database.ts'
import { withVerifiedActor } from '../actor-transaction.ts'
import { CommunityError } from '../communities/commands.ts'
import type { DirectoryCursors } from '../communities/directory-cursor.ts'
import { errorResponse } from '../http.ts'

type Tx = Transaction<ApiTables>
const uuid = { type: 'string', format: 'uuid' }
const timestamp = { type: 'string', format: 'date-time' }
const object = (properties: Record<string,unknown>, required=Object.keys(properties)) => ({ type:'object',properties,required,additionalProperties:false })
const profileSchema = object({user_id:uuid,display_name:{type:'string'},bio:{type:['string','null']},created_at:timestamp,updated_at:timestamp,
  created_by:{type:['string','null'],format:'uuid'},updated_by:{type:['string','null'],format:'uuid'}})
const blockSchema = object({blocker_user_id:uuid,blocked_user_id:uuid,created_at:timestamp,created_by:uuid})
const paging = {cursor:{type:'string',minLength:1,maxLength:1024},limit:{type:'string',pattern:'^(100|[1-9][0-9]?)$'}}
const page = (items:object) => object({rows:{type:'array',items},next:{type:['string','null']}})
const fields = sql`user_id,display_name,bio,created_at,updated_at,created_by,updated_by`
const blockFields = sql`blocker_user_id,blocked_user_id,created_at,created_by`

export async function inspectGlobalProfile(tx: Tx, target: string): Promise<GlobalProfile> {
  const row = (await sql<GlobalProfile>`select ${fields} from app_private.inspect_global_profile(${target})`.execute(tx)).rows[0]
  if (!row) throw new CommunityError(404,'missing')
  return row
}
export async function discoverProfiles(tx: Tx, actor: string, query: DiscoveryQuery, cursors: DirectoryCursors): Promise<ProfilePage<GlobalProfile>> {
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
export async function listOwnBlocks(tx: Tx, actor: string, query: DiscoveryQuery, cursors: DirectoryCursors): Promise<ProfilePage<OutgoingBlock>> {
  const scope=['outgoing-blocks',actor],after=cursors.decode(scope,query.cursor),limit=Number(query.limit??50)
  const rows=(await sql<OutgoingBlock>`select ${blockFields} from public.user_account_blocks where blocker_user_id=${actor}
    and (${after}::uuid is null or blocked_user_id>${after}::uuid) order by blocked_user_id limit ${limit+1}`.execute(tx)).rows
  const visible=rows.slice(0,limit),last=visible.at(-1)
  return {rows:visible,next:rows.length>limit && last?cursors.encode(scope,last.blocked_user_id):null}
}
export async function setOwnBlock(tx: Tx, actor: string, target: string, input?: BlockInput) {
  if (actor===target) throw new CommunityError(400,'invalid_target')
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
  if (!row) throw new CommunityError(404,'missing')
  return {blocked:true}
}
export function registerGlobalProfiles(routes: FastifyInstance, db: AppDatabase, cursors: DirectoryCursors) {
  const errors={400:errorResponse,401:errorResponse,403:errorResponse,404:errorResponse},params=object({userId:uuid})
  async function run<T>(actor:string,id:string,work:(tx:Tx)=>Promise<T>) {
    const result=await withVerifiedActor(db,actor,id,work)
    if(result && typeof result==='object' && 'status' in result) throw new CommunityError(403,'ineligible')
    return result
  }
  routes.get<{Querystring:DiscoveryQuery}>('/api/profiles',{
    schema:{querystring:object({...paging,q:{type:'string',maxLength:120}},[]),response:{200:page(profileSchema),...errors}},
  },req=>run(req.getDecorator<string>('actor'),req.id,tx=>discoverProfiles(tx,req.getDecorator<string>('actor'),req.query,cursors)))
  routes.get<{Params:{userId:string}}>('/api/profiles/:userId',{
    schema:{params,querystring:object({}),response:{200:profileSchema,...errors}},
  },req=>run(req.getDecorator<string>('actor'),req.id,tx=>inspectGlobalProfile(tx,req.params.userId)))
  routes.get<{Querystring:DiscoveryQuery}>('/api/me/blocks',{
    schema:{querystring:object(paging,[]),response:{200:page(blockSchema),...errors}},
  },req=>run(req.getDecorator<string>('actor'),req.id,tx=>listOwnBlocks(tx,req.getDecorator<string>('actor'),req.query,cursors)))
  routes.put<{Params:{userId:string};Body:BlockInput}>('/api/me/blocks/:userId',{
    schema:{params,querystring:object({}),body:object({confirmed:{const:true,type:'boolean'},source:{oneOf:[
      object({kind:{const:'global_profile',type:'string'}}),object({kind:{const:'community_profile',type:'string'},tenantId:uuid}),
    ]}}),response:{200:object({blocked:{type:'boolean'}}),...errors}},
  },req=>run(req.getDecorator<string>('actor'),req.id,tx=>setOwnBlock(tx,req.getDecorator<string>('actor'),req.params.userId,req.body)))
  routes.delete<{Params:{userId:string}}>('/api/me/blocks/:userId',{
    schema:{params,querystring:object({}),response:{200:object({blocked:{type:'boolean'}}),...errors}},
  },req=>run(req.getDecorator<string>('actor'),req.id,tx=>setOwnBlock(tx,req.getDecorator<string>('actor'),req.params.userId)))
}
