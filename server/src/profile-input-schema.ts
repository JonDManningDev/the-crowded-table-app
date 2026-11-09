import { Type } from 'typebox'
import { nullableString } from './http-schema.ts'

// Both user-account and community-account profiles accept this input shape.
export const profileInputSchema = Type.Object({
  display_name: Type.String({ minLength: 1, maxLength: 80 }),
  bio: nullableString({ maxLength: 2000 }),
}, { additionalProperties: false })
