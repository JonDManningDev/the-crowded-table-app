import type { FastifyInstance } from 'fastify'
import { sql } from 'kysely'
import { staffFlags, type CommunityCommand, type CreateCommunityInput } from '../../../shared/community-commands.ts'
import { withVerifiedActor } from '../actor-transaction.ts'
import type { AppDatabase } from '../database.ts'
import { CommunityError, communityCommand, createCommunity } from './commands.ts'

const uuid = { type: 'string', format: 'uuid' }
const string = (maxLength: number, minLength = 0) => ({ type: 'string', minLength, maxLength })
const bool = { type: 'boolean' }
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false })
const profile = object({ displayName: string(80, 1), bio: { type: ['null','string'], maxLength: 2000 } })
const flags = Object.fromEntries(staffFlags.map(flag => [flag, bool]))
const shapes: Record<CommunityCommand['kind'], Record<string, unknown>> = {
  join: { profile }, deactivate: {}, reactivate: {}, withdraw: { requestId: uuid }, approve: { requestId: uuid, revision: uuid },
  suspend: { target: uuid, revision: uuid, reason: string(2000) }, remove: { target: uuid, revision: uuid, reason: string(2000) },
  clear: { target: uuid, revision: uuid, reason: string(2000) }, grant: { target: uuid }, resume: { target: uuid },
  revoke: { target: uuid, reason: string(2000) }, reappoint: { target: uuid, permissions: object(flags) },
  permissions: { target: uuid, permissions: { ...object(flags, []), minProperties: 1 } },
  archive: { archived: bool },
}
const commandSchema = { oneOf: Object.entries(shapes).map(([kind, props]) =>
  object({ kind: { const: kind }, ...props }, ['kind', ...Object.keys(props).filter(key => key !== 'reason')])) }
const createSchema = object({ name: string(120, 1), slug: string(63, 3), country: string(2, 2), timezone: string(128, 1),
  region: string(120), city: string(120), profile })
const params = object({ tenantId: uuid })
export function registerCommunityCommands(routes: FastifyInstance, db: AppDatabase) {
  routes.post<{ Body: CreateCommunityInput }>('/api/communities', { bodyLimit: 32768, schema: { body: createSchema, querystring: object({}) } }, async (req, reply) => {
    const actor = req.getDecorator<string>('actor')
    let result
    try { result = await withVerifiedActor(db, actor, req.id, tx => createCommunity(tx, actor, req.body)) }
    catch (e) {
      if (e instanceof Error && 'code' in e && e.code === '23505') throw new CommunityError(409, 'handle_taken')
      throw e
    }
    if ('status' in result) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
    return reply.code(201).send(result)
  })
  routes.post<{ Params: { tenantId: string }; Body: CommunityCommand }>('/api/communities/:tenantId/commands',
    { bodyLimit: 32768, schema: { params, body: commandSchema, querystring: object({}) } }, async (req, reply) => {
      const actor = req.getDecorator<string>('actor')
      const result = await withVerifiedActor(db, actor, req.id, tx => communityCommand(tx, actor, req.params.tenantId, req.body))
      if ('status' in result) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
      return result
    })
  // Read exact revision tokens for self or an authorized target review. A
  // single statement resolves the current authority and target in one snapshot.
  routes.get<{ Params: { tenantId: string; target: string } }>('/api/communities/:tenantId/accounts/:target/review',
    { schema: { params: object({ tenantId: uuid, target: uuid }), querystring: object({}) } }, async (req, reply) => {
      const actor = req.getDecorator<string>('actor'), { tenantId, target } = req.params
      const result = await withVerifiedActor(db, actor, req.id, async tx => {
        await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
        const row = (await sql`select c.standing,c.revision,case when c.user_id=${actor} then r.id end as request_id
          from public.community_accounts c join public.tenants t on t.id=c.tenant_id
          left join app_private.community_account_requests r using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.user_id=${target} and t.operational_status='active'
            and (c.user_id=${actor} or exists(select from public.tenant_staff_assignments s where
              s.tenant_id=c.tenant_id and s.user_id=${actor} and s.status='active' and s.can_discipline_users))
          `.execute(tx)).rows[0]
        return row ? { row } : { status: 404 as const }
      })
      if ('status' in result) return reply.code(result.status!).send({ code: 'unavailable', requestId: req.id })
      return result.row
    })
  routes.get<{ Params: { tenantId: string }; Querystring: { after?: string } }>('/api/communities/:tenantId/staff-candidates',
    { schema: { params, querystring: object({ after: uuid }, []) } }, async (req, reply) => {
      const actor = req.getDecorator<string>('actor'), { tenantId } = req.params
      const result = await withVerifiedActor(db, actor, req.id, async tx => {
        await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
        const rows = (await sql<{ user_id: string }>`select c.tenant_id,c.user_id,c.standing,p.display_name,s.status as staff_status,s.role as staff_role
          from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id)
          left join public.tenant_staff_assignments s using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.standing='approved' and app_private.is_staff_candidate(c.tenant_id,c.user_id,false)
            and (${req.query.after ?? null}::uuid is null or c.user_id>${req.query.after ?? null}::uuid)
          order by c.user_id limit 51`.execute(tx)).rows
        return { rows: rows.slice(0,50), next: rows.length > 50 ? rows[49].user_id : null }
      })
      if ('status' in result) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
      return result
    })
  routes.get<{ Params: { tenantId: string }; Querystring: { after?: string } }>('/api/communities/:tenantId/requests',
    { schema: { params, querystring: object({ after: uuid }, []) } }, async (req, reply) => {
      const actor = req.getDecorator<string>('actor'), { tenantId } = req.params
      const result = await withVerifiedActor(db, actor, req.id, async tx => {
        await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
        const rows = (await sql`select r.id,r.kind,r.user_id,r.requested_at,c.revision,c.standing,c.first_approved_at,
          c.has_disciplinary_restriction,p.display_name from app_private.community_account_requests r
          join public.community_accounts c using(tenant_id,user_id) left join public.community_account_profiles p using(tenant_id,user_id)
          join public.tenant_staff_assignments s on s.tenant_id=r.tenant_id and s.user_id=${actor} and s.status='active'
          where r.tenant_id=${tenantId} and app_private.active_tenant(r.tenant_id)
            and (s.can_approve_users or (s.can_discipline_users and r.kind='reactivation' and c.standing='inactive' and c.has_disciplinary_restriction))
            and (${req.query.after ?? null}::uuid is null or r.id>${req.query.after ?? null}::uuid)
          order by r.id limit 51`.execute(tx)).rows as { id: string }[]
        return { rows: rows.slice(0,50), next: rows.length > 50 ? rows[49].id : null }
      })
      if ('status' in result) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
      return result
    })
}
