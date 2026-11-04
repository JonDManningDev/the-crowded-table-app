import { getAuthenticatedContext } from '../http-authentication.ts'
import { sql } from 'kysely'
import type { FastifyInstance } from 'fastify'
import { withEligibleActorTransaction } from '../actor-transaction.ts'
import type { AppDatabase } from '../database.ts'
import { errorResponse } from '../http-errors.ts'

const uuid = { type: 'string', format: 'uuid' }
const fields = ['tenant_id', 'user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by'] as const
const profileSchema = {
  type: 'object', required: fields, additionalProperties: false,
  properties: {
    tenant_id: uuid, user_id: uuid, display_name: { type: 'string' }, bio: { type: ['string', 'null'] },
    created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
    created_by: { type: ['string','null'], format: 'uuid' }, updated_by: { type: ['string','null'], format: 'uuid' },
  },
}

export function registerCommunityProfile(routes: FastifyInstance, db: AppDatabase) {
  routes.get<{ Params: { tenantId: string; userId: string } }>('/api/communities/:tenantId/accounts/:userId/profile', {
    schema: {
      params: { type: 'object', required: ['tenantId','userId'], properties: { tenantId: uuid, userId: uuid } },
      querystring: { type: 'object', additionalProperties: false, properties: {} },
      response: { 200: profileSchema, 403: errorResponse, 404: errorResponse },
    },
  }, async (request, reply) => {
    const { tenantId, userId } = request.params
    const actor = getAuthenticatedContext(request).actorId
    const result = await withEligibleActorTransaction(db, getAuthenticatedContext(request), async tx => {
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
            eb.and([eb('viewer.standing', 'in', ['approved','suspended']),
              eb('target.standing', 'in', ['approved','suspended','inactive'])]),
          ])]),
          eb.and([sql<boolean>`not app_private.active_tenant(p.tenant_id)`, sql<boolean>`app_private.is_approved_owner(p.tenant_id)`]),
        ]))
        .select(fields.map(field => `p.${field}` as const)).executeTakeFirst()
      return profile ? { status: 200 as const, profile } : { status: 404 as const }
    })
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    if (result.value.status === 200) return result.value.profile
    return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
  })
}
