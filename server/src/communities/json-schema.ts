import { Type } from 'typebox'
import { errorResponse } from '../http-errors.ts'
import { nullableObject } from '../http-schema.ts'
import { copySlots, settingFields, type CopyKey, staffFlags, communityPreferenceFields } from './types.ts'

const closed = { additionalProperties: false }
const optionalFields = { ...closed, required: [] }
const uuid = Type.String({ format: 'uuid' })
const nullableUuid = Type.Union([uuid, Type.Null()])
// Reply serializers accept pg Dates as well as SQL/JSON timestamp text.
// The wire contract remains a date-time string; this is reply-only typing.
const timestamp = Type.Unsafe<string | Date>(Type.String({ format: 'date-time' }))
const nullableTimestamp = Type.Union([timestamp, Type.Null()])
const nullableText = Type.Union([Type.String(), Type.Null()])
const tenantParams = Type.Object({ tenantId: uuid }, closed)
const accountParams = Type.Object({ tenantId: uuid, userId: uuid }, closed)
const slugParams = Type.Object({
  slug: Type.String({ minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' }),
}, closed)
const emptyQuery = Type.Object({}, optionalFields)
// These operations originally omit `required`; keep that distinct from an empty array.
const noQuery = Type.Object({}, closed)
const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse } as const
const commandErrors = { ...errors, 409: errorResponse } as const
const attribution = {
  created_at: timestamp,
  updated_at: timestamp,
  created_by: nullableUuid,
  updated_by: nullableUuid,
} as const
const standing = Type.Enum(['pending', 'approved', 'suspended', 'inactive'], { type: 'string' })
const staffRoles = ['owner', 'admin'] as const
const staffStatuses = ['active', 'paused', 'revoked'] as const
// A type array preserves baseline serialization, and Type.Enum's types exclude null.
const nullableStaffRole = { enum: [...staffRoles, null], type: ['string', 'null'] } as const
const nullableStaffStatus = { enum: [...staffStatuses, null], type: ['string', 'null'] } as const
const accountFacts = Type.Object({
  tenant_id: uuid,
  user_id: uuid,
  standing,
  first_approved_at: nullableTimestamp,
  has_disciplinary_restriction: Type.Boolean(),
  ...attribution,
}, closed)
const communityProfile = Type.Object({
  tenant_id: uuid,
  user_id: uuid,
  display_name: Type.String(),
  bio: nullableText,
  ...attribution,
}, closed)
const directoryQuery = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
}, optionalFields)
const detailInput = {
  name: Type.String({ maxLength: 120, minLength: 1 }),
  country_code: Type.String({ pattern: '^[A-Z]{2}$' }),
  state_province: Type.Union([Type.String({ maxLength: 120 }), Type.Null()]),
  city: Type.Union([Type.String({ maxLength: 120 }), Type.Null()]),
  timezone: Type.String({ maxLength: 128, minLength: 1 }),
} as const
const copyKey = Type.Enum(Object.keys(copySlots) as CopyKey[], { type: 'string' })
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
      enable_standard_chat_visibility: Type.Boolean(),
      enable_standard_activity_visibility: Type.Boolean(),
      enable_other_profile_visibility: Type.Boolean(),
      enable_own_profile_management: Type.Boolean(),
      enable_standard_participation: Type.Boolean(),
      enable_standard_dms: Type.Boolean(),
    })),
  },
} as const

export const readLandingSchema = {
  params: slugParams,
  querystring: emptyQuery,
  response: {
    200: Type.Object({
      id: uuid,
      slug: Type.String({ maxLength: 63, minLength: 1 }),
      ...detailInput,
      auto_approve_users: Type.Boolean(),
      allow_public_chat_visibility: Type.Boolean(),
      allow_public_activity_visibility: Type.Boolean(),
      allow_public_directory_visibility: Type.Boolean(),
      overrides: Type.Array(Type.Object(publicCopy, closed)),
    }, closed),
    400: errorResponse,
    401: errorResponse,
    404: errorResponse,
  },
} as const

export const publicDirectorySchema = {
  params: slugParams,
  querystring: directoryQuery,
  response: {
    200: Type.Object({
      rows: Type.Array(Type.Object({ display_name: Type.String(), staff_role: nullableStaffRole }, closed)),
      next: nullableText,
    }, closed),
    ...errors,
  },
} as const

