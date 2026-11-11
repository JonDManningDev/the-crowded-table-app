// Validate focused hosted scenarios locally without weakening either target guard.
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { localStack } from '../../supabase/tests/local-stack.mjs'
import { applicationSnapshot } from '../../supabase/tests/policy-catalog-data.mjs'
import { connectDatabase } from '../src/database.ts'
import { buildApi } from '../src/app.ts'
import { verifyBearer } from '../src/token-verifier.ts'
import { directoryCursors } from '../src/directory-cursors.ts'
import { focusedPolicyChecks, observeRootQuery } from './helpers/hosted-policy-checks.mjs'

const local = localStack(), endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.host, new URL(local.DB_URL).host)
assert.equal(endpoint.username, 'ct_api')
const rootQueries = observeRootQuery(connectDatabase(endpoint.href))
const db = rootQueries.db
const app = buildApi({ db, verify: verifyBearer(local.API_URL, local.ANON_KEY, local.issuer), cursors: directoryCursors(randomBytes(32).toString('hex')), cleanup: () => db.destroy() })
const admin = new pg.Client({ connectionString: local.DB_URL })
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, options).auth.admin
const users = [], tenants = []
let base
const query = async text => { const result = await admin.query(text); return (Array.isArray(result) ? result.at(-1) : result).rows }
async function actor() {
  const email = randomUUID() + '@example.test', password = randomUUID()
  const made = await authAdmin.createUser({ email, password, email_confirm: true })
  assert.ifError(made.error); users.push(made.data.user.id)
  const signed = await createClient(local.API_URL, local.ANON_KEY, options).auth.signInWithPassword({ email, password })
  assert.ifError(signed.error)
  return { id: made.data.user.id, token: signed.data.session.access_token }
}
async function http(actor, path, method = 'GET', body, status = 200) {
  const response = await fetch(base + path, { method, headers: { ...(actor && { Authorization: 'Bearer ' + actor.token }), ...(body && { 'Content-Type': 'application/json' }) }, ...(body && { body: JSON.stringify(body) }) })
  const value = await response.json()
  assert.equal(response.status, status, method + ' ' + path + ' ' + JSON.stringify(value))
  return value
}
await admin.connect()
const baseline = await applicationSnapshot(query)
try {
  base = await app.listen({ host: '127.0.0.1', port: 0 })
  const owner = await actor(), member = await actor(), other = await actor()
  const slug = 'hosted-local-' + randomUUID()
  const made = await http(owner, '/api/communities', 'POST', { slug, name: 'Hosted preparation', country: 'HN', timezone: 'UTC', region: '', city: '', profile: { displayName: 'Owner', bio: null } }, 201)
  tenants.push(made.tenantId)
  const path = '/api/communities/' + made.tenantId
  const joined = await http(member, path + '/commands', 'POST', { kind: 'join', profile: { displayName: 'Member', bio: null } })
  const review = await http(owner, path + '/accounts/' + member.id + '/review')
  await http(owner, path + '/commands', 'POST', { kind: 'approve', requestId: joined.requestId, revision: review.revision })
  await http(owner, path + '/commands', 'POST', { kind: 'grant', target: member.id })
  await http(owner, path + '/settings', 'PATCH', { allow_public_directory_visibility: true })
  await focusedPolicyChecks({ db, endpoint: endpoint.href, owner, member, other, tenant: made.tenantId, slug, http, anonKey: local.ANON_KEY, projectUrl: local.API_URL, nextRootQuery: rootQueries.nextRootQuery })
} finally {
  try {
    await admin.query('begin'); await admin.query('set local session_replication_role=replica')
    await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=any($1::uuid[]))', [tenants])
    await admin.query('delete from app_private.community_account_requests where tenant_id=any($1::uuid[])', [tenants])
    for (const table of ['community_account_permissions','community_account_preferences','tenant_admin_actions','tenant_website_content_overrides','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings','tenants']) {
      await admin.query(`delete from public.${table} where ${table === 'tenants' ? 'id' : 'tenant_id'}=any($1::uuid[])`, [tenants])
    }
    await admin.query('delete from public.user_account_blocks where blocker_user_id=any($1::uuid[]) or blocked_user_id=any($1::uuid[])', [users])
    await admin.query('delete from public.user_account_profiles where user_id=any($1::uuid[])', [users])
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [users])
    await admin.query('commit')
    for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
    assert.deepEqual(await applicationSnapshot(query), baseline)
  } finally { await app.close(); await admin.end() }
}
console.log('PASS focused hosted scenarios validated locally and all original application checksums preserved')
