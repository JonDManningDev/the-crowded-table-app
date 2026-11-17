import { Type, type Static, type TObject, type TProperties, type TSchema } from 'typebox'
import { errorResponse } from '../http-errors.ts'

export const closed = { additionalProperties: false }
export const uuid = Type.String({ format: 'uuid' })
export const nullableUuid = Type.Union([uuid, Type.Null()])
export const nullableText = Type.Union([Type.String(), Type.Null()])
// Reply serializers accept pg Dates as well as SQL-formatted timestamp text.
// The wire contract remains a date-time string; this is reply-only typing.
export const timestamp = Type.Unsafe<string | Date>(Type.String({ format: 'date-time' }))
export const noQuery = Type.Object({}, closed)
export const emptyQuery = Type.Object({}, { ...closed, required: [] })
export const errors = { 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse }
export const userParams = Type.Object({ userId: uuid }, closed)
export const paging = {
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 1024 })),
  limit: Type.Optional(Type.String({ pattern: '^(100|[1-9][0-9]?)$' })),
}
export const page = <T extends TSchema>(items: T) =>
  Type.Object({ rows: Type.Array(items), next: nullableText }, closed)

// A closed object union rejects extra fields before Fastify can strip them.
export function nullableObject<P extends TProperties>(schema: TObject<P>) {
  return Type.Unsafe<Static<typeof schema> | null>({ ...schema, type: ['object', 'null'] })
}
