import type { FromSchema } from 'json-schema-to-ts'

export const preferencesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['user_is_discoverable', 'enable_matchmaking', 'allow_direct_messages'],
  properties: {
    user_is_discoverable: { type: 'boolean' },
    enable_matchmaking: { type: 'boolean' },
    allow_direct_messages: { type: 'boolean' },
  },
} as const

export type AccountPreferences = FromSchema<typeof preferencesSchema>
export const preferencesPath = '/api/me/preferences'
