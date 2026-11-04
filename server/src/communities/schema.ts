import { errorResponse } from '../http-errors.ts'
import { copySlots } from '../../../shared/community-configuration.ts'
import { staffFlags, type CommunityCommand } from '../../../shared/community-commands.ts'

const standingSchemas = (() => {
  const fields = ['standing', 'enable_standard_chat_visibility', 'enable_standard_activity_visibility',
    'enable_other_profile_visibility', 'enable_own_profile_management', 'enable_standard_participation',
    'enable_standard_dms'] as const
  return {
    listStandings: {
      querystring: { type: 'object', additionalProperties: false, properties: {} },
      response: {
        401: errorResponse, 200: {
          type: 'array', items: {
            type: 'object', required: fields,
            properties: Object.fromEntries(fields.map(field => [field, { type: field === 'standing' ? 'string' : 'boolean' }]))
          }
        }
      },
    }
  }
})()

const configSchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' }
  const text = (maxLength: number, minLength = 1) => ({ type: 'string', maxLength, minLength })
  const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
    ({ type: 'object', properties, required, additionalProperties: false })
  const detailInput = {
    name: text(120), country_code: { type: 'string', pattern: '^[A-Z]{2}$' },
    state_province: { type: ['string', 'null'], maxLength: 120 }, city: { type: ['string', 'null'], maxLength: 120 }, timezone: text(128)
  }
  const copyKey = { type: 'string', enum: Object.keys(copySlots) }
  const publicCopy = { tenant_id: uuid, content_key: copyKey, text_value: text(2000) }
  const landingSchema = object({
    id: uuid, slug: text(63), ...detailInput, auto_approve_users: { type: 'boolean' },
    allow_public_chat_visibility: { type: 'boolean' }, allow_public_activity_visibility: { type: 'boolean' },
    allow_public_directory_visibility: { type: 'boolean' }, overrides: { type: 'array', items: object(publicCopy) }
  })
  return {
    readLanding: {
      params: object({ slug: { type: 'string', minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' } }), querystring: object({}),
      response: { 200: landingSchema, 400: errorResponse, 401: errorResponse, 404: errorResponse },
    }
  }
})()

const directorySchemas = (() => {
  const object = (properties: Record<string, unknown>, required = Object.keys(properties)) =>
    ({ type: 'object', properties, required, additionalProperties: false })
  const role = { type: ['string', 'null'], enum: ['owner', 'admin', null] }
  const publicRow = object({ display_name: { type: 'string' }, staff_role: role })
  const page = (items: object) => object({ rows: { type: 'array', items }, next: { type: ['string', 'null'] } })
  const querySchema = object({ limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' }, cursor: { type: 'string', minLength: 1, maxLength: 1024 } }, [])
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
  return {
    publicDirectory: { params: object({ slug: { type: 'string', minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' } }), querystring: querySchema, response: { 200: page(publicRow), ...errors } }
  }
})()

const routesSchemas = (() => {
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
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 409: errorResponse }
  const commandResponse = object({ outcome: { type: 'string' }, tenantId: uuid, revision: uuid, requestId: uuid }, ['outcome', 'tenantId'])
  return {
    createCommunity: { body: createSchema, querystring: object({}), response: { 201: commandResponse, ...errors } },
    executeCommand: { params, body: commandSchema, querystring: object({}), response: { 200: commandResponse, ...errors } }
  }
})()

// Public access and standing
export const listStandingsSchema = standingSchemas.listStandings
export const readLandingSchema = configSchemas.readLanding
export const publicDirectorySchema = directorySchemas.publicDirectory

// Creation and lifecycle
export const createCommunitySchema = routesSchemas.createCommunity
export const executeCommandSchema = routesSchemas.executeCommand
