import { getAuthenticatedContext } from '../http-authentication.ts'
import type { FastifyInstance } from 'fastify'
import { sql, type Transaction } from 'kysely'
import type { HistoryEntry, HistoryPage, HistoryQuery } from '../../../shared/account-history.ts'
import { withEligibleActorTransaction } from '../actor-transaction.ts'
import type { ApiTables, AppDatabase } from '../database.ts'
import { errorResponse } from '../http-errors.ts'
import { ApplicationError } from '../application-errors.ts'

const uuid = { type: 'string', format: 'uuid' } as const
const nullableUuid = { type: ['string','null'], format: 'uuid' } as const
const category = { type: 'string', enum: ['community_account','staff_account'] } as const
const fields = {
  id: uuid, tenant_id: uuid, action: { type: 'string' }, target_user_id: nullableUuid,
  content_key: { type: ['string','null'] }, created_at: { type: 'string', format: 'date-time' },
  created_by: nullableUuid, operation_id: uuid, reason: { type: ['string','null'] },
  details: { type: 'object', additionalProperties: true }, categories: { type: 'array', items: category },
}
type Position = { time: string; id: string }
function cursorScope(actor: string, tenant: string, query: HistoryQuery) {
  return [actor, tenant, query.target ?? null, query.category ?? null]
}
function decodeCursor(actor: string, tenant: string, query: HistoryQuery): Position | null {
  if (!query.cursor || query.eventId) return null
  try {
    const value: unknown = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8'))
    if (!Array.isArray(value) || value.length !== 6
      || JSON.stringify(value.slice(0,4)) !== JSON.stringify(cursorScope(actor,tenant,query))
      || typeof value[4] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value[4])
      || value[4].startsWith('0000-')
      || !Number.isFinite(Date.parse(value[4]))
      || new Date(value[4]).toISOString().slice(0,19) !== value[4].slice(0,19)
      || typeof value[5] !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value[5])) {
      throw new Error('Invalid cursor')
    }
    return { time: value[4], id: value[5] }
  } catch { throw new ApplicationError(400, 'invalid_cursor') }
}
export async function accountHistory(tx: Transaction<ApiTables>, actor: string, tenant: string, query: HistoryQuery): Promise<HistoryPage> {
  const position = decodeCursor(actor, tenant, query)
  await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
  // Every command takes this row FOR UPDATE. Acquire it before reading the
  // staff flags, so a committed archive or revocation governs this request.
  const site = (await sql<{ operational_status: string }>`select operational_status from public.tenants
    where id=${tenant} for share`.execute(tx)).rows[0]
  const empty: HistoryPage = { rows: [], next: null }
  if (!site) return empty
  const staff = (await sql<{ role: string; can_audit_community_accounts: boolean; can_audit_staff_accounts: boolean }>`
    select s.role,s.can_audit_community_accounts,s.can_audit_staff_accounts
    from public.tenant_staff_assignments s join public.community_accounts c using(tenant_id,user_id)
    where s.tenant_id=${tenant} and s.user_id=${actor} and s.status='active' and c.standing='approved'
  `.execute(tx)).rows[0]
  if (!staff) return empty
  const owner = staff.role === 'owner'
  if (!owner && (site.operational_status !== 'active' || !staff.can_audit_community_accounts && !staff.can_audit_staff_accounts)) return empty
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
      and (${owner} or exists(select from app_private.tenant_admin_action_categories c where c.action_id=a.id
        and ((c.category='community_account' and ${staff.can_audit_community_accounts})
          or (c.category='staff_account' and ${staff.can_audit_staff_accounts}))))
      and (${position?.time ?? null}::timestamptz is null or (a.created_at,a.id)<(${position?.time ?? null}::timestamptz,${position?.id ?? null}::uuid))
    order by a.created_at desc,a.id desc limit ${query.eventId ? 1 : limit+1}
  `.execute(tx)).rows
  const visible = rows.slice(0,limit), last = visible.at(-1)
  const next = rows.length > limit && last
    ? Buffer.from(JSON.stringify([...cursorScope(actor,tenant,query),last.created_at,last.id])).toString('base64url') : null
  return { rows: visible, next }
}
export function registerAccountHistory(routes: FastifyInstance, db: AppDatabase) {
  routes.get<{ Params: { tenantId: string }; Querystring: HistoryQuery }>('/api/communities/:tenantId/history', {
    schema: {
      params: { type: 'object', required: ['tenantId'], additionalProperties: false, properties: { tenantId: uuid } },
      querystring: { type: 'object', additionalProperties: false, properties: {
        target: uuid, category, eventId: uuid, cursor: { type: 'string', maxLength: 1024 },
        limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' },
      } },
      response: { 200: { type: 'object', required: ['rows','next'], additionalProperties: false, properties: {
        rows: { type: 'array', items: { type: 'object', required: Object.keys(fields), additionalProperties: false, properties: fields } },
        next: { type: ['string','null'] },
      } }, 400: errorResponse, 401: errorResponse, 403: errorResponse },
    },
  }, async (request, reply) => {
    const actor = getAuthenticatedContext(request).actorId
    const result = await withEligibleActorTransaction(db, getAuthenticatedContext(request),tx => accountHistory(tx,actor,request.params.tenantId,request.query))
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    return result.value
  })
}
