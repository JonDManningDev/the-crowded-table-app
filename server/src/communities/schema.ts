import { Type, type TObject, type TProperties } from 'typebox'
import { profileInputSchema } from '../profile-input-schema.ts'
import { errorResponse } from '../http-errors.ts'
import { nullableObject, nullableString } from '../http-schema.ts'
import { copySlots, settingFields, type CopyKey } from '../../../shared/community-configuration.ts'
import { staffFlags, type CommunityCommand } from '../../../shared/community-commands.ts'
import { communityPreferenceFields } from '../../../shared/self-service.ts'

const closed = { additionalProperties: false }
const optionalFields = { ...closed, required: [] }
const object = <P extends TProperties>(properties: P) => Type.Object(properties, closed)
const nonemptyPatch = <P extends TProperties>(schema: TObject<P>) =>
  Type.Partial(schema, { ...optionalFields, minProperties: 1 })
const stringEnum = <const Values extends string[]>(values: readonly [...Values]) => Type.Enum(values, { type: 'string' })
const nullableEnum = <const Value extends string>(values: readonly Value[]) =>
  Type.Unsafe<Value | null>({ type: ['string', 'null'], enum: [...values, null] })

const uuid = Type.String({ format: 'uuid' })
const nullableUuid = nullableString({ format: 'uuid' })
const timestamp = Type.String({ format: 'date-time' })
const boolean = Type.Boolean()
const tenantParams = object({ tenantId: uuid })
const accountParams = object({ tenantId: uuid, userId: uuid })
const slugParams = object({
  slug: Type.String({ minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' }),
})
const emptyQuery = Type.Object({}, optionalFields)
// These operations originally omit `required`; keep that distinct from an empty array.
const noQuery = object({})
const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse } as const
const commandErrors = { ...errors, 409: errorResponse } as const
const attribution = {
  created_at: timestamp,
  updated_at: timestamp,
  created_by: nullableUuid,
  updated_by: nullableUuid,
} as const
const standing = stringEnum(['pending', 'approved', 'suspended', 'inactive'])
const staffRole = nullableEnum(['owner', 'admin'])
const accountFacts = object({
  tenant_id: uuid,
  user_id: uuid,
  standing,
  first_approved_at: nullableString({ format: 'date-time' }),
  has_disciplinary_restriction: boolean,
  ...attribution,
})
const communityProfile = object({
  tenant_id: uuid,
  user_id: uuid,
  display_name: Type.String(),
  bio: nullableString(),
  ...attribution,
})
const directoryQuery = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
}, optionalFields)
const detailInput = {
  name: Type.String({ maxLength: 120, minLength: 1 }),
  country_code: Type.String({ pattern: '^[A-Z]{2}$' }),
  state_province: nullableString({ maxLength: 120 }),
  city: nullableString({ maxLength: 120 }),
  timezone: Type.String({ maxLength: 128, minLength: 1 }),
} as const
const copyKey = stringEnum(Object.keys(copySlots) as CopyKey[])
const publicCopy = {
  tenant_id: uuid,
  content_key: copyKey,
  text_value: Type.String({ maxLength: 2000, minLength: 1 }),
} as const

// Public access and standing
export const listStandingsSchema = {
  querystring: noQuery,
  response: {
    401: errorResponse,
    200: Type.Array(Type.Object({
      standing: Type.String(),
      enable_standard_chat_visibility: boolean,
      enable_standard_activity_visibility: boolean,
      enable_other_profile_visibility: boolean,
      enable_own_profile_management: boolean,
      enable_standard_participation: boolean,
      enable_standard_dms: boolean,
    })),
  },
} as const

export const readLandingSchema = {
  params: slugParams,
  querystring: emptyQuery,
  response: {
    200: object({
      id: uuid,
      slug: Type.String({ maxLength: 63, minLength: 1 }),
      ...detailInput,
      auto_approve_users: boolean,
      allow_public_chat_visibility: boolean,
      allow_public_activity_visibility: boolean,
      allow_public_directory_visibility: boolean,
      overrides: Type.Array(object(publicCopy)),
    }),
    400: errorResponse,
    401: errorResponse,
    404: errorResponse,
  },
} as const

