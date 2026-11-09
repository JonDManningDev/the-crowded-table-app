import { Type, type Static, type TObject, type TProperties } from 'typebox'

// A closed object union rejects extra fields before Fastify can strip them.
export function nullableObject<P extends TProperties>(schema: TObject<P>) {
  return Type.Unsafe<Static<typeof schema> | null>({ ...schema, type: ['object', 'null'] })
}
