import { getAuthenticatedContext } from '../http-authentication.ts'
import type { FastifyInstance } from 'fastify'
import { sql, type Transaction } from 'kysely'
import type { ApiTables, AppDatabase } from '../database.ts'
import { withEligibleActorTransaction, type AuthenticatedContext } from '../actor-transaction.ts'
import { errorResponse } from '../http-errors.ts'
import { ApplicationError } from '../application-errors.ts'
import { copySlots, settingFields, type CopyKey, type CommunityCopy, type CommunityDetails, type CommunityDetailsInput, type CommunitySettings, type CommunitySettingsRecord } from '../../../shared/community-configuration.ts'

type Tx = Transaction<ApiTables>

type Kind = 'details' | 'settings' | 'copy'

const uuid = { type: 'string', format: 'uuid' }

const text = (maxLength: number, minLength = 1) => ({ type: 'string', maxLength, minLength })

const object = (properties: Record<string,unknown>, required = Object.keys(properties)) =>
  ({ type: 'object', properties, required, additionalProperties: false })

const attribution = { created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
  created_by: { type: ['string','null'], format: 'uuid' }, updated_by: { type: ['string','null'], format: 'uuid' } }

const detailInput = { name: text(120), country_code: { type: 'string', pattern: '^[A-Z]{2}$' },
  state_province: { type: ['string','null'], maxLength: 120 }, city: { type: ['string','null'], maxLength: 120 }, timezone: text(128) }

const detailsSchema = object({ id: uuid, slug: text(63), ...detailInput, operational_status: { type: 'string', enum: ['active','archived'] }, ...attribution })

const settingsInput = Object.fromEntries(settingFields.map(key => [key,{ type: 'boolean' }]))

const settingsSchema = object({ tenant_id: uuid, ...settingsInput, ...attribution })

const copyKey = { type: 'string', enum: Object.keys(copySlots) }

const publicCopy = { tenant_id: uuid, content_key: copyKey, text_value: text(2000) }

const copySchema = object({ ...publicCopy, ...attribution })

const detailFields = sql`id,slug,name,country_code,state_province,city,timezone,operational_status,created_at,updated_at,created_by,updated_by`

const settingsFields = sql`tenant_id,${sql.join(settingFields.map(key=>sql.id(key)))},created_at,updated_at,created_by,updated_by`

const copyFields = sql`tenant_id,content_key,text_value,created_at,updated_at,created_by,updated_by`

async function authorize(tx: Tx, actor: string, tenant: string, kind: Kind, write: boolean) {
  await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
  // Management reads share the same root so their current authority cannot be
  // revoked between the check and the full-row projection.
  const site = (await sql`select id from public.tenants where id=${tenant} ${write ? sql`for update` : sql`for share`}`.execute(tx)).rows[0]
  if (!site) throw new ApplicationError(404,'missing')
  const allowed = (await sql<{ allowed: boolean }>`select ${write
    ? sql`app_private.can_edit_configuration(${tenant},${kind})`
    : sql`app_private.is_approved_owner(${tenant}) or (app_private.active_tenant(${tenant}) and exists(
        select from public.community_accounts c where c.tenant_id=${tenant} and c.user_id=${actor} and c.standing in ('approved','suspended')))`
  } as allowed`.execute(tx)).rows[0]?.allowed
  if (!allowed) throw new ApplicationError(write ? 403 : 404,write ? 'forbidden' : 'missing')
}

export async function configurationDetails(tx: Tx, actor: string, tenant: string, input?: Partial<CommunityDetailsInput>) {
  await authorize(tx,actor,tenant,'details',Boolean(input))
  if (input) {
    if (['name','country_code','timezone'].some(key => key in input && !String(input[key as keyof CommunityDetailsInput]).trim())) {
      throw new ApplicationError(400,'invalid_details')
    }
    const entries = Object.entries(input).map(([key,value]) => [key,typeof value === 'string' ? value.trim() || null : value] as const)
    await sql`update public.tenants set ${sql.join(entries.map(([key,value])=>sql`${sql.id(key)}=${value}`))}
      where id=${tenant} and (${sql.join(entries.map(([key,value])=>sql`${sql.id(key)} is distinct from ${value}`),sql` or `)})`.execute(tx)
  }
  return (await sql<CommunityDetails>`select ${detailFields} from public.tenants where id=${tenant}`.execute(tx)).rows[0]
}

