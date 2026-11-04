import { getAuthenticatedContext } from '../http-authentication.ts'
import type { FastifyInstance } from 'fastify'
import { sql, type Transaction } from 'kysely'
import type { AccountFacts, DirectoryPage, DirectoryQuery, MemberDirectoryRow } from '../../../shared/community-directory.ts'
import type { ApiTables, AppDatabase } from '../database.ts'
import { withEligibleActorTransaction, type AuthenticatedContext } from '../actor-transaction.ts'
import { errorResponse } from '../http-errors.ts'
import { ApplicationError } from '../application-errors.ts'
import type { DirectoryCursors } from '../directory-cursors.ts'

type Tx = Transaction<ApiTables>

const uuid = { type: 'string', format: 'uuid' }

const object = (properties: Record<string,unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false })

const audit = { created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
  created_by: { type: ['string','null'], format: 'uuid' }, updated_by: { type: ['string','null'], format: 'uuid' } }

const facts = { tenant_id: uuid, user_id: uuid, standing: { type: 'string', enum: ['pending','approved','suspended','inactive'] },
  first_approved_at: { type: ['string','null'], format: 'date-time' }, has_disciplinary_restriction: { type: 'boolean' }, ...audit }

const profile = { tenant_id: uuid, user_id: uuid, display_name: { type: 'string' }, bio: { type: ['string','null'] }, ...audit }

const role = { type: ['string','null'], enum: ['owner','admin',null] }

const memberRow = object({ account: object(facts), profile: { ...object(profile), type: ['object','null'] }, staff_role: role })

const page = (items: object) => object({ rows: { type: 'array', items }, next: { type: ['string','null'] } })

const querySchema = object({ limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' }, cursor: { type: 'string', minLength: 1, maxLength: 1024 } },[])

const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }

const factsFields = Object.keys(facts)

const profileFields = Object.keys(profile)

const jsonProjection = (alias: string, fields: string[]) => sql`jsonb_build_object(${sql.join(fields.flatMap(key=>[sql`${key}::text`,sql.ref(alias+'.'+key)]))})`

async function lockTenant(tx: Tx, actor: string, tenant: string) {
  await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
  if (!(await sql`select id from public.tenants where id=${tenant} for share`.execute(tx)).rows[0]) throw new ApplicationError(404,'missing')
  // Recheck after waiting on any configuration/lifecycle writer, not in its old snapshot.
  return (await sql<{ active: boolean; owner: boolean; member: boolean }>`select app_private.active_tenant(${tenant}) as active,
    app_private.is_approved_owner(${tenant}) as owner, exists(select from public.community_accounts where tenant_id=${tenant}
      and user_id=${actor} and standing in ('approved','suspended')) as member`.execute(tx)).rows[0]
}

export async function readAccountFacts(tx: Tx, actor: string, tenant: string, target: string): Promise<AccountFacts> {
  const access = await lockTenant(tx,actor,tenant)
  if (!access.owner && (!access.active || (target !== actor && !access.member))) throw new ApplicationError(404,'missing')
  const row = (await sql<AccountFacts>`select ${sql.join(factsFields.map(key=>sql.id(key)))} from public.community_accounts
    where tenant_id=${tenant} and user_id=${target} and (${access.owner || target === actor} or standing in ('approved','suspended','inactive'))`.execute(tx)).rows[0]
  if (!row) throw new ApplicationError(404,'missing')
  return row
}

export async function readMemberDirectory(tx: Tx, actor: string, tenant: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<MemberDirectoryRow>> {
  const access = await lockTenant(tx,actor,tenant)
  if (!access.active || !access.member) throw new ApplicationError(404,'missing')
  const scope = ['member-directory',actor,tenant], after = cursors.decode(scope,query.cursor), limit = Number(query.limit ?? 50)
  const rows = (await sql<MemberDirectoryRow>`select ${jsonProjection('c',factsFields)} as account,
    case when p.user_id is not null then ${jsonProjection('p',profileFields)} end as profile,
    case when c.standing='approved' and s.status='active' then s.role end as staff_role
    from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id)
    left join public.tenant_staff_assignments s using(tenant_id,user_id)
    where c.tenant_id=${tenant} and c.standing in ('approved','suspended') and (${after}::uuid is null or c.user_id>${after}::uuid)
    order by c.user_id limit ${limit+1}`.execute(tx)).rows
  const visible = rows.slice(0,limit), last = visible.at(-1)
  return { rows: visible, next: rows.length>limit && last ? cursors.encode(scope,last.account.user_id) : null }
}

export async function listOwnerAccounts(tx: Tx, actor: string, tenant: string, query: DirectoryQuery, cursors: DirectoryCursors): Promise<DirectoryPage<AccountFacts>> {
  const access = await lockTenant(tx,actor,tenant)
  if (!access.owner) throw new ApplicationError(404,'missing')
  const scope = ['owner-accounts',actor,tenant], after = cursors.decode(scope,query.cursor), limit = Number(query.limit ?? 50)
  const rows = (await sql<AccountFacts>`select ${sql.join(factsFields.map(key=>sql.id(key)))} from public.community_accounts
    where tenant_id=${tenant} and (${after}::uuid is null or user_id>${after}::uuid) order by user_id limit ${limit+1}`.execute(tx)).rows
  const visible = rows.slice(0,limit), last = visible.at(-1)
  return { rows: visible, next: rows.length>limit && last ? cursors.encode(scope,last.user_id) : null }
}

export function registerCommunityDirectory(routes: FastifyInstance, db: AppDatabase, cursors: DirectoryCursors) {
  async function run<T>(context: AuthenticatedContext, work: (tx:Tx)=>Promise<T>) {
    const result = await withEligibleActorTransaction(db,context,work)
    if (!result.eligible) throw new ApplicationError(403,'ineligible')
    return result.value
  }
  const params = object({tenantId:uuid})
  routes.get<{Params:{tenantId:string;userId:string}}>('/api/communities/:tenantId/accounts/:userId',{
    schema:{params:object({tenantId:uuid,userId:uuid}),querystring:object({}),response:{200:object(facts),...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>readAccountFacts(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,req.params.userId)))
  routes.get<{Params:{tenantId:string};Querystring:DirectoryQuery}>('/api/communities/:tenantId/directory',{
    schema:{params,querystring:querySchema,response:{200:page(memberRow),...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>readMemberDirectory(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,req.query,cursors)))
  routes.get<{Params:{tenantId:string};Querystring:DirectoryQuery}>('/api/communities/:tenantId/accounts',{
    schema:{params,querystring:querySchema,response:{200:page(object(facts)),...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>listOwnerAccounts(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,req.query,cursors)))
}