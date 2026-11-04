import { getAuthenticatedContext } from '../http-authentication.ts'
import type { FastifyInstance } from 'fastify'
import { sql, type Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from '../database.ts'
import { withEligibleActorTransaction, type AuthenticatedContext } from '../actor-transaction.ts'
import { errorResponse } from '../http-errors.ts'
import { communityPreferenceFields, profileInputSchema, type CommunityPreferences, type ProfileInput } from '../../../shared/self-service.ts'
import { ApplicationError } from '../application-errors.ts'

// Community operations remain here until their Phase 4 group migrates.
const uuid = { type: 'string', format: 'uuid' }

const noQuery = { type: 'object', additionalProperties: false, properties: {} }

const tenantParams = { type: 'object', required: ['tenantId'], additionalProperties: false, properties: { tenantId: uuid } }

const preferenceProperties = Object.fromEntries(communityPreferenceFields.map(key => [key,{ type: 'boolean' }]))

const preferenceResponse = { type: 'object', required: communityPreferenceFields, additionalProperties: false, properties: preferenceProperties }

const preferencePatch = { type: 'object', minProperties: 1, additionalProperties: false, properties: preferenceProperties }

export async function ownCommunityProfile(tx: Transaction<ApiTables>, actor: string, tenant: string, input: ProfileInput) {
  // Independent self edits have statement-time lifecycle checks and no tenant lock.
  const result = await sql`update public.community_account_profiles p set display_name=${input.display_name.trim()},bio=${input.bio?.trim() || null}
    where p.tenant_id=${tenant} and p.user_id=${actor} and app_private.active_tenant(p.tenant_id)
      and exists(select from public.community_accounts c join public.community_standing s using(standing)
        where c.tenant_id=p.tenant_id and c.user_id=p.user_id and s.enable_own_profile_management)
    returning p.tenant_id`.execute(tx)
  if (!result.rows.length) throw new ApplicationError(404,'missing')
  return { tenantId: tenant }
}

export async function ownCommunityPreferences(tx: Transaction<ApiTables>, actor: string, tenant: string, input?: Partial<CommunityPreferences>) {
  if (input) {
    // Account then preference is also the lifecycle writer's order. Do not take
    // a tenant lock: other members' independent saves must remain concurrent.
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    const account = (await sql<{ standing: string }>`select standing from public.community_accounts
      where tenant_id=${tenant} and user_id=${actor} for update`.execute(tx)).rows[0]
    if (!account || !['pending','approved'].includes(account.standing)) throw new ApplicationError(404,'missing')
  }
  const fields = sql.join(communityPreferenceFields.map(field => sql.id(field)))
  const result = input
    ? await sql<CommunityPreferences>`update public.community_account_preferences set ${sql.join(Object.entries(input).map(([key,value]) => sql`${sql.id(key)}=${value}`))}
        where tenant_id=${tenant} and user_id=${actor} and app_private.active_tenant(tenant_id) returning ${fields}`.execute(tx)
    : await sql<CommunityPreferences>`select ${fields} from public.community_account_preferences where tenant_id=${tenant} and user_id=${actor}
        and (app_private.active_tenant(tenant_id) or app_private.is_approved_owner(tenant_id))`.execute(tx)
  if (!result.rows[0]) throw new ApplicationError(404,'missing')
  return result.rows[0]
}

export function registerCommunitySelfService(routes: FastifyInstance, db: AppDatabase) {
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
  async function run<T>(context: AuthenticatedContext, work: (tx: Transaction<ApiTables>) => Promise<T>) {
    const result = await withEligibleActorTransaction(db,context,work)
    if (!result.eligible) throw new ApplicationError(403,'ineligible')
    return result.value
  }
  routes.patch<{ Params: { tenantId: string }; Body: ProfileInput }>('/api/communities/:tenantId/me/profile',{
    schema: { params: tenantParams, querystring: noQuery, body: profileInputSchema, response: {
      200: { type: 'object', required: ['tenantId'], additionalProperties: false, properties: { tenantId: uuid } }, ...errors,
    } },
  },request => run(getAuthenticatedContext(request),tx => ownCommunityProfile(tx,getAuthenticatedContext(request).actorId,request.params.tenantId,request.body)))
  routes.get<{ Params: { tenantId: string } }>('/api/communities/:tenantId/me/preferences',{
    schema: { params: tenantParams, querystring: noQuery, response: { 200: preferenceResponse, ...errors } },
  },request => run(getAuthenticatedContext(request),tx => ownCommunityPreferences(tx,getAuthenticatedContext(request).actorId,request.params.tenantId)))
  routes.patch<{ Params: { tenantId: string }; Body: Partial<CommunityPreferences> }>('/api/communities/:tenantId/me/preferences',{
    schema: { params: tenantParams, querystring: noQuery, body: preferencePatch, response: { 200: preferenceResponse, ...errors } },
  },request => run(getAuthenticatedContext(request),tx => ownCommunityPreferences(tx,getAuthenticatedContext(request).actorId,request.params.tenantId,request.body)))
}
