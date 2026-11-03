import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { sql } from 'kysely'
import { buildApi } from '../src/app.ts'
import { connectDatabase } from '../src/database.ts'
import { verifyBearer } from '../src/auth.ts'
import { localStack } from '../../supabase/tests/local-stack.mjs'

const local = localStack()
const endpoint = new URL(process.env.DATABASE_URL)
assert.equal(endpoint.host, new URL(local.DB_URL).host)
assert.equal(endpoint.pathname, '/postgres')
const db = connectDatabase(endpoint.href)
const app = buildApi(db, verifyBearer(local.API_URL, local.ANON_KEY, local.issuer))
const admin = new pg.Client({ connectionString: local.DB_URL })
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, authOptions).auth.admin
const users = [], tenants = []
async function user() {
  const email = randomUUID() + '@example.test', password = randomUUID()
  const created = await authAdmin.createUser({ email, password, email_confirm: true })
  assert.ifError(created.error)
  users.push(created.data.user.id)
  const client = createClient(local.API_URL, local.ANON_KEY, authOptions)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  assert.ifError(error)
  return { id: data.user.id, token: data.session.access_token, client }
}
async function community(owner) {
  const { data, error } = await owner.client.rpc('create_tenant', { p_slug: 'test-' + randomUUID(),
    p_name: 'API fixture', p_country_code: 'HN', p_timezone: 'UTC', p_join_community: true })
  assert.ifError(error)
  tenants.push(data)
  return data
}
try {
  await admin.connect()
  const base = await app.listen({ host: '127.0.0.1', port: 0 })
  const url = base + '/api/community-standings'
  const result = await fetch(url)
  assert.equal(result.status, 200)
  const rows = await result.json()
  assert.deepEqual(rows.map(row => row.standing), ['approved', 'inactive', 'pending', 'suspended'])
  const fields = ['enable_standard_chat_visibility', 'enable_standard_activity_visibility', 'enable_other_profile_visibility',
    'enable_own_profile_management', 'enable_standard_participation', 'enable_standard_dms']
  const bits = rows.map(row => {
    assert.deepEqual(Object.keys(row).sort(), ['standing', ...fields].sort())
    return fields.map(key => row[key])
  })
  assert.deepEqual(bits, [[true,true,true,true,true,true], [false,false,false,false,false,false],
    [false,false,false,true,false,false], [true,true,true,true,false,true]])
  assert.equal((await fetch(url, { headers: { Authorization: 'Bearer invalid' } })).status, 401)
  assert.equal((await fetch(url + '?tenant_id=unknown')).status, 400)
  assert.equal((await fetch(url, { method: 'DELETE' })).status, 404)
  const owner = await user(), member = await user(), other = await user()
  const tenant = await community(owner), another = await community(other)
  await admin.query("insert into public.community_accounts(tenant_id,user_id,standing,show_global_profile) values ($1,$2,'approved',true)", [tenant,member.id])
  await admin.query("insert into public.community_account_profiles(tenant_id,user_id,display_name) values ($1,$2,'Member'),($1,$3,'Owner')", [tenant,member.id,owner.id])
  const profile = (viewer, scope, target, suffix = '') => fetch(base + '/api/communities/' + scope + '/accounts/' + target + '/profile' + suffix,
    { headers: viewer ? { Authorization: 'Bearer ' + viewer.token } : {} })
  const read = async (viewer, target, name) => {
    const response = await profile(viewer, tenant, target)
    assert.equal(response.status, 200)
    const row = await response.json()
    assert.deepEqual(Object.keys(row).sort(), ['tenant_id','user_id','display_name','bio','created_at','updated_at','created_by','updated_by'].sort())
    assert.equal(row.tenant_id, tenant)
    assert.equal(row.user_id, target)
    assert.equal(row.display_name, name)
  }
  await read(member, owner.id, 'Owner')
  assert.equal((await profile(null, tenant, member.id)).status, 401)
  assert.equal((await profile(other, tenant, member.id)).status, 404)
  assert.equal((await profile(other, another, member.id)).status, 404)
  assert.equal((await profile(owner, tenant, member.id, '?select=*')).status, 400)
  for (const standing of ['pending','suspended','removed']) {
    await admin.query('update public.community_accounts set standing=$1 where tenant_id=$2 and user_id=$3', [standing,tenant,member.id])
    assert.equal((await profile(member,tenant,owner.id)).status, standing === 'suspended' ? 200 : 404)
    assert.equal((await profile(member,tenant,member.id)).status, standing === 'removed' ? 404 : 200)
    assert.equal((await profile(owner,tenant,member.id)).status, standing === 'pending' ? 404 : 200)
  }
  await admin.query("update public.community_accounts set standing='approved' where tenant_id=$1 and user_id=$2", [tenant,member.id])
  assert.ifError((await owner.client.rpc('set_tenant_archived', { p_tenant_id: tenant, p_archived: true })).error)
  await read(owner, member.id, 'Member')
  for (const viewer of [member,other]) assert.equal((await profile(viewer,tenant,member.id)).status,404)
  // Omit the service predicate, as a faulty future query could. The independent
  // archive guard must still prevent a non-owner's runtime read.
  await db.transaction().execute(async tx => {
    await sql`select set_config('request.jwt.claim.sub', ${member.id}, true)`.execute(tx)
    assert.deepEqual(await tx.selectFrom('community_account_profiles').select('user_id').where('tenant_id','=',tenant).execute(), [])
  })
  assert.ifError((await owner.client.rpc('set_tenant_archived', { p_tenant_id: tenant, p_archived: false })).error)
  await read(member, owner.id, 'Owner')
  console.log('PASS public standing reference, exact curated fields, standing cases, tenant substitution, archive RLS and restore')
} finally {
  try {
    await admin.query('begin')
    await admin.query('set local session_replication_role=replica')
    for (const table of ['tenant_admin_actions','community_account_profiles','community_accounts','tenant_staff_assignments','tenant_settings']) {
      await admin.query('delete from public.' + table + ' where tenant_id=any($1::uuid[])', [tenants])
    }
    await admin.query('delete from public.tenants where id=any($1::uuid[])', [tenants])
    await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [users])
    await admin.query('commit')
    for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
  } finally { await app.close(); await admin.end() }
}
