import { Type, type Static, type TObject, type TProperties, type TStringOptions } from 'typebox'

export function nullableString(options?: TStringOptions) {
  return Type.Unsafe<string | null>({ ...options, type: ['string', 'null'] })
}

// Keep the nullable object shape that Fastify uses to project extra fields.
export function nullableObject<P extends TProperties>(schema: TObject<P>) {
  return Type.Unsafe<Static<typeof schema> | null>({ ...schema, type: ['object', 'null'] })
}
