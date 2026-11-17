import { Type } from 'typebox'
import { errorResponse } from '../../http-errors.ts'
import {
  uuid, nullableUuid, nullableText, timestamp,
  noQuery, emptyQuery, clientErrors, paging, page, nullableObject,
} from '../../shared/json-schema.ts'

const userParams = Type.Object({ userId: uuid }, { additionalProperties: false })

// User account preferences
const preferences = Type.Object({
  user_is_discoverable: Type.Boolean(),
  enable_matchmaking: Type.Boolean(),
  allow_direct_messages: Type.Boolean(),
}, { additionalProperties: false })
const preferencesResponse = { 200: preferences, 403: errorResponse, 404: errorResponse }
export const readAccountPreferencesSchema = { querystring: noQuery, response: preferencesResponse }
export const saveAccountPreferencesSchema = { querystring: noQuery, body: preferences, response: preferencesResponse }

// User account profile
const profileInputSchema = Type.Object({
  display_name: Type.String({ minLength: 1, maxLength: 80 }),
  bio: Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
}, { additionalProperties: false })
const profile = Type.Object({
  user_id: uuid,
  display_name: Type.String(),
  bio: nullableText,
  created_at: timestamp,
  updated_at: timestamp,
  created_by: nullableUuid,
  updated_by: nullableUuid,
}, { additionalProperties: false })
const profileResponse = Type.Object({ profile: nullableObject(profile) }, { additionalProperties: false })
export const readOwnGlobalProfileSchema = { querystring: noQuery, response: { 200: profileResponse, ...clientErrors } }
export const saveGlobalProfileSchema = { querystring: noQuery, body: profileInputSchema, response: { 200: profileResponse, ...clientErrors } }

const discoveryQuery = Type.Object({ ...paging, q: Type.Optional(Type.String({ maxLength: 120 })) },
  { additionalProperties: false, required: [] })
export const discoverGlobalProfilesSchema = { querystring: discoveryQuery, response: { 200: page(Type.Pick(profile, ['user_id', 'display_name'])), ...clientErrors } }
export const readOtherGlobalProfileSchema = { params: userParams, querystring: emptyQuery, response: { 200: Type.Union([profile, Type.Object({ status: Type.Literal('blocked') }, { additionalProperties: false })]), ...clientErrors } }

// User account communities
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
}, { additionalProperties: false })
const summaryQuery = Type.Object({
  filter: Type.Optional(Type.Enum(['all', 'managed', 'owned'], { type: 'string' })),
  cursor: Type.Optional(Type.String({ maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^([1-9]|[1-9][0-9]|100)$' })),
}, { additionalProperties: false })
export const listMyCommunitiesSchema = { querystring: summaryQuery, response: { 200: page(summary), ...clientErrors } }

// Account blocks
const block = Type.Object({ blocker_user_id: uuid, blocked_user_id: uuid, created_at: timestamp, created_by: uuid }, { additionalProperties: false })
const blocksQuery = Type.Object(paging, { additionalProperties: false, required: [] })
export const listAccountBlocksSchema = { querystring: blocksQuery, response: { 200: page(block), ...clientErrors } }

const blockInput = Type.Object({ confirmed: Type.Literal(true) }, { additionalProperties: false })
const blockResponse = Type.Object({ blocked: Type.Boolean() }, { additionalProperties: false })
export const blockUserSchema = { params: userParams, querystring: emptyQuery, body: blockInput, response: { 200: blockResponse, ...clientErrors } }
export const unblockUserSchema = { params: userParams, querystring: emptyQuery, response: { 200: blockResponse, ...clientErrors } }
