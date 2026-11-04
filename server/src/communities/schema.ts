import type { FromSchema } from 'json-schema-to-ts'
import { errorResponse } from '../http-errors.ts'
import { copySlots, settingFields, type CopyKey, type CommunitySettings } from '../../../shared/community-configuration.ts'
import { staffFlags, type CommunityCommand } from '../../../shared/community-commands.ts'
import { communityPreferenceFields, profileInputSchema, type CommunityPreferences } from '../../../shared/self-service.ts'

// Preserve each schema's exact required-array value while retaining literal types.
type ObjectSchema<P, R> = { type: 'object'; properties: P; required: R; additionalProperties: false }
function object<const P extends Record<string, unknown>>(properties: P): ObjectSchema<P, (keyof P & string)[]>
function object<const P extends Record<string, unknown>, const R extends readonly string[]>(properties: P, required: R): ObjectSchema<P, R>
function object(properties: Record<string, unknown>, required: readonly string[] = Object.keys(properties)) {
  return { type: 'object', properties, required, additionalProperties: false } as const
}

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
  } as const
})()

const configSchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' } as const
  const text = (maxLength: number, minLength = 1) => ({ type: 'string', maxLength, minLength }) as const
  const attribution = {
    created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
    created_by: { type: ['string', 'null'], format: 'uuid' }, updated_by: { type: ['string', 'null'], format: 'uuid' }
  } as const
  const detailInput = {
    name: text(120), country_code: { type: 'string', pattern: '^[A-Z]{2}$' },
    state_province: { type: ['string', 'null'], maxLength: 120 }, city: { type: ['string', 'null'], maxLength: 120 }, timezone: text(128)
  } as const
  const detailsSchema = object({ id: uuid, slug: text(63), ...detailInput, operational_status: { type: 'string', enum: ['active', 'archived'] }, ...attribution })
  const settingsInput = Object.fromEntries(settingFields.map(key => [key, { type: 'boolean' }]))
  const settingsSchema = object({ tenant_id: uuid, ...settingsInput, ...attribution })
  const copyKey = { type: 'string', enum: Object.keys(copySlots) as CopyKey[] } as const
  const publicCopy = { tenant_id: uuid, content_key: copyKey, text_value: text(2000) } as const
  const copySchema = object({ ...publicCopy, ...attribution })
  const landingSchema = object({
    id: uuid, slug: text(63), ...detailInput, auto_approve_users: { type: 'boolean' },
    allow_public_chat_visibility: { type: 'boolean' }, allow_public_activity_visibility: { type: 'boolean' },
    allow_public_directory_visibility: { type: 'boolean' }, overrides: { type: 'array', items: object(publicCopy) }
  })
  const params = object({ tenantId: uuid }), errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse } as const
  const copyResponse = object({ rows: { type: 'array', items: copySchema } })
  return {
    readLanding: {
      params: object({ slug: { type: 'string', minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' } }), querystring: object({}),
      response: { 200: landingSchema, 400: errorResponse, 401: errorResponse, 404: errorResponse },
    },
    readDetails: { params, querystring: object({}), response: { 200: detailsSchema, ...errors } },
    saveDetails: { params, querystring: object({}), body: { ...object(detailInput, []), minProperties: 1 }, response: { 200: detailsSchema, ...errors } },
    readSettings: { params, querystring: object({}), response: { 200: settingsSchema, ...errors } },
    saveSettings: { params, querystring: object({}), body: { ...object(settingsInput, []), minProperties: 1 }, response: { 200: settingsSchema, ...errors } },
    readCopy: { params, querystring: object({}), response: { 200: copyResponse, ...errors } },
    saveCopy: { params: object({ tenantId: uuid, contentKey: copyKey }), querystring: object({}), body: object({ text_value: text(2000) }), response: { 200: copyResponse, ...errors } },
    deleteCopy: { params: object({ tenantId: uuid, contentKey: copyKey }), querystring: object({}), response: { 200: copyResponse, ...errors } }
  } as const
})()

const directorySchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' } as const
  const audit = {
    created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
    created_by: { type: ['string', 'null'], format: 'uuid' }, updated_by: { type: ['string', 'null'], format: 'uuid' }
  } as const
  const facts = {
    tenant_id: uuid, user_id: uuid, standing: { type: 'string', enum: ['pending', 'approved', 'suspended', 'inactive'] },
    first_approved_at: { type: ['string', 'null'], format: 'date-time' }, has_disciplinary_restriction: { type: 'boolean' }, ...audit
  } as const
  const profile = { tenant_id: uuid, user_id: uuid, display_name: { type: 'string' }, bio: { type: ['string', 'null'] }, ...audit } as const
  const role = { type: ['string', 'null'], enum: ['owner', 'admin', null] } as const
  const memberRow = object({ account: object(facts), profile: { ...object(profile), type: ['object', 'null'] }, staff_role: role })
  const publicRow = object({ display_name: { type: 'string' }, staff_role: role })
  const page = (items: object) => object({ rows: { type: 'array', items }, next: { type: ['string', 'null'] } })
  const querySchema = object({ limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' }, cursor: { type: 'string', minLength: 1, maxLength: 1024 } }, [])
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse } as const
  const params = object({ tenantId: uuid })
  return {
    publicDirectory: { params: object({ slug: { type: 'string', minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' } }), querystring: querySchema, response: { 200: page(publicRow), ...errors } },
    memberDirectory: { params, querystring: querySchema, response: { 200: page(memberRow), ...errors } },
    ownerAccounts: { params, querystring: querySchema, response: { 200: page(object(facts)), ...errors } },
    accountFacts: { params: object({ tenantId: uuid, userId: uuid }), querystring: object({}), response: { 200: object(facts), ...errors } }
  } as const
})()

const routesSchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' } as const
  const string = (maxLength: number, minLength = 0) => ({ type: 'string', minLength, maxLength }) as const
  const bool = { type: 'boolean' } as const
  const profile = object({ displayName: string(80, 1), bio: { type: ['null', 'string'], maxLength: 2000 } })
  const flags = Object.fromEntries(staffFlags.map(flag => [flag, bool]))
  const shapes: Record<CommunityCommand['kind'], Record<string, unknown>> = {
    join: { profile }, deactivate: {}, reactivate: {}, withdraw: { requestId: uuid }, approve: { requestId: uuid, revision: uuid },
    suspend: { target: uuid, revision: uuid, reason: string(2000) }, remove: { target: uuid, revision: uuid, reason: string(2000) },
    clear: { target: uuid, revision: uuid, reason: string(2000) }, grant: { target: uuid }, resume: { target: uuid },
    revoke: { target: uuid, reason: string(2000) }, reappoint: { target: uuid, permissions: object(flags) },
    permissions: { target: uuid, permissions: { ...object(flags, []), minProperties: 1 } },
    archive: { archived: bool },
  } as const
  const commandSchema = {
    oneOf: Object.entries(shapes).map(([kind, props]) =>
      object({ kind: { const: kind }, ...props }, ['kind', ...Object.keys(props).filter(key => key !== 'reason')]))
  } as const
  const createSchema = object({
    name: string(120, 1), slug: string(63, 3), country: string(2, 2), timezone: string(128, 1),
    region: string(120), city: string(120), profile
  })
  const params = object({ tenantId: uuid })
  const nullableUuid = { type: ['string', 'null'], format: 'uuid' } as const
  const timestamp = { type: 'string', format: 'date-time' } as const
  const standing = { type: 'string', enum: ['pending', 'approved', 'suspended', 'inactive'] } as const
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 409: errorResponse } as const
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
  return {
    createCommunity: { body: createSchema, querystring: object({}), response: { 201: commandResponse, ...errors } },
    executeCommand: { params, body: commandSchema, querystring: object({}), response: { 200: commandResponse, ...errors } },
    ownRequest: { params, querystring: object({}), response: { 200: ownRequestSchema, ...errors } },
    reviewAccount: { params: object({ tenantId: uuid, target: uuid }), querystring: object({}), response: { 200: reviewSchema, ...errors } },
    staffCandidates: { params, querystring: object({ after: uuid }, []), response: { 200: pageSchema(candidateSchema), ...errors } },
    pendingRequests: { params, querystring: object({ after: uuid }, []), response: { 200: pageSchema(requestSchema), ...errors } }
  } as const
})()

const profileSchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' } as const
  const fields = ['tenant_id', 'user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by'] as const
  const profileSchema = {
    type: 'object', required: fields, additionalProperties: false,
    properties: {
      tenant_id: uuid, user_id: uuid, display_name: { type: 'string' }, bio: { type: ['string', 'null'] },
      created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' },
      created_by: { type: ['string', 'null'], format: 'uuid' }, updated_by: { type: ['string', 'null'], format: 'uuid' },
    },
  } as const
  return {
    readProfile: {
      params: { type: 'object', required: ['tenantId', 'userId'], properties: { tenantId: uuid, userId: uuid } },
      querystring: { type: 'object', additionalProperties: false, properties: {} },
      response: { 200: profileSchema, 403: errorResponse, 404: errorResponse },
    }
  } as const
})()

const selfSchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' } as const
  const noQuery = { type: 'object', additionalProperties: false, properties: {} } as const
  const tenantParams = { type: 'object', required: ['tenantId'], additionalProperties: false, properties: { tenantId: uuid } } as const
  const preferenceProperties = Object.fromEntries(communityPreferenceFields.map(key => [key, { type: 'boolean' }]))
  const preferenceResponse = { type: 'object', required: communityPreferenceFields, additionalProperties: false, properties: preferenceProperties } as const
  const preferencePatch = { type: 'object', minProperties: 1, additionalProperties: false, properties: preferenceProperties } as const
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse } as const
  return {
    saveOwnProfile: {
      params: tenantParams, querystring: noQuery, body: profileInputSchema, response: {
        200: { type: 'object', required: ['tenantId'], additionalProperties: false, properties: { tenantId: uuid } }, ...errors,
      }
    },
    readOwnPreferences: { params: tenantParams, querystring: noQuery, response: { 200: preferenceResponse, ...errors } },
    saveOwnPreferences: { params: tenantParams, querystring: noQuery, body: preferencePatch, response: { 200: preferenceResponse, ...errors } }
  } as const
})()

const recordsSchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' } as const
  const metadata = {
    tenant_id: uuid, user_id: uuid, created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }, created_by: { type: ['string', 'null'], format: 'uuid' },
    updated_by: { type: ['string', 'null'], format: 'uuid' }
  } as const
  const schemas = {
    staff: object({
      ...metadata, role: { type: 'string', enum: ['owner', 'admin'] },
      status: { type: 'string', enum: ['active', 'paused', 'revoked'] },
      ...Object.fromEntries(staffFlags.map(key => [key, { type: 'boolean' }]))
    }),
    participant: object({ ...metadata, can_post_public_events: { type: 'boolean' } }),
  } as const
  const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse } as const
  return {
    listStaff: {
      params: object({ tenantId: uuid }), querystring: object({
        cursor: { type: 'string', minLength: 1, maxLength: 1024 },
        limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' }
      }, []), response: { 200: object({ rows: { type: 'array', items: schemas["staff"] }, next: { type: ['string', 'null'] } }), ...errors }
    },
    readStaff: { params: object({ tenantId: uuid, userId: uuid }), querystring: object({}), response: { 200: schemas["staff"], ...errors } },
    listParticipantPermissions: {
      params: object({ tenantId: uuid }), querystring: object({
        cursor: { type: 'string', minLength: 1, maxLength: 1024 },
        limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' }
      }, []), response: { 200: object({ rows: { type: 'array', items: schemas["participant"] }, next: { type: ['string', 'null'] } }), ...errors }
    },
    readParticipantPermissions: { params: object({ tenantId: uuid, userId: uuid }), querystring: object({}), response: { 200: schemas["participant"], ...errors } },
    saveParticipantPermissions: { params: object({ tenantId: uuid, userId: uuid }), querystring: object({}), body: object({ can_post_public_events: { type: 'boolean' } }), response: { 200: schemas.participant, ...errors } }
  } as const
})()

