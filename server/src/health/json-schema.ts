import { Type, type Static } from 'typebox'

// These describe the existing success bodies for transport typing only. Health
// deliberately attaches no runtime schemas, preserving its unrestricted inputs.

// Liveness
export const readLivenessResponseSchema = Type.Object({ live: Type.Literal(true) }, { additionalProperties: false })
export type LivenessResponse = Static<typeof readLivenessResponseSchema>

// Readiness
export const readReadinessResponseSchema = Type.Object({ ready: Type.Literal(true) }, { additionalProperties: false })
export type ReadinessResponse = Static<typeof readReadinessResponseSchema>
