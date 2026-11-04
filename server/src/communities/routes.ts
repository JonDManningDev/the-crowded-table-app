import type { FastifyPluginAsync } from 'fastify'
import type { CommunityService } from './service.ts'
import * as schemas from './schema.ts'
import { optionalAuthentication, verifyOptionalIdentity, getAuthenticatedContext } from '../http-authentication.ts'
import type { BearerVerifier } from '../token-verifier.ts'
import { ApplicationError } from '../application-errors.ts'
import { type DirectoryQuery } from '../../../shared/community-directory.ts'
import { staffFlags, type CommunityCommand, type CreateCommunityInput } from '../../../shared/community-commands.ts'
import { type AccountReview, type CommunityRequest, type OwnCommunityRequestResponse, type StaffCandidate } from '../../../shared/community-reads.ts'
import { errorResponse } from '../http-errors.ts'
import type { FastifyInstance } from 'fastify'
import { sql } from 'kysely'
import { withEligibleActorTransaction } from '../actor-transaction.ts'
import type { AppDatabase } from '../database.ts'
import { communityCommand, createCommunity } from './commands.ts'

type PublicCommunityOperations = Pick<CommunityService, "listStandings" | "readLanding" | "publicDirectory">
export const publicCommunityRoutes: FastifyPluginAsync<{ service: PublicCommunityOperations; verify: BearerVerifier }> = async (routes, { service, verify }) => {
  // Public access and standing
  routes.get("/api/community-standings", { schema: schemas.listStandingsSchema }, async (request, reply) => { if (!await verifyOptionalIdentity(request, reply, verify)) return reply; return service.listStandings() })
  routes.get<{ Params: { slug: string } }>("/api/public/communities/:slug", { onRequest: optionalAuthentication(verify), schema: schemas.readLandingSchema }, async (request, reply) => { const row = await service.readLanding(request.params); return row ?? reply.code(404).send({ code: 'missing', requestId: request.id }) })
  routes.get<{ Params: { slug: string }; Querystring: DirectoryQuery }>("/api/public/communities/:slug/directory", { onRequest: optionalAuthentication(verify), schema: schemas.publicDirectorySchema }, request => service.publicDirectory(request.params, request.query))
}

