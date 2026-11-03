import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'

// Optional forwarded ports change transport only. Identity remains bound to the
// issuer of this local Auth stack. Never accept a remote host for fixture tests.
export function localStack() {
  const config = JSON.parse(execSync('npx --yes supabase status --output json', {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }))
  const db = new URL(config.DB_URL), api = new URL(config.API_URL)
  for (const url of [db, api]) assert.ok(['localhost','127.0.0.1'].includes(url.hostname))
  assert.equal(db.pathname, '/postgres')
  const issuer = new URL('/auth/v1', api).href
  if (process.env.CT_LOCAL_DB_PORT) db.port = process.env.CT_LOCAL_DB_PORT
  if (process.env.CT_LOCAL_API_PORT) api.port = process.env.CT_LOCAL_API_PORT
  return { ...config, DB_URL: db.href, API_URL: api.origin, issuer }
}