const historySchemas = (() => {
  const uuid = { type: 'string', format: 'uuid' } as const
  const nullableUuid = { type: ['string', 'null'], format: 'uuid' } as const
  const category = { type: 'string', enum: ['community_account', 'staff_account'] } as const
  const fields = {
    id: uuid, tenant_id: uuid, action: { type: 'string' }, target_user_id: nullableUuid,
    content_key: { type: ['string', 'null'] }, created_at: { type: 'string', format: 'date-time' },
    created_by: nullableUuid, operation_id: uuid, reason: { type: ['string', 'null'] },
    details: { type: 'object', additionalProperties: true }, categories: { type: 'array', items: category },
  } as const
  return {
    history: {
      params: { type: 'object', required: ['tenantId'], additionalProperties: false, properties: { tenantId: uuid } },
      querystring: {
        type: 'object', additionalProperties: false, properties: {
          target: uuid, category, eventId: uuid, cursor: { type: 'string', maxLength: 1024 },
          limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' },
        }
      },
      response: {
        200: {
          type: 'object', required: ['rows', 'next'], additionalProperties: false, properties: {
            rows: { type: 'array', items: { type: 'object', required: Object.keys(fields), additionalProperties: false, properties: fields } },
            next: { type: ['string', 'null'] },
          }
        }, 400: errorResponse, 401: errorResponse, 403: errorResponse
      },
    }
  } as const
})()

