import { Type, type Static, type TObject, type TProperties, type TSchema } from 'typebox'

export const uuid = Type.String({ format: 'uuid' })
export const nullableUuid = Type.Union([uuid, Type.Null()])
export const nullableText = Type.Union([Type.String(), Type.Null()])
// Reply serializers accept pg Dates as well as SQL-formatted timestamp text.
// The wire contract remains a date-time string; this is reply-only typing.
export const timestamp = Type.Unsafe<string | Date>(Type.String({ format: 'date-time' }))

export const nullableTimestamp = Type.Union([timestamp, Type.Null()])

// These operations originally omit `required`; keep that distinct from an empty array.
export const noQuery = Type.Object({}, { additionalProperties: false })
export const emptyQuery = Type.Object({}, { additionalProperties: false, required: [] })
export const auditFields = {
  created_at: timestamp,
  updated_at: timestamp,
  created_by: nullableUuid,
  updated_by: nullableUuid,
} as const
export const paging = {
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
}
export const page = <T extends TSchema>(items: T) =>
  Type.Object({ rows: Type.Array(items), next: nullableText }, { additionalProperties: false })

// A closed object union rejects extra fields before Fastify can strip them.
export function nullableObject<P extends TProperties>(definition: TObject<P>) {
  return Type.Unsafe<Static<typeof definition> | null>({ ...definition, type: ['object', 'null'] })
}