export async function configurationSettings(tx: Tx, actor: string, tenant: string, input?: Partial<CommunitySettings>) {
  await authorize(tx,actor,tenant,'settings',Boolean(input))
  if (input) {
    const entries = Object.entries(input)
    await sql`update public.tenant_settings set ${sql.join(entries.map(([key,value])=>sql`${sql.id(key)}=${value}`))}
      where tenant_id=${tenant} and (${sql.join(entries.map(([key,value])=>sql`${sql.id(key)} is distinct from ${value}`),sql` or `)})`.execute(tx)
  }
  return (await sql<CommunitySettingsRecord>`select ${settingsFields} from public.tenant_settings where tenant_id=${tenant}`.execute(tx)).rows[0]
}

export async function configurationCopy(tx: Tx, actor: string, tenant: string, change?: { key: CopyKey; text?: string }) {
  await authorize(tx,actor,tenant,'copy',Boolean(change))
  if (change) {
    if (change.text === undefined) {
      const deleted = await sql`delete from public.tenant_website_content_overrides where tenant_id=${tenant} and content_key=${change.key} returning content_key`.execute(tx)
      if (!deleted.rows.length) throw new ApplicationError(404,'missing')
    } else {
      if (!change.text.trim() || Array.from(change.text).length>copySlots[change.key]) throw new ApplicationError(400,'invalid_copy')
      await sql`insert into public.tenant_website_content_overrides(tenant_id,content_key,text_value) values(${tenant},${change.key},${change.text})
        on conflict(tenant_id,content_key) do update set text_value=excluded.text_value
        where tenant_website_content_overrides.text_value is distinct from excluded.text_value`.execute(tx)
    }
  }
  return { rows: (await sql<CommunityCopy>`select ${copyFields} from public.tenant_website_content_overrides where tenant_id=${tenant} order by content_key`.execute(tx)).rows }
}

export function registerCommunityConfiguration(routes: FastifyInstance, db: AppDatabase) {
  const params = object({ tenantId: uuid }), errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
  const copyResponse = object({ rows: { type: 'array', items: copySchema } })
  async function run<T>(context: AuthenticatedContext, work: (tx: Tx)=>Promise<T>) {
    const result = await withEligibleActorTransaction(db,context,work)
    if (!result.eligible) throw new ApplicationError(403,'ineligible')
    return result.value
  }
  routes.get<{Params:{tenantId:string}}>('/api/communities/:tenantId/details',{schema:{params,querystring:object({}),response:{200:detailsSchema,...errors}}},req=>
    run(getAuthenticatedContext(req),tx=>configurationDetails(tx,getAuthenticatedContext(req).actorId,req.params.tenantId)))
  routes.patch<{Params:{tenantId:string};Body:Partial<CommunityDetailsInput>}>('/api/communities/:tenantId/details',{
    schema:{params,querystring:object({}),body:{...object(detailInput,[]),minProperties:1},response:{200:detailsSchema,...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>configurationDetails(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,req.body)))
  routes.get<{Params:{tenantId:string}}>('/api/communities/:tenantId/settings',{schema:{params,querystring:object({}),response:{200:settingsSchema,...errors}}},req=>
    run(getAuthenticatedContext(req),tx=>configurationSettings(tx,getAuthenticatedContext(req).actorId,req.params.tenantId)))
  routes.patch<{Params:{tenantId:string};Body:Partial<CommunitySettings>}>('/api/communities/:tenantId/settings',{
    schema:{params,querystring:object({}),body:{...object(settingsInput,[]),minProperties:1},response:{200:settingsSchema,...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>configurationSettings(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,req.body)))
  routes.get<{Params:{tenantId:string}}>('/api/communities/:tenantId/copy',{schema:{params,querystring:object({}),response:{200:copyResponse,...errors}}},req=>
    run(getAuthenticatedContext(req),tx=>configurationCopy(tx,getAuthenticatedContext(req).actorId,req.params.tenantId)))
  routes.put<{Params:{tenantId:string;contentKey:CopyKey};Body:{text_value:string}}>('/api/communities/:tenantId/copy/:contentKey',{
    schema:{params:object({tenantId:uuid,contentKey:copyKey}),querystring:object({}),body:object({text_value:text(2000)}),response:{200:copyResponse,...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>configurationCopy(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,{key:req.params.contentKey,text:req.body.text_value})))
  routes.delete<{Params:{tenantId:string;contentKey:CopyKey}}>('/api/communities/:tenantId/copy/:contentKey',{
    schema:{params:object({tenantId:uuid,contentKey:copyKey}),querystring:object({}),response:{200:copyResponse,...errors}},
  },req=>run(getAuthenticatedContext(req),tx=>configurationCopy(tx,getAuthenticatedContext(req).actorId,req.params.tenantId,{key:req.params.contentKey})))
}