// Public access and standing
export const listStandingsSchema = standingSchemas.listStandings
export const readLandingSchema = configSchemas.readLanding
export type ReadLandingParams = FromSchema<typeof readLandingSchema.params>
export const publicDirectorySchema = directorySchemas.publicDirectory
export type DirectoryQuery = FromSchema<typeof publicDirectorySchema.querystring>

// Creation and lifecycle
export const createCommunitySchema = routesSchemas.createCommunity
export type CreateCommunityBody = FromSchema<typeof createCommunitySchema.body>
export const executeCommandSchema = routesSchemas.executeCommand
// Command oneOf is generated by kind; retain its shared discriminated union.
export type ExecuteCommandBody = CommunityCommand

// Requests and reviews
export const ownRequestSchema = routesSchemas.ownRequest
export type CommunityParams = FromSchema<typeof ownRequestSchema.params>
export const reviewAccountSchema = routesSchemas.reviewAccount
export type ReviewParams = FromSchema<typeof reviewAccountSchema.params>
export const staffCandidatesSchema = routesSchemas.staffCandidates
export type RequestPageQuery = FromSchema<typeof staffCandidatesSchema.querystring>
export const pendingRequestsSchema = routesSchemas.pendingRequests

// Profiles and preferences
export const readProfileSchema = profileSchemas.readProfile
export type ReadProfileParams = FromSchema<typeof readProfileSchema.params>
export const saveOwnProfileSchema = selfSchemas.saveOwnProfile
export type CommunityProfileInput = FromSchema<typeof profileInputSchema>
export const readOwnPreferencesSchema = selfSchemas.readOwnPreferences
export const saveOwnPreferencesSchema = selfSchemas.saveOwnPreferences
// Dynamic flag maps retain the browser-safe DTO contract.
export type SaveOwnPreferencesBody = Partial<CommunityPreferences>

// Configuration and copy
export const readDetailsSchema = configSchemas.readDetails
export const saveDetailsSchema = configSchemas.saveDetails
export type SaveDetailsBody = FromSchema<typeof saveDetailsSchema.body>
export const readSettingsSchema = configSchemas.readSettings
export const saveSettingsSchema = configSchemas.saveSettings
// Dynamic settings maps retain the browser-safe DTO contract.
export type SaveSettingsBody = Partial<CommunitySettings>
export const readCopySchema = configSchemas.readCopy
export const saveCopySchema = configSchemas.saveCopy
export type CopyParams = FromSchema<typeof saveCopySchema.params>
export type SaveCopyBody = FromSchema<typeof saveCopySchema.body>
export const deleteCopySchema = configSchemas.deleteCopy

// Directories and account facts
export const memberDirectorySchema = directorySchemas.memberDirectory
export const ownerAccountsSchema = directorySchemas.ownerAccounts
export const accountFactsSchema = directorySchemas.accountFacts

// Staff and participant permissions
export const listStaffSchema = recordsSchemas.listStaff
export type RecordQuery = FromSchema<typeof listStaffSchema.querystring>
export const readStaffSchema = recordsSchemas.readStaff
export type CommunityAccountParams = FromSchema<typeof readStaffSchema.params>
export const listParticipantPermissionsSchema = recordsSchemas.listParticipantPermissions
export const readParticipantPermissionsSchema = recordsSchemas.readParticipantPermissions
export const saveParticipantPermissionsSchema = recordsSchemas.saveParticipantPermissions
export type ParticipantPermissionBody = FromSchema<typeof saveParticipantPermissionsSchema.body>

// Audit history
export const historySchema = historySchemas.history
export type HistoryQuery = FromSchema<typeof historySchema.querystring>
