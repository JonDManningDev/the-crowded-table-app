import { createClient } from '@supabase/supabase-js'

export type BearerVerifier = (authorization?: string) => Promise<string | null>

export function verifyBearer(projectUrl: string, publishableKey: string, issuer = new URL('/auth/v1', projectUrl).href): BearerVerifier {
  const auth = createClient(projectUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth
  return async (authorization: string | undefined) => {
    const token = /^Bearer ([\w.-]+)$/i.exec(authorization ?? '')?.[1]
    if (!token) return null
    // getClaims verifies with project signing keys, or with Auth for legacy HS256.
    const { data, error } = await auth.getClaims(token)
    if (error || !data) return null
    const { claims, header } = data
    if (!['ES256', 'RS256', 'HS256'].includes(header.alg) || claims.iss !== issuer ||
        claims.aud !== 'authenticated' || claims.role !== 'authenticated' || claims.is_anonymous ||
        !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000 ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.sub)) return null
    return claims.sub
  }
}
