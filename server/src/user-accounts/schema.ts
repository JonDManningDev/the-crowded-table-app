import { Type, type Static, type TSchema } from 'typebox'
import { accountPreferenceFields } from '../../../shared/account-preferences.ts'
import { errorResponse } from '../http-errors.ts'
import { nullableObject, nullableString } from '../http-schema.ts'
import { profileInputSchema } from '../profile-input-schema.ts'

const closed = { additionalProperties: false }
const uuid = Type.String({ format: 'uuid' })
const nullableUuid = nullableString({ format: 'uuid' })
const nullableText = nullableString()
const timestamp = Type.String({ format: 'date-time' })
const noQuery = Type.Object({}, closed)
const emptyQuery = Type.Object({}, { ...closed, required: [] })
const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
const userParams = Type.Object({ userId: uuid }, closed)
const paging = {
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
}
const page = <T extends TSchema>(items: T) =>
  Type.Object({ rows: Type.Array(items), next: nullableText }, closed)

// Account preferences
const preferences = Type.Record(Type.Enum(accountPreferenceFields), Type.Boolean(), closed)
const preferencesResponse = { 200: preferences, 403: errorResponse, 404: errorResponse }
export const readAccountPreferencesSchema = { querystring: noQuery, response: preferencesResponse }
export const saveAccountPreferencesSchema = { querystring: noQuery, body: preferences, response: preferencesResponse }

// Own profile
const profile = Type.Object({
  user_id: uuid,
  ...profileInputSchema.properties,
  created_at: timestamp,
  updated_at: timestamp,
  created_by: nullableUuid,
  updated_by: nullableUuid,
}, closed)
const profileResponse = Type.Object({ profile: nullableObject(profile) }, closed)
export const readOwnProfileSchema = { querystring: noQuery, response: { 200: profileResponse, ...errors } }
export const saveOwnProfileSchema = { querystring: noQuery, body: profileInputSchema, response: { 200: profileResponse, ...errors } }

// My communities
const summary = Type.Object({
  id: uuid,
  name: Type.String(),
  city: nullableText,
  state_province: nullableText,
  country_code: Type.String(),
  operational_status: Type.Enum(['active', 'archived'], { type: 'string' }),
  created_at: timestamp,
  is_owned: Type.Boolean(),
  is_managed: Type.Boolean(),
  is_member: Type.Boolean(),
}, closed)
const summaryQuery = Type.Object({
  filter: Type.Optional(Type.Enum(['all', 'managed', 'owned'], { type: 'string' })),
  cursor: Type.Optional(Type.String({ maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-9][0-9]|100)$' })),
}, closed)
export const listMyCommunitiesSchema = { querystring: summaryQuery, response: { 200: page(summary), ...errors } }

// Global profiles
const globalProfile = Type.Object({
  user_id: uuid,
  display_name: Type.String(),
  bio: nullableText,
  created_at: timestamp,
  updated_at: timestamp,
  created_by: nullableUuid,
  updated_by: nullableUuid,
}, closed)
const discoveryQuery = Type.Object({ ...paging, q: Type.Optional(Type.String({ maxLength: 120 })) },
  { ...closed, required: [] })
export const discoverGlobalProfilesSchema = { querystring: discoveryQuery, response: { 200: page(globalProfile), ...errors } }
export const readGlobalProfileSchema = { params: userParams, querystring: emptyQuery, response: { 200: globalProfile, ...errors } }

// Account blocks
const block = Type.Object({ blocker_user_id: uuid, blocked_user_id: uuid, created_at: timestamp, created_by: uuid }, closed)
const blocksQuery = Type.Object(paging, { ...closed, required: [] })
export const listAccountBlocksSchema = { querystring: blocksQuery, response: { 200: page(block), ...errors } }

const globalBlockSource = Type.Object({ kind: Type.Literal('global_profile') }, closed)
const communityBlockSource = Type.Object({ kind: Type.Literal('community_profile'), tenantId: uuid }, closed)
const blockSource = Type.Unsafe<Static<typeof globalBlockSource> | Static<typeof communityBlockSource>>({
  oneOf: [globalBlockSource, communityBlockSource],
})
const blockInput = Type.Object({ confirmed: Type.Literal(true), source: blockSource }, closed)
const blockResponse = Type.Object({ blocked: Type.Boolean() }, closed)
export const blockAccountSchema = { params: userParams, querystring: emptyQuery, body: blockInput, response: { 200: blockResponse, ...errors } }
export const unblockAccountSchema = { params: userParams, querystring: emptyQuery, response: { 200: blockResponse, ...errors } }
