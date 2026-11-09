import { Type } from 'typebox'

// Both user-account and community-account profiles accept this input shape.
export const profileInputSchema = Type.Object({
  display_name: Type.String({ minLength: 1, maxLength: 80 }),
  bio: Type.Unsafe<string | null>({ type: ['string', 'null'], maxLength: 2000 }),
}, { additionalProperties: false })
