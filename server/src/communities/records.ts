import { getAuthenticatedContext } from '../http-authentication.ts'
import type { FastifyInstance } from 'fastify'
import { sql, type Transaction } from 'kysely'
import { staffFlags } from '../../../shared/community-commands.ts'
import type { ParticipantPermissions, RecordPage, RecordQuery, StaffRecord } from '../../../shared/community-records.ts'
import type { ApiTables, AppDatabase } from '../database.ts'
import { withEligibleActorTransaction, type AuthenticatedContext } from '../actor-transaction.ts'
import { errorResponse } from '../http-errors.ts'
import { ApplicationError } from '../application-errors.ts'

type Tx = Transaction<ApiTables>
type Kind = 'staff' | 'participant'
type Records = { staff: StaffRecord; participant: ParticipantPermissions }
const uuid = { type: 'string', format: 'uuid' }
const object = (properties: Record<string,unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false })
const metadata = { tenant_id: uuid, user_id: uuid, created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' }, created_by: { type: ['string','null'], format: 'uuid' },
  updated_by: { type: ['string','null'], format: 'uuid' } }
const schemas = {
  staff: object({ ...metadata, role: { type: 'string', enum: ['owner','admin'] },
    status: { type: 'string', enum: ['active','paused','revoked'] },
    ...Object.fromEntries(staffFlags.map(key => [key,{ type: 'boolean' }])) }),
  participant: object({ ...metadata, can_post_public_events: { type: 'boolean' } }),
}
const table = { staff: 'public.tenant_staff_assignments', participant: 'public.community_account_permissions' }
const columns = {
  staff: [...Object.keys(metadata),'role','status',...staffFlags],
  participant: [...Object.keys(metadata),'can_post_public_events'],
}

async function authorize(tx: Tx, actor: string, tenant: string, kind: Kind, target?: string, write = false) {
  await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
  const site = (await sql`select id from public.tenants where id=${tenant} ${write ? sql`for update` : sql`for share`}`.execute(tx)).rows[0]
  if (!site) throw new ApplicationError(404,'missing')
  const allowed = (await sql<{ allowed: boolean }>`select app_private.can_manage_account_records(${tenant},${kind})
    or (${!write && target === actor} and app_private.active_tenant(${tenant})) as allowed`.execute(tx)).rows[0]?.allowed
  if (!allowed) throw new ApplicationError(write ? 403 : 404,write ? 'forbidden' : 'missing')
}

export async function readAccountRecord<K extends Kind>(tx: Tx, actor: string, tenant: string, kind: K, target: string): Promise<Records[K]> {
  await authorize(tx,actor,tenant,kind,target)
  const row = (await sql<Records[K]>`select ${sql.join(columns[kind].map(key=>sql.id(key)))} from ${sql.table(table[kind])}
    where tenant_id=${tenant} and user_id=${target}`.execute(tx)).rows[0]
  if (!row) throw new ApplicationError(404,'missing')
  return row
}

export async function listAccountRecords<K extends Kind>(tx: Tx, actor: string, tenant: string, kind: K, query: RecordQuery): Promise<RecordPage<Records[K]>> {
  await authorize(tx,actor,tenant,kind)
  const scope = [actor,tenant,kind]
  let position: string | null = null
  if (query.cursor) {
    try {
      const value: unknown = JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8'))
      if (!Array.isArray(value) || value.length !== 4 || JSON.stringify(value.slice(0,3)) !== JSON.stringify(scope)
        || typeof value[3] !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value[3])) throw new Error()
      position = value[3]
    } catch { throw new ApplicationError(400,'invalid_cursor') }
  }
  const limit = query.limit ? Number(query.limit) : 50
  const rows = (await sql<Records[K]>`select ${sql.join(columns[kind].map(key=>sql.id(key)))} from ${sql.table(table[kind])}
    where tenant_id=${tenant} and (${position}::uuid is null or user_id>${position}::uuid)
    order by user_id limit ${limit+1}`.execute(tx)).rows
  const visible = rows.slice(0,limit), last = visible.at(-1)
  return { rows: visible, next: rows.length>limit && last ? Buffer.from(JSON.stringify([...scope,last.user_id])).toString('base64url') : null }
}

export async function setParticipantPermission(tx: Tx, actor: string, tenant: string, target: string, enabled: boolean) {
  await authorize(tx,actor,tenant,'participant',target,true)
  const before = (await sql<{ can_post_public_events: boolean }>`select can_post_public_events from public.community_account_permissions
    where tenant_id=${tenant} and user_id=${target} for update`.execute(tx)).rows[0]
  if (!before) throw new ApplicationError(404,'missing')
  if (before.can_post_public_events !== enabled) {
    await sql`update public.community_account_permissions set can_post_public_events=${enabled} where tenant_id=${tenant} and user_id=${target}`.execute(tx)
    await sql`insert into public.tenant_admin_actions(tenant_id,target_user_id,action,details)
      values(${tenant},${target},'community_permissions_changed',${JSON.stringify({ before: before.can_post_public_events, after: enabled })}::jsonb)`.execute(tx)
  }
  return readAccountRecord(tx,actor,tenant,'participant',target)
}

export function registerAccountRecords(routes: FastifyInstance, db: AppDatabase) {
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
  async function run<T>(context: AuthenticatedContext, work: (tx: Tx)=>Promise<T>) {
    const result = await withEligibleActorTransaction(db,context,work)
    if (!result.eligible) throw new ApplicationError(403,'ineligible')
    return result.value
  }
  for (const kind of ['staff','participant'] as const) {
    const path = '/api/communities/:tenantId/' + (kind === 'staff' ? 'staff' : 'participant-permissions')
    const exact = kind === 'staff' ? path+'/:userId' : '/api/communities/:tenantId/accounts/:userId/permissions'
    routes.get<{Params:{tenantId:string;userId:string}}>(exact,{
      schema:{params:object({tenantId:uuid,userId:uuid}),querystring:object({}),response:{200:schemas[kind],...errors}},
    },req=>run(getAuthenticatedContext(req),tx=>readAccountRecord(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,kind,req.params.userId)))
    routes.get<{Params:{tenantId:string};Querystring:RecordQuery}>(path,{
      schema:{params:object({tenantId:uuid}),querystring:object({cursor:{type:'string',minLength:1,maxLength:1024},
        limit:{type:'string',pattern:'^(100|[1-9][0-9]?)$'}},[]),response:{200:object({rows:{type:'array',items:schemas[kind]},next:{type:['string','null']}}),...errors}},
    },req=>run(getAuthenticatedContext(req),tx=>listAccountRecords(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,kind,req.query)))
  }
  routes.patch<{Params:{tenantId:string;userId:string};Body:{can_post_public_events:boolean}}>('/api/communities/:tenantId/accounts/:userId/permissions',{
    schema:{params:object({tenantId:uuid,userId:uuid}),querystring:object({}),body:object({can_post_public_events:{type:'boolean'}}),response:{200:schemas.participant,...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>setParticipantPermission(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,req.params.userId,req.body.can_post_public_events)))
}
