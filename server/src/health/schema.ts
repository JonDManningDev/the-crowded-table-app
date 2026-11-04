import type { FromSchema } from 'json-schema-to-ts'

// These describe the existing success bodies for transport typing only. Health
// deliberately attaches no runtime schemas, preserving its unrestricted inputs.

// Liveness
export const readLivenessResponseSchema = {
  type: 'object', required: ['live'], additionalProperties: false,
  properties: { live: { const: true, type: 'boolean' } },
} as const
export type LivenessResponse = FromSchema<typeof readLivenessResponseSchema>

// Readiness
export const readReadinessResponseSchema = {
  type: 'object', required: ['ready'], additionalProperties: false,
  properties: { ready: { const: true, type: 'boolean' } },
} as const
export type ReadinessResponse = FromSchema<typeof readReadinessResponseSchema>