// Creation and lifecycle
const creationProfile = Type.Object({
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
  bio: Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
}, closed)
const commandResponse = Type.Object({
  outcome: Type.String(),
  tenantId: uuid,
  revision: Type.Optional(uuid),
  requestId: Type.Optional(uuid),
}, closed)

export const createCommunitySchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 120 }),
    slug: Type.String({ minLength: 3, maxLength: 63 }),
    country: Type.String({ minLength: 2, maxLength: 2 }),
    timezone: Type.String({ minLength: 1, maxLength: 128 }),
    region: Type.String({ minLength: 0, maxLength: 120 }),
    city: Type.String({ minLength: 0, maxLength: 120 }),
    profile: creationProfile,
  }, closed),
  querystring: emptyQuery,
  response: { 201: commandResponse, ...commandErrors },
} as const

const staffPermissions = Type.Record(Type.Enum(staffFlags), Type.Boolean(), closed)
const commandReason = Type.Optional(Type.String({ minLength: 0, maxLength: 2000 }))
export const executeCommandSchema = {
  params: tenantParams,
  body: Type.Union([
    Type.Object({ kind: Type.Literal('join'), profile: creationProfile }, closed),
    Type.Object({ kind: Type.Literal('deactivate') }, closed),
    Type.Object({ kind: Type.Literal('reactivate') }, closed),
    Type.Object({ kind: Type.Literal('withdraw'), requestId: uuid }, closed),
    Type.Object({ kind: Type.Literal('approve'), requestId: uuid, revision: uuid }, closed),
    Type.Object({ kind: Type.Literal('suspend'), target: uuid, revision: uuid, reason: commandReason }, closed),
    Type.Object({ kind: Type.Literal('remove'), target: uuid, revision: uuid, reason: commandReason }, closed),
    Type.Object({ kind: Type.Literal('clear'), target: uuid, revision: uuid, reason: commandReason }, closed),
    Type.Object({ kind: Type.Literal('grant'), target: uuid }, closed),
    Type.Object({ kind: Type.Literal('resume'), target: uuid }, closed),
    Type.Object({ kind: Type.Literal('revoke'), target: uuid, reason: commandReason }, closed),
    Type.Object({ kind: Type.Literal('reappoint'), target: uuid, permissions: staffPermissions }, closed),
    Type.Object({
      kind: Type.Literal('permissions'),
      target: uuid,
      permissions: Type.Partial(staffPermissions, { ...optionalFields, minProperties: 1 }),
    }, closed),
    Type.Object({ kind: Type.Literal('archive'), archived: Type.Boolean() }, closed),
  ]),
  querystring: emptyQuery,
  response: { 200: commandResponse, ...commandErrors },
} as const

// Requests and reviews
const requestKind = Type.Enum(['join', 'reactivation'], { type: 'string' })
export const ownRequestSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: {
    200: Type.Object({
      request: nullableObject(Type.Object({
        request_id: uuid,
        kind: requestKind,
        requested_at: timestamp,
      }, closed)),
    }, closed),
    ...commandErrors,
  },
} as const

export const reviewAccountSchema = {
  params: Type.Object({ tenantId: uuid, target: uuid }, closed),
  querystring: emptyQuery,
  response: {
    200: Type.Object({ standing, revision: uuid, request_id: nullableUuid }, closed),
    ...commandErrors,
  },
} as const

const requestPageQuery = Type.Object({ after: Type.Optional(uuid) }, optionalFields)
export const staffCandidatesSchema = {
  params: tenantParams,
  querystring: requestPageQuery,
  response: {
    200: Type.Object({
      rows: Type.Array(Type.Object({
        tenant_id: uuid,
        user_id: uuid,
        standing: Type.Literal('approved'),
        display_name: nullableText,
        staff_role: nullableStaffRole,
        staff_status: nullableStaffStatus,
      }, closed)),
      next: nullableUuid,
    }, closed),
    ...commandErrors,
  },
} as const

export const pendingRequestsSchema = {
  params: tenantParams,
  querystring: requestPageQuery,
  response: {
    200: Type.Object({
      rows: Type.Array(Type.Object({
        id: uuid,
        kind: requestKind,
        user_id: uuid,
        requested_at: timestamp,
        revision: uuid,
        standing,
        first_approved_at: nullableTimestamp,
        has_disciplinary_restriction: Type.Boolean(),
        display_name: nullableText,
      }, closed)),
      next: nullableUuid,
    }, closed),
    ...commandErrors,
  },
} as const