export const publicDirectorySchema = {
  params: slugParams,
  querystring: directoryQuery,
  response: {
    200: object({
      rows: Type.Array(object({ display_name: Type.String(), staff_role: staffRole })),
      next: nullableString(),
    }),
    ...errors,
  },
} as const

// Creation and lifecycle
const creationProfile = object({
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
  bio: Type.Unsafe<string | null>({ type: ['null', 'string'], maxLength: 2000 }),
})
const commandResponse = object({
  outcome: Type.String(),
  tenantId: uuid,
  revision: Type.Optional(uuid),
  requestId: Type.Optional(uuid),
})

export const createCommunitySchema = {
  body: object({
    name: Type.String({ minLength: 1, maxLength: 120 }),
    slug: Type.String({ minLength: 3, maxLength: 63 }),
    country: Type.String({ minLength: 2, maxLength: 2 }),
    timezone: Type.String({ minLength: 1, maxLength: 128 }),
    region: Type.String({ minLength: 0, maxLength: 120 }),
    city: Type.String({ minLength: 0, maxLength: 120 }),
    profile: creationProfile,
  }),
  querystring: emptyQuery,
  response: { 201: commandResponse, ...commandErrors },
} as const

const staffPermissions = Type.Record(Type.Enum(staffFlags), boolean, closed)
const commandReason = Type.Optional(Type.String({ minLength: 0, maxLength: 2000 }))
const commandShapes: Record<CommunityCommand['kind'], TProperties> = {
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
  reappoint: { target: uuid, permissions: staffPermissions },
  permissions: { target: uuid, permissions: nonemptyPatch(staffPermissions) },
  archive: { archived: boolean },
}
export const executeCommandSchema = {
  params: tenantParams,
  // The generated oneOf uses the shared discriminated union for its static type.
  body: Type.Unsafe<CommunityCommand>({
    oneOf: Object.entries(commandShapes).map(([kind, properties]) => object({
      kind: Type.Unsafe({ const: kind }), ...properties,
    })),
  }),
  querystring: emptyQuery,
  response: { 200: commandResponse, ...commandErrors },
} as const

// Requests and reviews
export const ownRequestSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: {
    200: object({
      request: nullableObject(object({
        request_id: uuid,
        kind: stringEnum(['join', 'reactivation']),
        requested_at: timestamp,
      })),
    }),
    ...commandErrors,
  },
} as const

export const reviewAccountSchema = {
  params: object({ tenantId: uuid, target: uuid }),
  querystring: emptyQuery,
  response: {
    200: object({ standing, revision: uuid, request_id: nullableUuid }),
    ...commandErrors,
  },
} as const

const requestPageQuery = Type.Object({ after: Type.Optional(uuid) }, optionalFields)
export const staffCandidatesSchema = {
  params: tenantParams,
  querystring: requestPageQuery,
  response: {
    200: object({
      rows: Type.Array(object({
        tenant_id: uuid,
        user_id: uuid,
        standing: Type.Literal('approved'),
        display_name: nullableString(),
        staff_role: staffRole,
        staff_status: nullableEnum(['active', 'paused', 'revoked']),
      })),
      next: nullableUuid,
    }),
    ...commandErrors,
  },
} as const

export const pendingRequestsSchema = {
  params: tenantParams,
  querystring: requestPageQuery,
  response: {
    200: object({
      rows: Type.Array(object({
        id: uuid,
        kind: stringEnum(['join', 'reactivation']),
        user_id: uuid,
        requested_at: timestamp,
        revision: uuid,
        standing,
        first_approved_at: nullableString({ format: 'date-time' }),
        has_disciplinary_restriction: boolean,
        display_name: nullableString(),
      })),
      next: nullableUuid,
    }),
    ...commandErrors,
  },
} as const

// Profiles and preferences
export const readProfileSchema = {
  // Preserve the original open params object; other account params are closed.
  params: Type.Object({ tenantId: uuid, userId: uuid }),
  querystring: noQuery,
  response: { 200: communityProfile, 403: errorResponse, 404: errorResponse },
} as const

