// Run after the pilot migration. Only the credential-less local role is initialized.
import { localStack } from '../../supabase/tests/local-stack.mjs'
import { randomBytes } from 'node:crypto'
import { writeFileSync, existsSync, readFileSync, appendFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import pg from 'pg'

const root = new URL('../../', import.meta.url)
const serverEnv = new URL('server/.env.local', root)
const browserEnv = new URL('client/.env.local-api.local', root)
const config = localStack()
const dbUrl = new URL(config.DB_URL), apiUrl = new URL(config.API_URL)
for (const host of [dbUrl.hostname, apiUrl.hostname]) assert.ok(['127.0.0.1','localhost'].includes(host))
assert.equal(dbUrl.pathname, '/postgres')
assert.ok(config.ANON_KEY)
const admin = new pg.Client({ connectionString: dbUrl.href })
try {
  await admin.connect()
  await admin.query('begin')
  await admin.query("select pg_advisory_xact_lock(hashtext('ct_api_local_setup'))")
  const { rows } = await admin.query("select rolpassword is null as unconfigured from pg_authid where rolname='ct_api'")
  assert.ok(rows.length, 'Apply the local pilot migration first.')
  if (rows[0].unconfigured) {
    assert.ok(!existsSync(serverEnv), 'Existing server/.env.local needs reconciliation.')
    const password = randomBytes(32).toString('hex')
    await admin.query("alter role ct_api password '" + password + "'")
    dbUrl.username = 'ct_api'
    dbUrl.password = password
    writeFileSync(serverEnv, `DATABASE_URL=${dbUrl.href}\nSUPABASE_URL=${config.API_URL}\nSUPABASE_PUBLISHABLE_KEY=${config.ANON_KEY}\nSUPABASE_JWT_ISSUER=${config.issuer}\n`, { flag: 'wx', mode: 0o600 })
  } else {
    assert.ok(existsSync(serverEnv), 'Supply the existing ct_api credential in server/.env.local.')
  }
  if (!/^DIRECTORY_CURSOR_KEY=/m.test(readFileSync(serverEnv,'utf8'))) {
    appendFileSync(serverEnv, `\nDIRECTORY_CURSOR_KEY=${randomBytes(32).toString('hex')}\n`)
  }
  await admin.query('commit')
  if (!existsSync(browserEnv)) writeFileSync(browserEnv,
    `VITE_SUPABASE_URL=${config.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${config.ANON_KEY}\n`, { flag: 'wx' })
  console.log('Local Supabase configuration ready. Start npm run dev:api:local and npm run dev:local from the repository root.')
} finally { await admin.end() }
