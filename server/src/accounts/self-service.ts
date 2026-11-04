import { getAuthenticatedContext } from '../http-authentication.ts'
import type { FastifyInstance } from 'fastify'
import { sql, type Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from '../database.ts'
import { withEligibleActorTransaction, type AuthenticatedContext } from '../actor-transaction.ts'
import { errorResponse } from '../http-errors.ts'
import { communityPreferenceFields, myCommunitiesPath, ownProfilePath, profileInputSchema,
  type CommunityPreferences, type CommunitySummary, type CommunitySummaryPage, type CommunitySummaryQuery,
  type OwnProfile, type ProfileInput } from '../../../shared/self-service.ts'
import { ApplicationError } from '../application-errors.ts'

const uuid = { type: 'string', format: 'uuid' }
const nullableUuid = { type: ['string','null'], format: 'uuid' }
const timestamp = { type: 'string', format: 'date-time' }
const noQuery = { type: 'object', additionalProperties: false, properties: {} }
const tenantParams = { type: 'object', required: ['tenantId'], additionalProperties: false, properties: { tenantId: uuid } }
const profile = { type: ['object','null'], required: ['user_id','display_name','bio','created_at','updated_at','created_by','updated_by'],
  additionalProperties: false, properties: { ...profileInputSchema.properties, user_id: uuid,
    created_at: timestamp, updated_at: timestamp, created_by: nullableUuid, updated_by: nullableUuid } }
const profileResponse = { type: 'object', required: ['profile'], additionalProperties: false, properties: { profile } }
const preferenceProperties = Object.fromEntries(communityPreferenceFields.map(key => [key,{ type: 'boolean' }]))
const preferenceResponse = { type: 'object', required: communityPreferenceFields, additionalProperties: false, properties: preferenceProperties }
const preferencePatch = { type: 'object', minProperties: 1, additionalProperties: false, properties: preferenceProperties }
const summaryFields = { id: uuid, name: { type: 'string' }, city: { type: ['string','null'] },
  state_province: { type: ['string','null'] }, country_code: { type: 'string' },
  operational_status: { type: 'string', enum: ['active','archived'] }, created_at: timestamp,
  is_owned: { type: 'boolean' }, is_managed: { type: 'boolean' }, is_member: { type: 'boolean' } }
const summaryResponse = { type: 'object', required: ['rows','next'], additionalProperties: false, properties: {
  rows: { type: 'array', items: { type: 'object', required: Object.keys(summaryFields), additionalProperties: false, properties: summaryFields } },
  next: { type: ['string','null'] },
} }

export async function ownProfile(tx: Transaction<ApiTables>, actor: string, input?: ProfileInput) {
  const fields = sql`user_id,display_name,bio,created_at,updated_at,created_by,updated_by`
  const result = input
    ? await sql<OwnProfile>`insert into public.user_account_profiles(display_name,bio) values(${input.display_name.trim()},${input.bio?.trim() || null})
        on conflict(user_id) do update set display_name=excluded.display_name,bio=excluded.bio returning ${fields}`.execute(tx)
    : await sql<OwnProfile>`select ${fields} from public.user_account_profiles where user_id=${actor}`.execute(tx)
  return { profile: result.rows[0] ?? null }
}

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

export async function myCommunities(tx: Transaction<ApiTables>, actor: string, query: CommunitySummaryQuery): Promise<CommunitySummaryPage> {
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

export function registerSelfService(routes: FastifyInstance, db: AppDatabase) {
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
  async function run<T>(context: AuthenticatedContext, work: (tx: Transaction<ApiTables>) => Promise<T>) {
    const result = await withEligibleActorTransaction(db,context,work)
    if (!result.eligible) throw new ApplicationError(403,'ineligible')
    return result.value
  }
  routes.get(ownProfilePath,{ schema: { querystring: noQuery, response: { 200: profileResponse, ...errors } } },request =>
    run(getAuthenticatedContext(request),tx => ownProfile(tx,getAuthenticatedContext(request).actorId)))
  routes.put<{ Body: ProfileInput }>(ownProfilePath,{ schema: { querystring: noQuery, body: profileInputSchema, response: { 200: profileResponse, ...errors } } },request =>
    run(getAuthenticatedContext(request),tx => ownProfile(tx,getAuthenticatedContext(request).actorId,request.body)))
  routes.get<{ Querystring: CommunitySummaryQuery }>(myCommunitiesPath,{ schema: { querystring: {
    type: 'object', additionalProperties: false, properties: { filter: { type: 'string', enum: ['all','managed','owned'] },
      cursor: { type: 'string', maxLength: 1024 }, limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' } },
  }, response: { 200: summaryResponse, ...errors } } },request =>
    run(getAuthenticatedContext(request),tx => myCommunities(tx,getAuthenticatedContext(request).actorId,request.query)))
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