export const saveOwnProfileSchema = {
  params: tenantParams,
  querystring: noQuery,
  body: profileInputSchema,
  response: { 200: object({ tenantId: uuid }), ...errors },
} as const

const preferenceResponse = Type.Record(Type.Enum(communityPreferenceFields), boolean, closed)
export const readOwnPreferencesSchema = {
  params: tenantParams,
  querystring: noQuery,
  response: { 200: preferenceResponse, ...errors },
} as const

export const saveOwnPreferencesSchema = {
  params: tenantParams,
  querystring: noQuery,
  body: Type.Partial(preferenceResponse, { ...closed, minProperties: 1 }),
  response: { 200: preferenceResponse, ...errors },
} as const

// Configuration and copy
const detailsResponse = object({
  id: uuid,
  slug: Type.String({ maxLength: 63, minLength: 1 }),
  ...detailInput,
  operational_status: stringEnum(['active', 'archived']),
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
  body: nonemptyPatch(object(detailInput)),
  response: { 200: detailsResponse, ...errors },
} as const

const settingsInput = Type.Record(Type.Enum(settingFields), boolean, closed)
const settingsResponse = object({ tenant_id: uuid, ...settingsInput.properties, ...attribution })
export const readSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: settingsResponse, ...errors },
} as const

export const saveSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  body: nonemptyPatch(settingsInput),
  response: { 200: settingsResponse, ...errors },
} as const

const copyResponse = object({ rows: Type.Array(object({ ...publicCopy, ...attribution })) })
const copyParams = object({ tenantId: uuid, contentKey: copyKey })
export const readCopySchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: copyResponse, ...errors },
} as const

export const saveCopySchema = {
  params: copyParams,
  querystring: emptyQuery,
  body: object({ text_value: Type.String({ maxLength: 2000, minLength: 1 }) }),
  response: { 200: copyResponse, ...errors },
} as const

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
      rows: Type.Array(object({
        account: accountFacts,
        profile: nullableObject(communityProfile),
        staff_role: staffRole,
      })),
      next: nullableString(),
    }),
    ...errors,
  },
} as const

export const ownerAccountsSchema = {
  params: tenantParams,
  querystring: directoryQuery,
  response: {
    200: object({ rows: Type.Array(accountFacts), next: nullableString() }),
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
  role: stringEnum(['owner', 'admin']),
  status: stringEnum(['active', 'paused', 'revoked']),
  ...staffPermissions.properties,
})
const participantPermissions = object({ ...accountMetadata, can_post_public_events: boolean })
const recordQuery = Type.Object({
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
}, optionalFields)
export const listStaffSchema = {
  params: tenantParams,
  querystring: recordQuery,
  response: {
    200: object({ rows: Type.Array(staffRecord), next: nullableString() }),
    ...errors,
  },
} as const

export const readStaffSchema = {
  params: accountParams,
  querystring: emptyQuery,
  response: { 200: staffRecord, ...errors },
} as const

export const listParticipantPermissionsSchema = {
  params: tenantParams,
  querystring: recordQuery,
  response: {
    200: object({ rows: Type.Array(participantPermissions), next: nullableString() }),
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

// Audit history
const historyCategory = stringEnum(['community_account', 'staff_account'])
export const historySchema = {
  params: tenantParams,
  querystring: object({
    target: Type.Optional(uuid),
    category: Type.Optional(historyCategory),
    eventId: Type.Optional(uuid),
    cursor: Type.Optional(Type.String({ maxLength: 1024 })),
    limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-9][0-9]|100)$' })),
  }),
  response: {
    200: object({
      rows: Type.Array(object({
        id: uuid,
        tenant_id: uuid,
        action: Type.String(),
        target_user_id: nullableUuid,
        content_key: nullableString(),
        created_at: timestamp,
        created_by: nullableUuid,
        operation_id: uuid,
        reason: nullableString(),
        details: Type.Unsafe<Record<string, unknown>>({ type: 'object', additionalProperties: true }),
        categories: Type.Array(historyCategory),
      })),
      next: nullableString(),
    }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
  },
} as const
