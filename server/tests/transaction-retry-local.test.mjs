import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import test from 'node:test'
import pg from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { createClient } from '@supabase/supabase-js'
import { buildApi } from '../src/app.ts'
import { connectDatabase, checkRuntime } from '../src/database.ts'
import { directoryCursors } from '../src/directory-cursors.ts'
import { verifyBearer } from '../src/token-verifier.ts'
import { localStack } from '../../supabase/tests/local-stack.mjs'

// Faults live at the pg boundary, outside production service callbacks. Every
// operation/query runs against PostgreSQL as ct_api. DO raises a genuine server
// error inside the transaction, after the chosen write (or before COMMIT).
class FaultPool extends pg.Pool {
  fault = null
  queries = []
  patched = new WeakSet()
  afterRollback = null
  async connect() {
    const client = await super.connect()
    if (!this.patched.has(client)) {
      this.patched.add(client)
      const query = client.query.bind(client)
      client.query = async (text, parameters) => {
        this.queries.push({ text, parameters })
        const fault = this.fault
        const inject = fault?.codes.length && fault.match.test(text)
        const fail = async () => {
          const code = fault.codes.shift()
          assert.ok(['40001', '40P01', '23505'].includes(code))
          this.afterRollback = fault.afterRollback ?? null
          await query(`do $$ begin raise exception using errcode='${code}', message='local retry fixture'; end $$`)
        }
        if (inject && text === 'commit') await fail()
        const result = await query(text, parameters)
        if (inject && text !== 'commit') await fail()
        if (text === 'rollback' && this.afterRollback) {
          const change = this.afterRollback
          this.afterRollback = null
          await change()
        }
        if (text === 'commit' && fault?.loseCommitAcknowledgement) {
          fault.loseCommitAcknowledgement = false
          throw Object.assign(new Error('lost commit acknowledgement'), { code: 'ECONNRESET' })
        }
        return result
      }
    }
    return client
  }
}

