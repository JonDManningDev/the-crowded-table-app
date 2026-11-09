import type { FromSchema } from 'json-schema-to-ts'
import type { Static } from 'typebox'
import { profileInputSchema } from '../profile-input-schema.ts'
import { errorResponse } from '../http-errors.ts'
import { copySlots, settingFields, type CopyKey, type CommunitySettings } from '../../../shared/community-configuration.ts'
import { staffFlags, type CommunityCommand } from '../../../shared/community-commands.ts'
import { communityPreferenceFields, type CommunityPreferences } from '../../../shared/self-service.ts'

// Preserve each schema's exact required-array value while retaining literal types.
type ObjectSchema<P, R> = { type: 'object'; properties: P; required: R; additionalProperties: false }
function object<const P extends Record<string, unknown>>(properties: P): ObjectSchema<P, (keyof P & string)[]>
function object<const P extends Record<string, unknown>, const R extends readonly string[]>(properties: P, required: R): ObjectSchema<P, R>
function object(properties: Record<string, unknown>, required: readonly string[] = Object.keys(properties)) {
  return { type: 'object', properties, required, additionalProperties: false } as const
}

const uuid = { type: 'string', format: 'uuid' } as const
const nullableUuid = { type: ['string', 'null'], format: 'uuid' } as const
const timestamp = { type: 'string', format: 'date-time' } as const
const boolean = { type: 'boolean' } as const
const tenantParams = object({ tenantId: uuid })
const accountParams = object({ tenantId: uuid, userId: uuid })
const slugParams = object({
  slug: { type: 'string', minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
})
const emptyQuery = object({})
// These operations originally omit `required`; keep that distinct from an empty array.
const noQuery = { type: 'object', additionalProperties: false, properties: {} } as const
const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse } as const
const commandErrors = { ...errors, 409: errorResponse } as const
const attribution = {
  created_at: timestamp,
  updated_at: timestamp,
  created_by: nullableUuid,
  updated_by: nullableUuid,
} as const
const standing = { type: 'string', enum: ['pending', 'approved', 'suspended', 'inactive'] } as const
const staffRole = { type: ['string', 'null'], enum: ['owner', 'admin', null] } as const
const accountFacts = object({
  tenant_id: uuid,
  user_id: uuid,
  standing,
  first_approved_at: { type: ['string', 'null'], format: 'date-time' },
  has_disciplinary_restriction: boolean,
  ...attribution,
})
const communityProfile = object({
  tenant_id: uuid,
  user_id: uuid,
  display_name: { type: 'string' },
  bio: { type: ['string', 'null'] },
  ...attribution,
})
const directoryQuery = object({
  limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' },
  cursor: { type: 'string', minLength: 1, maxLength: 1024 },
}, [])
const detailInput = {
  name: { type: 'string', maxLength: 120, minLength: 1 },
  country_code: { type: 'string', pattern: '^[A-Z]{2}$' },
  state_province: { type: ['string', 'null'], maxLength: 120 },
  city: { type: ['string', 'null'], maxLength: 120 },
  timezone: { type: 'string', maxLength: 128, minLength: 1 },
} as const
const copyKey = { type: 'string', enum: Object.keys(copySlots) as CopyKey[] } as const
const publicCopy = {
  tenant_id: uuid,
  content_key: copyKey,
  text_value: { type: 'string', maxLength: 2000, minLength: 1 },
} as const

// Public access and standing
const standingFields = [
  'standing', 'enable_standard_chat_visibility', 'enable_standard_activity_visibility',
  'enable_other_profile_visibility', 'enable_own_profile_management', 'enable_standard_participation',
  'enable_standard_dms',
] as const
export const listStandingsSchema = {
  querystring: noQuery,
  response: {
    401: errorResponse,
    200: {
      type: 'array',
      items: {
        type: 'object',
        required: standingFields,
        properties: Object.fromEntries(standingFields.map(field => [field, {
          type: field === 'standing' ? 'string' : 'boolean',
        }])),
      },
    },
  },
} as const

