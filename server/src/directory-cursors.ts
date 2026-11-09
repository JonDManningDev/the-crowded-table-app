import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { ApplicationError } from './http-errors.ts'

// Public positions must not reveal a user UUID, even after base64 decoding.
// Authentication binds each cursor to its endpoint/audience; rotation fails closed.
export function directoryCursors(keyHex: string) {
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new Error('DIRECTORY_CURSOR_KEY must be 32 random bytes encoded as hex.')
  const key = Buffer.from(keyHex,'hex')
  return {
    encode(scope: string[], position: string) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm',key,iv)
      cipher.setAAD(Buffer.from(JSON.stringify(scope)))
      const data = Buffer.concat([cipher.update(position,'utf8'),cipher.final()])
      return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url')
    },
    decode(scope: string[], cursor?: string): string | null {
      if (!cursor) return null
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error()
        const data = Buffer.from(cursor,'base64url')
        if (data.length !== 64 || data.toString('base64url') !== cursor) throw new Error()
        const decipher = createDecipheriv('aes-256-gcm',key,data.subarray(0,12))
        decipher.setAuthTag(data.subarray(12,28)); decipher.setAAD(Buffer.from(JSON.stringify(scope)))
        const position = Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString('utf8')
        if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(position)) throw new Error()
        return position
      } catch { throw new ApplicationError(400,'invalid_cursor') }
    },
  }
}
export type DirectoryCursors = ReturnType<typeof directoryCursors>