test('real local operations retry with fresh authorization and one committed outcome', async t => {
  const local = localStack(), endpoint = new URL(process.env.DATABASE_URL)
  assert.equal(endpoint.host, new URL(local.DB_URL).host)
  assert.equal(endpoint.pathname, '/postgres')
  assert.equal(endpoint.username, 'ct_api')
  const admin = new pg.Client({ connectionString: local.DB_URL })
  const pool = new FaultPool({ connectionString: endpoint.href, max: 1,
    statement_timeout: 5000, lock_timeout: 2000, idle_in_transaction_session_timeout: 8000 })
  const db = new Kysely({ dialect: new PostgresDialect({ pool }) })
  const controlDb = connectDatabase(endpoint.href)
  const verify = verifyBearer(local.API_URL, local.ANON_KEY, local.issuer)
  const cursors = directoryCursors(randomBytes(32).toString('hex'))
  const app = buildApi({ db, verify, cursors, cleanup: () => db.destroy() })
  const controlApp = buildApi({ db: controlDb, verify, cursors, cleanup: () => controlDb.destroy() })
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  const authAdmin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, options).auth.admin
  const users = [], tenants = []
  async function user() {
    const email = randomUUID() + '@example.test', password = randomUUID()
    const created = await authAdmin.createUser({ email, password, email_confirm: true })
    assert.ifError(created.error)
    users.push(created.data.user.id)
    const { data, error } = await createClient(local.API_URL, local.ANON_KEY, options).auth.signInWithPassword({ email, password })
    assert.ifError(error)
    return { id: data.user.id, token: data.session.access_token }
  }
  async function request(server, actor, url, payload, expected = 200, method = payload ? 'POST' : 'GET') {
    const response = await server.inject({ method, url, ...(payload && { payload }),
      headers: actor ? { authorization: 'Bearer ' + actor.token } : {} })
    assert.equal(response.statusCode, expected, response.body)
    return response.json()
  }
  async function faulted(actor, url, payload, fault, expected = 200, method = 'POST') {
    pool.queries = []
    pool.fault = fault
    try {
      const value = await request(app, actor, url, payload, expected, method)
      const queries = pool.queries.slice()
      const contexts = queries.filter(query => query.text.includes("set_config('request.jwt.claim.sub'"))
      if (contexts.length) {
        assert.ok(contexts.every(query => query.parameters[0] === actor.id))
        assert.ok(contexts.every(query => query.parameters[1] === contexts[0].parameters[1]))
      }
      return { value, queries, operation: contexts[0]?.parameters[1],
        attempts: queries.filter(query => query.text === 'begin').length }
    } finally { pool.fault = null }
  }
  async function events(operation) {
    return (await admin.query(`select a.action,a.details,a.operation_id,
      array(select category from app_private.tenant_admin_action_categories where action_id=a.id order by category) as categories
      from public.tenant_admin_actions a where operation_id=$1`, [operation])).rows
  }
  try {
    await admin.connect()
    await checkRuntime(db)
    const owner = await user(), member = await user(), manager = await user()
    const slug = 'retry-' + randomUUID()
    const created = await request(controlApp, owner, '/api/communities', { name: 'Retry fixture', slug,
      country: 'HN', timezone: 'UTC', region: '', city: '', profile: { displayName: 'Owner', bio: null } }, 201)
    const tenant = created.tenantId, path = '/api/communities/' + tenant
    tenants.push(tenant)
    const command = (actor, input) => request(controlApp, actor, path + '/commands', input)
    const settings = input => request(controlApp, owner, path + '/settings', input, 200, input ? 'PATCH' : 'GET')
    const join = { kind: 'join', profile: { displayName: 'Retry member', bio: null } }
    await settings({ auto_approve_users: true, allow_public_directory_visibility: true })
    await command(manager, join)
    await command(owner, { kind: 'grant', target: manager.id })
    await command(owner, { kind: 'permissions', target: manager.id, permissions: { can_manage_settings: true } })
    await settings({ auto_approve_users: false })

    await t.test('two failed join attempts roll back accounts, requests and event/categories before one success', async () => {
      const result = await faulted(member, path + '/commands', join,
        { match: /insert into "tenant_admin_actions"/, codes: ['40001', '40P01'] })
      assert.equal(result.attempts, 3)
      assert.equal(result.queries.filter(query => query.text.includes('lock_eligible_actor')).length, 3)
      assert.equal(result.queries.filter(query => query.text.includes('for update')).length >= 3, true)
      const own = await request(controlApp, member, path + '/me/request')
      assert.equal(own.request.request_id, result.value.requestId)
      const committed = await events(result.operation)
      assert.equal(committed.length, 1)
      assert.equal(committed[0].action, 'community_join_requested')
      assert.equal(committed[0].details.request_id, result.value.requestId)
      assert.deepEqual(committed[0].categories, ['community_account'])
    })

    await t.test('failure after category insertion rolls back mutation, event and categories before one retry', async () => {
      const result = await faulted(owner, path + '/accounts/' + member.id + '/permissions',
        { can_post_public_events: true },
        { match: /insert into "app_private"\."tenant_admin_action_categories"/, codes: ['40001'] }, 200, 'PATCH')
      assert.equal(result.attempts, 2)
      const committed = await events(result.operation)
      assert.equal(committed.length, 1)
      assert.equal(committed[0].action, 'community_permissions_changed')
      assert.deepEqual(committed[0].details, { before: false, after: true })
      assert.deepEqual(committed[0].categories, ['community_account'])
      const noop = await faulted(owner, path + '/accounts/' + member.id + '/permissions',
        { can_post_public_events: true }, { match: /never/, codes: [] }, 200, 'PATCH')
      assert.deepEqual(await events(noop.operation), [])
    })

    await t.test('failure between event and categories leaves neither mutation nor event committed', async () => {
      const result = await faulted(owner, path + '/accounts/' + member.id + '/permissions',
        { can_post_public_events: false },
        { match: /insert into "tenant_admin_actions"/, codes: ['23505'] }, 503, 'PATCH')
      assert.equal(result.attempts, 1)
      assert.deepEqual(await events(result.operation), [])
      const current = await request(controlApp, owner, path + '/accounts/' + member.id + '/permissions')
      assert.equal(current.can_post_public_events, true)
    })

    await t.test('a confirmed failure at commit retries and commits one configuration event', async () => {
      const result = await faulted(owner, path + '/settings', { pause_community_events: true },
        { match: /^commit$/, codes: ['40001'] }, 200, 'PATCH')
      assert.equal(result.attempts, 2)
      assert.equal(result.value.pause_community_events, true)
      assert.equal((await events(result.operation)).length, 1)
    })

    await t.test('permission revocation after rollback denies the fresh attempt and leaves no failed event', async () => {
      const result = await faulted(manager, path + '/settings', { pause_community_events: false },
        { match: /update public\.tenant_settings/, codes: ['40001'], afterRollback: () =>
          command(owner, { kind: 'permissions', target: manager.id, permissions: { can_manage_settings: false } }) }, 403, 'PATCH')
      assert.equal(result.attempts, 2)
      assert.equal(result.value.code, 'forbidden')
      assert.equal((await settings()).pause_community_events, true)
      assert.deepEqual(await events(result.operation), [])
    })

    await t.test('Auth ban after rollback prevents the second attempt from repeating the preference write', async () => {
      const before = await request(controlApp, member, '/api/me/preferences')
      try {
        const result = await faulted(member, '/api/me/preferences', { ...before, enable_matchmaking: !before.enable_matchmaking },
          { match: /update "user_accounts"/, codes: ['40P01'], afterRollback: async () => {
            assert.ifError((await authAdmin.updateUserById(member.id, { ban_duration: '24h' })).error)
          } }, 403, 'PUT')
        assert.equal(result.attempts, 2)
        assert.equal(result.value.code, 'ineligible')
        assert.equal(result.queries.filter(query => query.text.includes('update "user_accounts"')).length, 1)
        assert.equal((await admin.query('select enable_matchmaking from public.user_accounts where user_id=$1', [member.id])).rows[0].enable_matchmaking,
          before.enable_matchmaking)
      } finally { assert.ifError((await authAdmin.updateUserById(member.id, { ban_duration: 'none' })).error) }
    })

    await t.test('a request approved between attempts becomes stale and cannot be replayed', async () => {
      const own = await request(controlApp, member, path + '/me/request')
      const review = await request(controlApp, owner, path + '/accounts/' + member.id + '/review')
      const input = { kind: 'withdraw', requestId: own.request.request_id }
      const result = await faulted(member, path + '/commands', input,
        { match: /insert into "tenant_admin_actions"/, codes: ['40001'], afterRollback: () =>
          command(owner, { kind: 'approve', requestId: input.requestId, revision: review.revision }) }, 409)
      assert.equal(result.attempts, 2)
      assert.equal(result.value.code, 'stale_state')
      assert.deepEqual(await events(result.operation), [])
      const replay = await faulted(member, path + '/commands', input, { match: /never/, codes: [] }, 409)
      assert.equal(replay.attempts, 1)
      assert.equal((await request(controlApp, owner, path + '/accounts/' + member.id + '/review')).standing, 'approved')
    })

    await t.test('three failures exhaust unchanged HTTP errors and roll back all configuration events', async () => {
      for (const code of ['40001', '40P01']) {
        const result = await faulted(owner, path + '/settings', { pause_community_events: false },
          { match: /update public\.tenant_settings/, codes: [code, code, code] }, 503, 'PATCH')
        assert.equal(result.attempts, 3)
        assert.equal(result.value.code, 'unavailable')
        assert.equal(result.value.requestId, result.operation)
        assert.deepEqual(await events(result.operation), [])
        assert.equal((await settings()).pause_community_events, true)
      }
    })

    await t.test('an arbitrary PostgreSQL error rolls back without retry', async () => {
      const result = await faulted(owner, path + '/settings', { pause_community_events: false },
        { match: /update public\.tenant_settings/, codes: ['23505'] }, 503, 'PATCH')
      assert.equal(result.attempts, 1)
      assert.deepEqual(await events(result.operation), [])
      assert.equal((await settings()).pause_community_events, true)
    })

    await t.test('a lost commit acknowledgement is not replayed and an explicit repeated save stays a no-op', async () => {
      const result = await faulted(owner, path + '/settings', { pause_community_events: false },
        { match: /never/, codes: [], loseCommitAcknowledgement: true }, 503, 'PATCH')
      assert.equal(result.attempts, 1)
      assert.equal((await settings()).pause_community_events, false)
      const committed = await events(result.operation)
      assert.equal(committed.length, 1)
      const count = (await admin.query('select count(*) from public.tenant_admin_actions where tenant_id=$1', [tenant])).rows[0].count
      await settings({ pause_community_events: false })
      assert.deepEqual(await events(result.operation), committed)
      assert.equal((await admin.query('select count(*) from public.tenant_admin_actions where tenant_id=$1', [tenant])).rows[0].count, count)
    })

    await t.test('a public directory retry preserves anonymous identity, audience and projections', async () => {
      const url = '/api/public/communities/' + slug + '/directory'
      const before = await request(controlApp, null, url)
      const result = await faulted(null, url, undefined,
        { match: /from "community_accounts" as "c"/, codes: ['40P01'] }, 200, 'GET')
      assert.equal(result.attempts, 2)
      assert.equal(result.operation, undefined)
      assert.ok(result.queries.every(query => !query.text.includes('lock_eligible_actor') && !query.text.includes('request.jwt.claim.sub') && !query.text.includes('ct.operation_id')))
      assert.deepEqual(result.value, before)
    })

    await t.test('block retries rebuild source admission and preserve repeated/unblock outcomes', async()=>{
      await request(controlApp,manager,'/api/me/profile',{display_name:'Block target',bio:null},200,'PUT')
      const url='/api/me/blocks/'+manager.id, input={confirmed:true,source:{kind:'global_profile'}}
      const result=await faulted(owner,url,input,{match:/insert into public.user_account_blocks/,codes:['40001','40P01']},200,'PUT')
      assert.equal(result.attempts,3)
      assert.equal(result.queries.filter(q=>q.text.includes('ct.profile-block:')).length,3)
      assert.equal((await request(controlApp,owner,'/api/me/blocks')).rows.length,1)
      await request(controlApp,owner,url,undefined,200,'DELETE')
      const denied=await faulted(owner,url,input,{match:/insert into public.user_account_blocks/,codes:['40001'],
        afterRollback:()=>request(controlApp,manager,'/api/me/preferences',{
          user_is_discoverable:false,enable_matchmaking:true,allow_direct_messages:true},200,'PUT')},404,'PUT')
      assert.equal(denied.attempts,2)
      assert.equal((await request(controlApp,owner,'/api/me/blocks')).rows.length,0)
      const missing=await faulted(owner,url,input,{match:/insert into public.user_account_blocks/,codes:[]},404,'PUT')
      assert.equal(missing.attempts,1)
      await request(controlApp,manager,'/api/me/preferences',{
        user_is_discoverable:true,enable_matchmaking:true,allow_direct_messages:true},200,'PUT')
      const arbitrary=await faulted(owner,url,input,{match:/insert into public.user_account_blocks/,codes:['23505']},503,'PUT')
      assert.equal(arbitrary.attempts,1)
      assert.equal((await request(controlApp,owner,'/api/me/blocks')).rows.length,0)
      const uncertain=await faulted(owner,url,input,{match:/^never$/,codes:[],loseCommitAcknowledgement:true},503,'PUT')
      assert.equal(uncertain.attempts,1)
      assert.equal((await request(controlApp,owner,'/api/me/blocks')).rows.length,1)
      await request(controlApp,owner,url,input,200,'PUT')
      assert.equal((await request(controlApp,owner,'/api/me/blocks')).rows.length,1)
      await request(controlApp,owner,url,undefined,200,'DELETE')
      await request(controlApp,owner,url,undefined,200,'DELETE')
    })
  } finally {
    pool.fault = null
    pool.afterRollback = null
    try {
      await admin.query('begin')
      await admin.query('set local session_replication_role=replica')
      await admin.query('delete from app_private.tenant_admin_action_categories where action_id in (select id from public.tenant_admin_actions where tenant_id=any($1::uuid[]))', [tenants])
      await admin.query('delete from app_private.community_account_requests where tenant_id=any($1::uuid[])', [tenants])
      for (const table of ['community_account_permissions', 'community_account_preferences', 'tenant_admin_actions', 'tenant_website_content_overrides',
        'community_account_profiles', 'community_accounts', 'tenant_staff_assignments', 'tenant_settings', 'tenants']) {
        await admin.query(`delete from public.${table} where ${table === 'tenants' ? 'id' : 'tenant_id'}=any($1::uuid[])`, [tenants])
      }
      await admin.query('delete from public.user_account_blocks where blocker_user_id=any($1::uuid[]) or blocked_user_id=any($1::uuid[])',[users])
      await admin.query('delete from public.user_account_profiles where user_id=any($1::uuid[])',[users])
      await admin.query('delete from public.user_accounts where user_id=any($1::uuid[])', [users])
      await admin.query('commit')
      for (const id of users) assert.ifError((await authAdmin.deleteUser(id)).error)
    } finally { await app.close(); await controlApp.close(); await admin.end() }
  }
})