// Pending Phase 4 request registrations; removed at checkpoint 3.
const uuid = { type: 'string', format: 'uuid' }
const string = (maxLength: number, minLength = 0) => ({ type: 'string', minLength, maxLength })
const bool = { type: 'boolean' }
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false })
const profile = object({ displayName: string(80, 1), bio: { type: ['null', 'string'], maxLength: 2000 } })
const flags = Object.fromEntries(staffFlags.map(flag => [flag, bool]))
const shapes: Record<CommunityCommand['kind'], Record<string, unknown>> = {
  join: { profile }, deactivate: {}, reactivate: {}, withdraw: { requestId: uuid }, approve: { requestId: uuid, revision: uuid },
  suspend: { target: uuid, revision: uuid, reason: string(2000) }, remove: { target: uuid, revision: uuid, reason: string(2000) },
  clear: { target: uuid, revision: uuid, reason: string(2000) }, grant: { target: uuid }, resume: { target: uuid },
  revoke: { target: uuid, reason: string(2000) }, reappoint: { target: uuid, permissions: object(flags) },
  permissions: { target: uuid, permissions: { ...object(flags, []), minProperties: 1 } },
  archive: { archived: bool },
}
const commandSchema = {
  oneOf: Object.entries(shapes).map(([kind, props]) =>
    object({ kind: { const: kind }, ...props }, ['kind', ...Object.keys(props).filter(key => key !== 'reason')]))
}
const createSchema = object({
  name: string(120, 1), slug: string(63, 3), country: string(2, 2), timezone: string(128, 1),
  region: string(120), city: string(120), profile
})
const params = object({ tenantId: uuid })
const nullableUuid = { type: ['string', 'null'], format: 'uuid' }
const timestamp = { type: 'string', format: 'date-time' }
const standing = { type: 'string', enum: ['pending', 'approved', 'suspended', 'inactive'] }
const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 409: errorResponse }
const commandResponse = object({ outcome: { type: 'string' }, tenantId: uuid, revision: uuid, requestId: uuid }, ['outcome', 'tenantId'])
const ownRequestSchema = object({ request: { ...object({ request_id: uuid, kind: { type: 'string', enum: ['join', 'reactivation'] }, requested_at: timestamp }), type: ['object', 'null'] } })
const reviewSchema = object({ standing, revision: uuid, request_id: nullableUuid })
const candidateSchema = object({
  tenant_id: uuid, user_id: uuid, standing: { type: 'string', const: 'approved' }, display_name: { type: ['string', 'null'] },
  staff_role: { type: ['string', 'null'], enum: ['owner', 'admin', null] }, staff_status: { type: ['string', 'null'], enum: ['active', 'paused', 'revoked', null] }
})
const requestSchema = object({
  id: uuid, kind: { type: 'string', enum: ['join', 'reactivation'] }, user_id: uuid, requested_at: timestamp,
  revision: uuid, standing, first_approved_at: { type: ['string', 'null'], format: 'date-time' }, has_disciplinary_restriction: bool, display_name: { type: ['string', 'null'] }
})
const pageSchema = (items: object) => object({ rows: { type: 'array', items }, next: nullableUuid })
export function registerCommunityCommands(routes: FastifyInstance, db: AppDatabase) {
  routes.post<{ Body: CreateCommunityInput }>('/api/communities', { bodyLimit: 32768, schema: { body: createSchema, querystring: object({}), response: { 201: commandResponse, ...errors } } }, async (req, reply) => {
    const actor = getAuthenticatedContext(req).actorId
    let result
    try { result = await withEligibleActorTransaction(db, getAuthenticatedContext(req), tx => createCommunity(tx, actor, req.body)) }
    catch (e) {
      if (e instanceof Error && 'code' in e && e.code === '23505') throw new ApplicationError(409, 'handle_taken')
      throw e
    }
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
    return reply.code(201).send(result.value)
  })
  routes.post<{ Params: { tenantId: string }; Body: CommunityCommand }>('/api/communities/:tenantId/commands',
    { bodyLimit: 32768, schema: { params, body: commandSchema, querystring: object({}), response: { 200: commandResponse, ...errors } } }, async (req, reply) => {
      const actor = getAuthenticatedContext(req).actorId
      const result = await withEligibleActorTransaction(db, getAuthenticatedContext(req), tx => communityCommand(tx, actor, req.params.tenantId, req.body))
      if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
      return result.value
    })
  routes.get<{ Params: { tenantId: string } }>('/api/communities/:tenantId/me/request', {
    schema: { params, querystring: object({}), response: { 200: ownRequestSchema, ...errors } },
  }, async (req, reply) => {
    const actor = getAuthenticatedContext(req).actorId, tenant = req.params.tenantId
    const result = await withEligibleActorTransaction<OwnCommunityRequestResponse | { status: 404 }>(db, getAuthenticatedContext(req), async tx => {
      await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
      const row = (await sql<OwnCommunityRequestResponse>`select case when r.id is not null then
        jsonb_build_object('request_id',r.id,'kind',r.kind,'requested_at',r.requested_at) end as request
        from public.community_accounts c join public.tenants t on t.id=c.tenant_id
        left join app_private.community_account_requests r using(tenant_id,user_id)
        where c.tenant_id=${tenant} and c.user_id=${actor} and t.operational_status='active'`.execute(tx)).rows[0]
      return row ?? { status: 404 as const }
    })
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
    if ('status' in result.value) return reply.code(result.value.status).send({ code: 'missing', requestId: req.id })
    return result.value
  })
  // Read exact revision tokens for self or an authorized target review. A
  // single statement resolves the current authority and target in one snapshot.
  routes.get<{ Params: { tenantId: string; target: string } }>('/api/communities/:tenantId/accounts/:target/review',
    { schema: { params: object({ tenantId: uuid, target: uuid }), querystring: object({}), response: { 200: reviewSchema, ...errors } } }, async (req, reply) => {
      const actor = getAuthenticatedContext(req).actorId, { tenantId, target } = req.params
      const result = await withEligibleActorTransaction(db, getAuthenticatedContext(req), async tx => {
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
      if (!result.eligible) return reply.code(403).send({ code: 'unavailable', requestId: req.id })
      if (result.value.status !== undefined) return reply.code(result.value.status).send({ code: 'unavailable', requestId: req.id })
      return result.value.row
    })
  routes.get<{ Params: { tenantId: string }; Querystring: { after?: string } }>('/api/communities/:tenantId/staff-candidates',
    { schema: { params, querystring: object({ after: uuid }, []), response: { 200: pageSchema(candidateSchema), ...errors } } }, async (req, reply) => {
      const { tenantId } = req.params
      const result = await withEligibleActorTransaction(db, getAuthenticatedContext(req), async tx => {
        await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
        const rows = (await sql<StaffCandidate>`select c.tenant_id,c.user_id,c.standing,p.display_name,s.status as staff_status,s.role as staff_role
          from public.community_accounts c left join public.community_account_profiles p using(tenant_id,user_id)
          left join public.tenant_staff_assignments s using(tenant_id,user_id)
          where c.tenant_id=${tenantId} and c.standing='approved' and app_private.is_staff_candidate(c.tenant_id,c.user_id,false)
            and (${req.query.after ?? null}::uuid is null or c.user_id>${req.query.after ?? null}::uuid)
          order by c.user_id limit 51`.execute(tx)).rows
        return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].user_id : null }
      })
      if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
      return result.value
    })
  routes.get<{ Params: { tenantId: string }; Querystring: { after?: string } }>('/api/communities/:tenantId/requests',
    { schema: { params, querystring: object({ after: uuid }, []), response: { 200: pageSchema(requestSchema), ...errors } } }, async (req, reply) => {
      const actor = getAuthenticatedContext(req).actorId, { tenantId } = req.params
      const result = await withEligibleActorTransaction(db, getAuthenticatedContext(req), async tx => {
        await sql`select set_config('ct.tenant_id',${tenantId},true)`.execute(tx)
        const rows = (await sql<CommunityRequest>`select r.id,r.kind,r.user_id,r.requested_at,c.revision,c.standing,c.first_approved_at,
          c.has_disciplinary_restriction,p.display_name from app_private.community_account_requests r
          join public.community_accounts c using(tenant_id,user_id) left join public.community_account_profiles p using(tenant_id,user_id)
          join public.tenant_staff_assignments s on s.tenant_id=r.tenant_id and s.user_id=${actor} and s.status='active'
          where r.tenant_id=${tenantId} and app_private.active_tenant(r.tenant_id)
            and (s.can_approve_users or (s.can_discipline_users and r.kind='reactivation' and c.standing='inactive' and c.has_disciplinary_restriction))
            and (${req.query.after ?? null}::uuid is null or r.id>${req.query.after ?? null}::uuid)
          order by r.id limit 51`.execute(tx)).rows
        return { rows: rows.slice(0, 50), next: rows.length > 50 ? rows[49].id : null }
      })
      if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: req.id })
      return result.value
    })
}