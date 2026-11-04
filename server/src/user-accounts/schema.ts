import type { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { preferencesSchema } from '../../../shared/account-preferences.ts'
import { profileInputSchema } from '../../../shared/self-service.ts'
import { errorResponse } from '../http-errors.ts'

const uuid = { type: 'string', format: 'uuid' } as const
const nullableUuid = { type: ['string', 'null'], format: 'uuid' } as const
const timestamp = { type: 'string', format: 'date-time' } as const
const noQuery = { type: 'object', additionalProperties: false, properties: {} } as const
const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
function object<const P extends Record<string, JSONSchema>>(properties: P) {
  return { type: 'object', properties, required: Object.keys(properties) as (keyof P & string)[], additionalProperties: false } as const
}
const userParams = object({ userId: uuid })
const emptyQuery = object({})
export type UserIdParams = FromSchema<typeof userParams>
const paging = { cursor: { type: 'string', minLength: 1, maxLength: 1024 },
  limit: { type: 'string', pattern: '^(100|[1-9][0-9]?)$' } } as const
const page = <const T extends JSONSchema>(items: T) => object({ rows: { type: 'array', items }, next: { type: ['string', 'null'] } })

// Account preferences
const preferencesResponse = { 200: preferencesSchema, 403: errorResponse, 404: errorResponse }
export const readAccountPreferencesSchema = { querystring: noQuery, response: preferencesResponse }
export const saveAccountPreferencesSchema = { querystring: noQuery, body: preferencesSchema, response: preferencesResponse }
export type SaveAccountPreferencesBody = FromSchema<typeof preferencesSchema>

// Own profile
const profile = { type: ['object', 'null'], required: ['user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by'],
  additionalProperties: false, properties: { ...profileInputSchema.properties, user_id: uuid,
    created_at: timestamp, updated_at: timestamp, created_by: nullableUuid, updated_by: nullableUuid } } as const
const profileResponse = { type: 'object', required: ['profile'], additionalProperties: false, properties: { profile } } as const
export const readOwnProfileSchema = { querystring: noQuery, response: { 200: profileResponse, ...errors } }
export const saveOwnProfileSchema = { querystring: noQuery, body: profileInputSchema, response: { 200: profileResponse, ...errors } }
export type SaveOwnProfileBody = FromSchema<typeof profileInputSchema>

// My communities
const summaryFields = { id: uuid, name: { type: 'string' }, city: { type: ['string', 'null'] },
  state_province: { type: ['string', 'null'] }, country_code: { type: 'string' },
  operational_status: { type: 'string', enum: ['active', 'archived'] }, created_at: timestamp,
  is_owned: { type: 'boolean' }, is_managed: { type: 'boolean' }, is_member: { type: 'boolean' } } as const
const summaryResponse = { type: 'object', required: ['rows', 'next'], additionalProperties: false, properties: {
  rows: { type: 'array', items: { type: 'object', required: Object.keys(summaryFields), additionalProperties: false, properties: summaryFields } },
  next: { type: ['string', 'null'] },
} } as const
const summaryQuery = { type: 'object', additionalProperties: false, properties: {
  filter: { type: 'string', enum: ['all', 'managed', 'owned'] }, cursor: { type: 'string', maxLength: 1024 },
  limit: { type: 'string', pattern: '^([1-9]|[1-9][0-9]|100)$' },
} } as const
export const listMyCommunitiesSchema = { querystring: summaryQuery, response: { 200: summaryResponse, ...errors } }
export type ListMyCommunitiesQuery = FromSchema<typeof summaryQuery>

// Global profiles
const globalProfile = object({ user_id: uuid, display_name: { type: 'string' }, bio: { type: ['string', 'null'] },
  created_at: timestamp, updated_at: timestamp, created_by: nullableUuid, updated_by: nullableUuid })
const discoveryQuery = { type: 'object', properties: { ...paging, q: { type: 'string', maxLength: 120 } },
  required: [], additionalProperties: false } as const
export const discoverGlobalProfilesSchema = { querystring: discoveryQuery, response: { 200: page(globalProfile), ...errors } }
export type DiscoverGlobalProfilesQuery = FromSchema<typeof discoveryQuery>
export const readGlobalProfileSchema = { params: userParams, querystring: emptyQuery, response: { 200: globalProfile, ...errors } }

// Account blocks
const block = object({ blocker_user_id: uuid, blocked_user_id: uuid, created_at: timestamp, created_by: uuid })
const blocksQuery = { type: 'object', properties: paging, required: [], additionalProperties: false } as const
export const listAccountBlocksSchema = { querystring: blocksQuery, response: { 200: page(block), ...errors } }
export type ListAccountBlocksQuery = FromSchema<typeof blocksQuery>
const blockInput = object({ confirmed: { const: true, type: 'boolean' }, source: { oneOf: [
  object({ kind: { const: 'global_profile', type: 'string' } }),
  object({ kind: { const: 'community_profile', type: 'string' }, tenantId: uuid }),
] } })
const blockResponse = object({ blocked: { type: 'boolean' } })
export const blockAccountSchema = { params: userParams, querystring: emptyQuery, body: blockInput, response: { 200: blockResponse, ...errors } }
export type BlockAccountBody = FromSchema<typeof blockInput>
export const unblockAccountSchema = { params: userParams, querystring: emptyQuery, response: { 200: blockResponse, ...errors } }