// Profiles and preferences
const profileInputSchema = Type.Object({
  display_name: Type.String({ minLength: 1, maxLength: 80 }),
  bio: Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
}, closed)
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
  response: { 200: Type.Object({ tenantId: uuid }, closed), ...errors },
} as const

const preferenceResponse = Type.Record(Type.Enum(communityPreferenceFields), Type.Boolean(), closed)
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
const detailsResponse = Type.Object({
  id: uuid,
  slug: Type.String({ maxLength: 63, minLength: 1 }),
  ...detailInput,
  operational_status: Type.Enum(['active', 'archived'], { type: 'string' }),
  ...attribution,
}, closed)
export const readDetailsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: detailsResponse, ...errors },
} as const

export const saveDetailsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  body: Type.Partial(Type.Object(detailInput, closed), { ...optionalFields, minProperties: 1 }),
  response: { 200: detailsResponse, ...errors },
} as const

const settingsInput = Type.Record(Type.Enum(settingFields), Type.Boolean(), closed)
const settingsResponse = Type.Object({ tenant_id: uuid, ...settingsInput.properties, ...attribution }, closed)
export const readSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: settingsResponse, ...errors },
} as const

export const saveSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  body: Type.Partial(settingsInput, { ...optionalFields, minProperties: 1 }),
  response: { 200: settingsResponse, ...errors },
} as const

const copyResponse = Type.Object({ rows: Type.Array(Type.Object({ ...publicCopy, ...attribution }, closed)) }, closed)
const copyParams = Type.Object({ tenantId: uuid, contentKey: copyKey }, closed)
export const readCopySchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: { 200: copyResponse, ...errors },
} as const

export const saveCopySchema = {
  params: copyParams,
  querystring: emptyQuery,
  body: Type.Object({ text_value: Type.String({ maxLength: 2000, minLength: 1 }) }, closed),
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
    200: Type.Object({
      rows: Type.Array(Type.Object({
        account: accountFacts,
        profile: nullableObject(communityProfile),
        staff_role: nullableStaffRole,
      }, closed)),
      next: nullableText,
    }, closed),
    ...errors,
  },
} as const

export const ownerAccountsSchema = {
  params: tenantParams,
  querystring: directoryQuery,
  response: {
    200: Type.Object({ rows: Type.Array(accountFacts), next: nullableText }, closed),
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
const staffRecord = Type.Object({
  ...accountMetadata,
  role: Type.Enum(staffRoles, { type: 'string' }),
  status: Type.Enum(staffStatuses, { type: 'string' }),
  ...staffPermissions.properties,
}, closed)
const participantPermissions = Type.Object({ ...accountMetadata, can_post_public_events: Type.Boolean() }, closed)
const recordQuery = Type.Object({
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
}, optionalFields)
export const listStaffSchema = {
  params: tenantParams,
  querystring: recordQuery,
  response: {
    200: Type.Object({ rows: Type.Array(staffRecord), next: nullableText }, closed),
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
    200: Type.Object({ rows: Type.Array(participantPermissions), next: nullableText }, closed),
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
  body: Type.Object({ can_post_public_events: Type.Boolean() }, closed),
  response: { 200: participantPermissions, ...errors },
} as const

// Audit history
const historyCategory = Type.Enum(['community_account', 'staff_account'], { type: 'string' })
export const historySchema = {
  params: tenantParams,
  querystring: Type.Object({
    target: Type.Optional(uuid),
    category: Type.Optional(historyCategory),
    eventId: Type.Optional(uuid),
    cursor: Type.Optional(Type.String({ maxLength: 1024 })),
    limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-9][0-9]|100)$' })),
  }, closed),
  response: {
    200: Type.Object({
      rows: Type.Array(Type.Object({
        id: uuid,
        tenant_id: uuid,
        action: Type.String(),
        target_user_id: nullableUuid,
        content_key: nullableText,
        created_at: timestamp,
        created_by: nullableUuid,
        operation_id: uuid,
        reason: nullableText,
        details: Type.Object({}, { additionalProperties: true }),
        categories: Type.Array(historyCategory),
      }, closed)),
      next: nullableText,
    }, closed),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
  },
} as const