export const readLandingSchema = {
  params: slugParams,
  querystring: emptyQuery,
  response: {
    200: object({
      id: uuid,
      slug: { type: 'string', maxLength: 63, minLength: 1 },
      ...detailInput,
      auto_approve_users: boolean,
      allow_public_chat_visibility: boolean,
      allow_public_activity_visibility: boolean,
      allow_public_directory_visibility: boolean,
      overrides: { type: 'array', items: object(publicCopy) },
    }),
    400: errorResponse,
    401: errorResponse,
    404: errorResponse,
  },
} as const
export type ReadLandingParams = FromSchema<typeof readLandingSchema.params>

export const publicDirectorySchema = {
  params: slugParams,
  querystring: directoryQuery,
  response: {
    200: object({
      rows: {
        type: 'array',
        items: object({ display_name: { type: 'string' }, staff_role: staffRole }),
      },
      next: { type: ['string', 'null'] },
    }),
    ...errors,
  },
} as const
export type DirectoryQuery = FromSchema<typeof publicDirectorySchema.querystring>

// Creation and lifecycle
const creationProfile = object({
  displayName: { type: 'string', minLength: 1, maxLength: 80 },
  bio: { type: ['null', 'string'], maxLength: 2000 },
})
const commandResponse = object({
  outcome: { type: 'string' },
  tenantId: uuid,
  revision: uuid,
  requestId: uuid,
}, ['outcome', 'tenantId'])

export const createCommunitySchema = {
  body: object({
    name: { type: 'string', minLength: 1, maxLength: 120 },
    slug: { type: 'string', minLength: 3, maxLength: 63 },
    country: { type: 'string', minLength: 2, maxLength: 2 },
    timezone: { type: 'string', minLength: 1, maxLength: 128 },
    region: { type: 'string', minLength: 0, maxLength: 120 },
    city: { type: 'string', minLength: 0, maxLength: 120 },
    profile: creationProfile,
  }),
  querystring: emptyQuery,
  response: { 201: commandResponse, ...commandErrors },
} as const
export type CreateCommunityBody = FromSchema<typeof createCommunitySchema.body>

const staffPermissions = Object.fromEntries(staffFlags.map(flag => [flag, boolean]))
const commandReason = { type: 'string', minLength: 0, maxLength: 2000 } as const
const commandShapes: Record<CommunityCommand['kind'], Record<string, unknown>> = {
  join: { profile: creationProfile },
  deactivate: {},
  reactivate: {},
  withdraw: { requestId: uuid },
  approve: { requestId: uuid, revision: uuid },
  suspend: { target: uuid, revision: uuid, reason: commandReason },
  remove: { target: uuid, revision: uuid, reason: commandReason },
  clear: { target: uuid, revision: uuid, reason: commandReason },
  grant: { target: uuid },
  resume: { target: uuid },
  revoke: { target: uuid, reason: commandReason },
  reappoint: { target: uuid, permissions: object(staffPermissions) },
  permissions: { target: uuid, permissions: { ...object(staffPermissions, []), minProperties: 1 } },
  archive: { archived: boolean },
}
export const executeCommandSchema = {
  params: tenantParams,
  body: {
    oneOf: Object.entries(commandShapes).map(([kind, properties]) => object(
      { kind: { const: kind }, ...properties },
      ['kind', ...Object.keys(properties).filter(key => key !== 'reason')],
    )),
  },
  querystring: emptyQuery,
  response: { 200: commandResponse, ...commandErrors },
} as const
// Command oneOf is generated by kind; retain its shared discriminated union.
export type ExecuteCommandBody = CommunityCommand

// Requests and reviews
export const ownRequestSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: {
    200: object({
      request: {
        ...object({
          request_id: uuid,
          kind: { type: 'string', enum: ['join', 'reactivation'] },
          requested_at: timestamp,
        }),
        type: ['object', 'null'],
      },
    }),
    ...commandErrors,
  },
} as const
export type CommunityParams = FromSchema<typeof ownRequestSchema.params>

export const reviewAccountSchema = {
  params: object({ tenantId: uuid, target: uuid }),
  querystring: emptyQuery,
  response: {
    200: object({ standing, revision: uuid, request_id: nullableUuid }),
    ...commandErrors,
  },
} as const
export type ReviewParams = FromSchema<typeof reviewAccountSchema.params>

