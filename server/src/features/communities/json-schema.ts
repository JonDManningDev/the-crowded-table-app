import { Type } from 'typebox'
import { errorResponse } from '../../http-errors.ts'
import {
  uuid, nullableUuid, timestamp, nullableTimestamp, nullableText,
  emptyQuery, noQuery, auditFields, nullableObject, paging,
} from '../../shared/json-schema.ts'
import { copySlots, settingFields, type CopyKey, staffFlags, communityPreferenceFields } from './types.ts'

const tenantParams = Type.Object({ tenantId: uuid }, { additionalProperties: false })

const accountParams = Type.Object({ tenantId: uuid, userId: uuid }, { additionalProperties: false })

const slugParams = Type.Object({
  slug: Type.String({ minLength: 3, maxLength: 63, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' }),
}, { additionalProperties: false })

const staffRoles = ['owner', 'admin'] as const

const staffStatuses = ['active', 'paused', 'revoked'] as const

// A type array preserves baseline serialization, and Type.Enum's types exclude null.
const nullableStaffRole = { enum: [...staffRoles, null], type: ['string', 'null'] } as const

const nullableStaffStatus = { enum: [...staffStatuses, null], type: ['string', 'null'] } as const

/*
 * Accounts and profiles
 */

const standing = Type.Enum(['pending', 'approved', 'suspended', 'inactive'], { type: 'string' })

const accountFacts = Type.Object({
  tenant_id: uuid,
  user_id: uuid,
  standing,
  first_approved_at: nullableTimestamp,
  has_disciplinary_restriction: Type.Boolean(),
  ...auditFields,
}, { additionalProperties: false })

const communityProfile = Type.Object({
  tenant_id: uuid,
  user_id: uuid,
  display_name: Type.String(),
  bio: nullableText,
  ...auditFields,
}, { additionalProperties: false })

const directoryQuery = Type.Object(paging, { additionalProperties: false, required: [] })

const requestKind = Type.Enum(['join', 'reactivation'], { type: 'string' })

const profileInputSchema = Type.Object({
  display_name: Type.String({ minLength: 1, maxLength: 80 }),
  bio: Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
}, { additionalProperties: false })

const preferenceResponse = Type.Record(Type.Enum(communityPreferenceFields), Type.Boolean(), { additionalProperties: false })

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

export const publicDirectorySchema = {
  params: slugParams,
  querystring: directoryQuery,
  response: {
    200: Type.Object({
      rows: Type.Array(Type.Object({ display_name: Type.String(), staff_role: nullableStaffRole }, { additionalProperties: false })),
      next: nullableText,
    }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const ownRequestSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: {
    200: Type.Object({
      request: nullableObject(Type.Object({
        request_id: uuid,
        kind: requestKind,
        requested_at: timestamp,
      }, { additionalProperties: false })),
    }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
  },
} as const

export const readProfileSchema = {
  // Preserve the original open params object; other account params are closed.
  params: Type.Object({ tenantId: uuid, userId: uuid }),
  querystring: noQuery,
  response: { 200: Type.Union([communityProfile, Type.Object({ status: Type.Literal('blocked') }, { additionalProperties: false })]), 403: errorResponse, 404: errorResponse },
} as const

export const saveOwnProfileSchema = {
  params: tenantParams,
  querystring: noQuery,
  body: profileInputSchema,
  response: {
    200: Type.Object({ tenantId: uuid }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const readOwnPreferencesSchema = {
  params: tenantParams,
  querystring: noQuery,
  response: {
    200: preferenceResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const saveOwnPreferencesSchema = {
  params: tenantParams,
  querystring: noQuery,
  body: Type.Partial(preferenceResponse, { additionalProperties: false, minProperties: 1 }),
  response: {
    200: preferenceResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const memberDirectorySchema = {
  params: tenantParams,
  querystring: directoryQuery,
  response: {
    200: Type.Object({
      rows: Type.Array(Type.Object({
        account: accountFacts,
        profile: nullableObject(Type.Pick(communityProfile, ['display_name'])),
        staff_role: nullableStaffRole,
      }, { additionalProperties: false })),
      next: nullableText,
    }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const ownerAccountsSchema = {
  params: tenantParams,
  querystring: directoryQuery,
  response: {
    200: Type.Object({ rows: Type.Array(accountFacts), next: nullableText }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const accountFactsSchema = {
  params: accountParams,
  querystring: emptyQuery,
  response: {
    200: accountFacts,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

/*
 * Tenant/community settings and configuration
 */

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

const detailsResponse = Type.Object({
  id: uuid,
  slug: Type.String({ maxLength: 63, minLength: 1 }),
  ...detailInput,
  operational_status: Type.Enum(['active', 'archived'], { type: 'string' }),
  ...auditFields,
}, { additionalProperties: false })

const settingsInput = Type.Record(Type.Enum(settingFields), Type.Boolean(), { additionalProperties: false })

const settingsResponse = Type.Object({ tenant_id: uuid, ...settingsInput.properties, ...auditFields }, { additionalProperties: false })

const copyResponse = Type.Object({ rows: Type.Array(Type.Object({ ...publicCopy, ...auditFields }, { additionalProperties: false })) }, { additionalProperties: false })

const copyParams = Type.Object({ tenantId: uuid, contentKey: copyKey }, { additionalProperties: false })

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
      overrides: Type.Array(Type.Object(publicCopy, { additionalProperties: false })),
    }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    404: errorResponse,
  },
} as const

export const readDetailsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: {
    200: detailsResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const saveDetailsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  body: Type.Partial(Type.Object(detailInput, { additionalProperties: false }), { additionalProperties: false, required: [], minProperties: 1 }),
  response: {
    200: detailsResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const readSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: {
    200: settingsResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const saveSettingsSchema = {
  params: tenantParams,
  querystring: emptyQuery,
  body: Type.Partial(settingsInput, { additionalProperties: false, required: [], minProperties: 1 }),
  response: {
    200: settingsResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const readCopySchema = {
  params: tenantParams,
  querystring: emptyQuery,
  response: {
    200: copyResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const saveCopySchema = {
  params: copyParams,
  querystring: emptyQuery,
  body: Type.Object({ text_value: Type.String({ maxLength: 2000, minLength: 1 }) }, { additionalProperties: false }),
  response: {
    200: copyResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const deleteCopySchema = {
  params: copyParams,
  querystring: emptyQuery,
  response: {
    200: copyResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

/*
 * Staff roles, permissions, and actions
 */

const staffPermissions = Type.Record(Type.Enum(staffFlags), Type.Boolean(), { additionalProperties: false })

const requestPageQuery = Type.Object({ after: Type.Optional(uuid) }, { additionalProperties: false, required: [] })

const accountMetadata = { tenant_id: uuid, user_id: uuid, ...auditFields } as const

const staffRecord = Type.Object({
  ...accountMetadata,
  role: Type.Enum(staffRoles, { type: 'string' }),
  status: Type.Enum(staffStatuses, { type: 'string' }),
  ...staffPermissions.properties,
}, { additionalProperties: false })

const participantPermissions = Type.Object({ ...accountMetadata, can_post_public_events: Type.Boolean() }, { additionalProperties: false })

const recordQuery = Type.Object({
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
}, { additionalProperties: false, required: [] })

export const reviewAccountSchema = {
  params: Type.Object({ tenantId: uuid, target: uuid }, { additionalProperties: false }),
  querystring: emptyQuery,
  response: {
    200: Type.Object({ standing, revision: uuid, request_id: nullableUuid }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
  },
} as const

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
      }, { additionalProperties: false })),
      next: nullableUuid,
    }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
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
      }, { additionalProperties: false })),
      next: nullableUuid,
    }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
  },
} as const

export const listStaffSchema = {
  params: tenantParams,
  querystring: recordQuery,
  response: {
    200: Type.Object({ rows: Type.Array(staffRecord), next: nullableText }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const readStaffSchema = {
  params: accountParams,
  querystring: emptyQuery,
  response: {
    200: staffRecord,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const listParticipantPermissionsSchema = {
  params: tenantParams,
  querystring: recordQuery,
  response: {
    200: Type.Object({ rows: Type.Array(participantPermissions), next: nullableText }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const readParticipantPermissionsSchema = {
  params: accountParams,
  querystring: emptyQuery,
  response: {
    200: participantPermissions,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

export const saveParticipantPermissionsSchema = {
  params: accountParams,
  querystring: emptyQuery,
  body: Type.Object({ can_post_public_events: Type.Boolean() }, { additionalProperties: false }),
  response: {
    200: participantPermissions,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
} as const

/*
 * Creation and lifecycle
 */

const creationProfile = Type.Object({
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
  bio: Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
}, { additionalProperties: false })

const commandResponse = Type.Object({
  outcome: Type.String(),
  tenantId: uuid,
  revision: Type.Optional(uuid),
  requestId: Type.Optional(uuid),
}, { additionalProperties: false })

const commandReason = Type.Optional(Type.String({ minLength: 0, maxLength: 2000 }))

export const createCommunitySchema = {
  body: Type.Object({
    name: Type.String({ minLength: 1, maxLength: 120 }),
    slug: Type.String({ minLength: 3, maxLength: 63 }),
    country: Type.String({ minLength: 2, maxLength: 2 }),
    timezone: Type.String({ minLength: 1, maxLength: 128 }),
    region: Type.String({ minLength: 0, maxLength: 120 }),
    city: Type.String({ minLength: 0, maxLength: 120 }),
    profile: creationProfile,
  }, { additionalProperties: false }),
  querystring: emptyQuery,
  response: {
    201: commandResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
  },
} as const

export const executeCommandSchema = {
  params: tenantParams,
  body: Type.Union([
    Type.Object({ kind: Type.Literal('join'), profile: creationProfile }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('deactivate') }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('reactivate') }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('withdraw'), requestId: uuid }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('approve'), requestId: uuid, revision: uuid }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('suspend'), target: uuid, revision: uuid, reason: commandReason }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('remove'), target: uuid, revision: uuid, reason: commandReason }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('clear'), target: uuid, revision: uuid, reason: commandReason }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('grant'), target: uuid }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('resume'), target: uuid }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('revoke'), target: uuid, reason: commandReason }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('reappoint'), target: uuid, permissions: staffPermissions }, { additionalProperties: false }),
    Type.Object({
      kind: Type.Literal('permissions'),
      target: uuid,
      permissions: Type.Partial(staffPermissions, { additionalProperties: false, required: [], minProperties: 1 }),
    }, { additionalProperties: false }),
    Type.Object({ kind: Type.Literal('archive'), archived: Type.Boolean() }, { additionalProperties: false }),
  ]),
  querystring: emptyQuery,
  response: {
    200: commandResponse,
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
  },
} as const

/*
 * Audit history
 */

const historyCategory = Type.Enum(['community_account', 'staff_account'], { type: 'string' })

export const historySchema = {
  params: tenantParams,
  querystring: Type.Object({
    target: Type.Optional(uuid),
    category: Type.Optional(historyCategory),
    eventId: Type.Optional(uuid),
    cursor: Type.Optional(Type.String({ maxLength: 1024 })),
    limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-9][0-9]|100)$' })),
  }, { additionalProperties: false }),
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
      }, { additionalProperties: false })),
      next: nullableText,
    }, { additionalProperties: false }),
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
  },
} as const