const requestPageQuery = object({ after: uuid }, [])
export const staffCandidatesSchema = {
  params: tenantParams,
  querystring: requestPageQuery,
  response: {
    200: object({
      rows: {
        type: 'array',
        items: object({
          tenant_id: uuid,
          user_id: uuid,
          standing: { type: 'string', const: 'approved' },
          display_name: { type: ['string', 'null'] },
          staff_role: staffRole,
          staff_status: { type: ['string', 'null'], enum: ['active', 'paused', 'revoked', null] },
        }),
      },
      next: nullableUuid,
    }),
    ...commandErrors,
  },
} as const
export type RequestPageQuery = FromSchema<typeof staffCandidatesSchema.querystring>

export const pendingRequestsSchema = {
  params: tenantParams,
  querystring: requestPageQuery,
  response: {
    200: object({
      rows: {
        type: 'array',
        items: object({
          id: uuid,
          kind: { type: 'string', enum: ['join', 'reactivation'] },
          user_id: uuid,
          requested_at: timestamp,
          revision: uuid,
          standing,
          first_approved_at: { type: ['string', 'null'], format: 'date-time' },
          has_disciplinary_restriction: boolean,
          display_name: { type: ['string', 'null'] },
        }),
      },
      next: nullableUuid,
    }),
    ...commandErrors,
  },
} as const

// Profiles and preferences
export const readProfileSchema = {
  // Preserve the original open params object; other account params are closed.
  params: {
    type: 'object',
    required: ['tenantId', 'userId'],
    properties: { tenantId: uuid, userId: uuid },
  },
  querystring: noQuery,
  response: { 200: communityProfile, 403: errorResponse, 404: errorResponse },
} as const
export type ReadProfileParams = FromSchema<typeof readProfileSchema.params>

export const saveOwnProfileSchema = {
  params: tenantParams,
  querystring: noQuery,
  body: profileInputSchema,
  response: { 200: object({ tenantId: uuid }), ...errors },
} as const
export type CommunityProfileInput = Static<typeof profileInputSchema>

const preferenceProperties = Object.fromEntries(communityPreferenceFields.map(key => [key, boolean]))
const preferenceResponse = {
  type: 'object',
  required: communityPreferenceFields,
  additionalProperties: false,
  properties: preferenceProperties,
} as const
export const readOwnPreferencesSchema = {
  params: tenantParams,
  querystring: noQuery,
  response: { 200: preferenceResponse, ...errors },
} as const

export const saveOwnPreferencesSchema = {
  params: tenantParams,
  querystring: noQuery,
  body: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: preferenceProperties,
  },
  response: { 200: preferenceResponse, ...errors },
} as const
// Dynamic flag maps retain the browser-safe DTO contract.
export type SaveOwnPreferencesBody = Partial<CommunityPreferences>

// Configuration and copy
const detailsResponse = object({
  id: uuid,
  slug: { type: 'string', maxLength: 63, minLength: 1 },
  ...detailInput,
  operational_status: { type: 'string', enum: ['active', 'archived'] },
  ...attribution,
})
export const readDetailsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: detailsResponse, ...errors },
} as const

export const saveDetailsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  body: { ...object(detailInput, []), minProperties: 1 },
  response: { 200: detailsResponse, ...errors },
} as const
export type SaveDetailsBody = FromSchema<typeof saveDetailsSchema.body>

const settingsInput = Object.fromEntries(settingFields.map(key => [key, boolean]))
const settingsResponse = object({ tenant_id: uuid, ...settingsInput, ...attribution })
export const readSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: settingsResponse, ...errors },
} as const

export const saveSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  body: { ...object(settingsInput, []), minProperties: 1 },
  response: { 200: settingsResponse, ...errors },
} as const
// Dynamic settings maps retain the browser-safe DTO contract.
export type SaveSettingsBody = Partial<CommunitySettings>

const copyResponse = object({ rows: { type: 'array', items: object({ ...publicCopy, ...attribution }) } })
const copyParams = object({ tenantId: uuid, contentKey: copyKey })
export const readCopySchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: copyResponse, ...errors },
} as const

export const saveCopySchema = {
  params: copyParams,
  querystring: emptyQuery,
  body: object({ text_value: { type: 'string', maxLength: 2000, minLength: 1 } }),
  response: { 200: copyResponse, ...errors },
} as const
export type CopyParams = FromSchema<typeof saveCopySchema.params>
export type SaveCopyBody = FromSchema<typeof saveCopySchema.body>

export const deleteCopySchema = {
  params: copyParams,
  querystring: emptyQuery,
  response: { 200: copyResponse, ...errors },
} as const

// Directories and account facts
export const memberDirectorySchema = {
  params: tenantParams,
  querystring: directoryQuery,
  response: {
    200: object({
      rows: {
        type: 'array',
        items: object({
          account: accountFacts,
          profile: { ...communityProfile, type: ['object', 'null'] },
          staff_role: staffRole,
        }),
      },
      next: { type: ['string', 'null'] },
    }),
    ...errors,
  },
} as const

export const ownerAccountsSchema = {
  params: tenantParams,
  querystring: directoryQuery,
  response: {
    200: object({ rows: { type: 'array', items: accountFacts }, next: { type: ['string', 'null'] } }),
    ...errors,
  },
} as const

export const accountFactsSchema = {
  params: accountParams,
  querystring: emptyQuery,
  response: { 200: accountFacts, ...errors },
} as const

// Staff and participant permissions
const accountMetadata = { tenant_id: uuid, user_id: uuid, ...attribution } as const
const staffRecord = object({
  ...accountMetadata,
  role: { type: 'string', enum: ['owner', 'admin'] },
  status: { type: 'string', enum: ['active', 'paused', 'revoked'] },
  ...staffPermissions,
})
const participantPermissions = object({ ...accountMetadata, can_post_public_events: boolean })
const recordQuery = object({
  cursor: { type: 'string', minLength: 1, maxLength: 1024 },
  limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' },
}, [])
export const listStaffSchema = {
  params: tenantParams,
  querystring: recordQuery,
  response: {
    200: object({ rows: { type: 'array', items: staffRecord }, next: { type: ['string', 'null'] } }),
    ...errors,
  },
} as const
export type RecordQuery = FromSchema<typeof listStaffSchema.querystring>

export const readStaffSchema = {
  params: accountParams,
  querystring: emptyQuery,
  response: { 200: staffRecord, ...errors },
} as const
export type CommunityAccountParams = FromSchema<typeof readStaffSchema.params>

export const listParticipantPermissionsSchema = {
  params: tenantParams,
  querystring: recordQuery,
  response: {
    200: object({ rows: { type: 'array', items: participantPermissions }, next: { type: ['string', 'null'] } }),
    ...errors,
  },
} as const

export const readParticipantPermissionsSchema = {
  params: accountParams,
  querystring: emptyQuery,
  response: { 200: participantPermissions, ...errors },
} as const

export const saveParticipantPermissionsSchema = {
  params: accountParams,
  querystring: emptyQuery,
  body: object({ can_post_public_events: boolean }),
  response: { 200: participantPermissions, ...errors },
} as const
export type ParticipantPermissionBody = FromSchema<typeof saveParticipantPermissionsSchema.body>

// Audit history
const historyCategory = { type: 'string', enum: ['community_account', 'staff_account'] } as const
export const historySchema = {
  params: tenantParams,
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      target: uuid,
      category: historyCategory,
      eventId: uuid,
      cursor: { type: 'string', maxLength: 1024 },
      limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' },
    },
  },
  response: {
    200: object({
      rows: {
        type: 'array',
        items: object({
          id: uuid,
          tenant_id: uuid,
          action: { type: 'string' },
          target_user_id: nullableUuid,
          content_key: { type: ['string', 'null'] },
          created_at: timestamp,
          created_by: nullableUuid,
          operation_id: uuid,
          reason: { type: ['string', 'null'] },
          details: { type: 'object', additionalProperties: true },
          categories: { type: 'array', items: historyCategory },
        }),
      },
      next: { type: ['string', 'null'] },
    }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
  },
} as const
export type HistoryQuery = FromSchema<typeof historySchema.querystring>
