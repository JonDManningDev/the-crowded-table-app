import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import pg from 'pg'
import { Kysely, PostgresDialect, PostgresQueryCompiler, sql } from 'kysely'
import { withEligibleActorTransaction } from '../../src/database.ts'
import { communityCommand, ownCommunityPreferences, configurationSettings } from '../../src/communities/service.ts'
import { setOwnBlock } from '../../src/user-accounts/service.ts'
import { buildApi } from '../../src/app.ts'
import { verifyBearer } from '../../src/token-verifier.ts'
import { directoryCursors } from '../../src/directory-cursors.ts'

// Fault injection remains at the real pg boundary, never in production services.
class RetryPool extends pg.Pool {
  fault
  attempts = 0
  patched = new WeakSet()
  async connect() {
    const client = await super.connect()
    if (!this.patched.has(client)) {
      this.patched.add(client)
      const query = client.query.bind(client)
      client.query = async (text, parameters) => {
        if (text === 'begin') this.attempts++
        const result = await query(text, parameters)
        if (this.fault?.code && this.fault.match.test(text)) {
          const code = this.fault.code
          this.fault.code = undefined
          await query(`do $$ begin raise exception using errcode='${code}',message='hosted policy verification'; end $$`)
        }
        if (text === 'rollback' && this.fault?.afterRollback) {
          const change = this.fault.afterRollback
          this.fault.afterRollback = undefined
          await change()
        }
        return result
      }
    }
    return client
  }
}

// Observe the actual competing root statement after HTTP/Auth/transaction setup.
// No service query, verifier or database timeout is replaced by this observer.
export function observeRootQuery(database) {
  let notify
  const compiler = new PostgresQueryCompiler()
  return {
    db: database.withPlugin({
      transformQuery(args) {
        const text = compiler.compileQuery(args.node, args.queryId).sql.replaceAll('"', '')
        if (notify?.match.test(text)) { const done = notify.resolve; notify = undefined; done() }
        return args.node
      },
      async transformResult(args) { return args.result },
    }),
    nextRootQuery: match => new Promise(resolve => { notify = { match, resolve } }),
  }
}

export async function focusedPolicyChecks({ db, endpoint, owner, member, other, tenant, slug, http, anonKey, projectUrl, nextRootQuery }) {
  const races = []
  const path = '/api/communities/' + tenant
  const command = (actor, body, status = 200) => http(actor, path + '/commands', 'POST', body, status)
  const settings = (actor, body, status = 200) => http(actor, path + '/settings', 'PATCH', body, status)
  const preferences = (actor, body, status = 200) => http(actor, path + '/me/preferences', body ? 'PATCH' : 'GET', body, status)
  const review = actor => http(owner, path + '/accounts/' + actor.id + '/review')
  const history = actor => http(actor, path + '/history?limit=100')
  const transaction = (actor, work, options) => withEligibleActorTransaction(db, { actorId: actor.id, requestId: randomUUID() }, work, options)

  // A held service operation uses the same locks and actual runtime as HTTP.
  async function race(actor, work, compete, { root = /from (?:public\.)?tenants\b[\s\S]*for update/, initialTenantId } = {}) {
    let ready, release
    const started = new Promise(resolve => { ready = resolve })
    const gate = new Promise(resolve => { release = resolve })
    const held = transaction(actor, async tx => {
      await work(tx)
      ready((await sql`select pg_backend_pid() as pid`.execute(tx)).rows[0].pid)
      await gate
    }, initialTenantId ? { initialTenantId } : undefined)
    const pid = await Promise.race([started, held.then(() => { throw Error('holder exited before barrier') })])
    const reachingRoot = nextRootQuery(root)
    const requestStarted = Date.now()
    const waiting = compete()
    waiting.catch(() => {})
    let arrivalTimer
    try {
      const arrivalDeadline = new Promise((_, reject) => {
        arrivalTimer = setTimeout(() => reject(Error('competitor did not reach its root query within 6000ms')), 6000)
      })
      await Promise.race([reachingRoot, arrivalDeadline, waiting.then(() => { throw Error('competitor exited before root-query barrier') }), held.then(() => { throw Error('holder exited before competitor reached root') })])
      const setupMs = Date.now() - requestStarted
      const start = Date.now()
      const deadline = Date.now() + 1800
      while (!(await sql`select exists(select from pg_stat_activity where ${pid}=any(pg_blocking_pids(pid))) as blocked`.execute(db)).rows[0].blocked) {
        assert.ok(Date.now() < deadline, 'competing operation must wait on the actual held root after reaching its root query')
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      races.push({ request_setup_ms: setupMs, lock_observation_ms: Date.now() - start, actual_wait_observed: true })
    } finally { clearTimeout(arrivalTimer); release(); await Promise.allSettled([held, waiting]); await held }
    return waiting
  }

  await http(other, path + '/details', 'GET', undefined, 404)
  await settings(owner, { auto_approve_users: true })
  await command(other, { kind: 'join', profile: { displayName: 'Hosted other', bio: null } })
  const profile = await http(other, '/api/me/profile', 'PUT', { display_name: '  Hosted other  ', bio: '  Profile  ' })
  assert.equal(profile.profile.display_name, 'Hosted other'); assert.equal(profile.profile.bio, 'Profile')
  await http(member, path + '/accounts/' + other.id + '/permissions', 'PATCH', { can_post_public_events: true }, 403)
  await race(other, tx => ownCommunityPreferences(tx, other.id, tenant, { show_global_profile: true }),
    () => command(other, { kind: 'deactivate' }), { root: /from (?:public\.)?community_accounts\b[\s\S]*for update/ })
  assert.equal((await preferences(other)).show_global_profile, false)
  await command(other, { kind: 'reactivate' })
  await race(other, tx => communityCommand(tx, other.id, tenant, { kind: 'deactivate' }),
    () => preferences(other, { show_global_profile: true }, 404), { root: /from (?:public\.)?community_accounts\b[\s\S]*for update/ })
  await command(other, { kind: 'reactivate' })
  console.log('PASS both hosted sharing/deactivation lock orders')

  const global = { confirmed: true, source: { kind: 'global_profile' } }
  const globalPreferences = value => http(other, '/api/me/preferences', 'PUT', { user_is_discoverable: value, enable_matchmaking: true, allow_direct_messages: true })
  const block = (status = 200) => http(owner, '/api/me/blocks/' + other.id, 'PUT', global, status)
  const unblock = () => http(owner, '/api/me/blocks/' + other.id, 'DELETE')
  await race(other, tx => sql`update public.user_accounts set user_is_discoverable=false where user_id=${other.id}`.execute(tx), () => block(404), { root: /from (?:public\.)?user_accounts\b[\s\S]*for share/ })
  await globalPreferences(true)
  await race(owner, tx => setOwnBlock(tx, owner.id, other.id, global), () => globalPreferences(false), { root: /update (?:public\.)?user_accounts\b/ })
  await unblock()
  await http(owner, '/api/profiles/' + other.id, 'GET', undefined, 404)
  await globalPreferences(true)
  console.log('PASS both hosted block/source-revocation lock orders')

  await command(owner, { kind: 'permissions', target: member.id, permissions: { can_manage_settings: true } })
  await race(owner, tx => communityCommand(tx, owner.id, tenant, { kind: 'archive', archived: true }),
    () => settings(member, { pause_community_events: true }, 403))
  await http(member, path + '/accounts/' + member.id + '/profile', 'GET', undefined, 404)
  const archived = await transaction(member, async tx => {
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    return (await sql`select user_id from public.community_account_profiles where tenant_id=${tenant}`.execute(tx)).rows
  })
  assert.deepEqual(archived, [])
  assert.ok((await http(member, '/api/me/communities')).rows.some(row => row.id === tenant))
  await command(owner, { kind: 'archive', archived: false })
  await race(member, tx => configurationSettings(tx, member.id, tenant, { pause_community_events: true }),
    () => command(owner, { kind: 'archive', archived: true }), { initialTenantId: tenant })
  await command(owner, { kind: 'archive', archived: false })
  await settings(owner, { pause_community_events: false })
  const revoke = { kind: 'permissions', target: member.id, permissions: { can_manage_settings: false } }
  await race(owner, tx => communityCommand(tx, owner.id, tenant, revoke),
    () => settings(member, { pause_community_events: true }, 403))
  await command(owner, { ...revoke, permissions: { can_manage_settings: true } })
  await race(member, tx => configurationSettings(tx, member.id, tenant, { pause_community_events: true }),
    () => command(owner, revoke), { initialTenantId: tenant })
  await settings(member, { pause_community_events: false }, 403)
  await command(owner, { ...revoke, permissions: { can_manage_settings: true } })
  console.log('PASS both hosted archive/write and permission/write lock orders, G-02 and own-card exception')

  const pool = new RetryPool({ connectionString: endpoint, max: 1, statement_timeout: 5000, lock_timeout: 2000 })
  const retryDb = new Kysely({ dialect: new PostgresDialect({ pool }) })
  const app = buildApi({ db: retryDb, verify: verifyBearer(projectUrl, anonKey), cursors: directoryCursors(randomBytes(32).toString('hex')), cleanup: () => retryDb.destroy() })
  async function faulted(actor, payload, fault, expected) {
    pool.fault = fault; pool.attempts = 0
    try {
      const response = await app.inject({ method: 'PATCH', url: path + '/settings', payload, headers: { authorization: 'Bearer ' + actor.token } })
      assert.equal(response.statusCode, expected, response.body)
      assert.equal(pool.attempts, 2)
    } finally { pool.fault = undefined }
  }
  try {
    await settings(owner, { pause_community_events: false })
    const before = (await history(owner)).rows
    await faulted(owner, { pause_community_events: true }, { match: /insert into "tenant_admin_actions"/, code: '40001' }, 200)
    const added = (await history(owner)).rows.filter(row => !before.some(old => old.id === row.id))
    assert.equal(added.length, 1); assert.equal(added[0].action, 'tenant_settings.update')
    assert.deepEqual(added[0].categories, []); assert.equal(added[0].created_by, owner.id)
    await faulted(member, { pause_community_events: false }, { match: /update public\.tenant_settings/, code: '40P01', afterRollback: () => command(owner, revoke) }, 403)
    assert.equal((await http(owner, path + '/settings')).pause_community_events, true)
    await assert.rejects(transaction(owner, async tx => {
      await configurationSettings(tx, owner.id, tenant, { pause_community_events: false })
      throw Error('deliberate rollback')
    }, { initialTenantId: tenant }), /deliberate rollback/)
    assert.equal((await http(owner, path + '/settings')).pause_community_events, true)
    const noOp = (await history(owner)).rows
    await settings(owner, { pause_community_events: true })
    assert.deepEqual((await history(owner)).rows, noOp)
  } finally { await app.close() }

  await command(owner, { kind: 'grant', target: other.id })
  await command(owner, { kind: 'permissions', target: other.id, permissions: { can_audit_staff_accounts: true } })
  const reason = 'Hosted private discipline reason'
  await command(owner, { kind: 'suspend', target: member.id, revision: (await review(member)).revision, reason })
  const all = (await history(owner)).rows
  const suspension = all.find(row => row.action === 'community_suspended')
  const linked = all.find(row => row.action === 'staff_revoked' && row.operation_id === suspension.operation_id)
  assert.equal(suspension.reason, reason); assert.deepEqual(suspension.categories, ['community_account'])
  assert.equal(linked.reason, null); assert.deepEqual(linked.categories, ['community_account','staff_account'])
  const staffHistory = (await history(other)).rows
  assert.ok(staffHistory.some(row => row.id === linked.id))
  assert.ok(!JSON.stringify(staffHistory).includes(reason))
  await http(member, path + '/me/profile', 'PATCH', { display_name: 'Suspended hosted member', bio: null })
  await command(owner, { kind: 'clear', target: member.id, revision: (await review(member)).revision })

  for (const probe of [
    tx => sql`update public.tenant_admin_actions set reason='forged' where id=${suspension.id}`.execute(tx),
    tx => sql`delete from app_private.tenant_admin_action_categories where action_id=${linked.id}`.execute(tx),
    tx => sql`update public.user_accounts set updated_by=${other.id} where user_id=${owner.id}`.execute(tx),
  ]) await assert.rejects(transaction(owner, async tx => {
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await probe(tx)
  }), error => ['42501','23514'].includes(error.code))
  await assert.rejects(transaction(member, async tx => {
    await sql`select set_config('ct.tenant_id',${tenant},true)`.execute(tx)
    await sql`update public.community_account_preferences set show_global_profile=true where tenant_id=${tenant} and user_id=${member.id}`.execute(tx)
    await sql`update public.community_accounts set standing='inactive' where tenant_id=${tenant} and user_id=${member.id}`.execute(tx)
  }), error => error.code === '23514')
  await http(null, '/api/public/communities/' + slug + '/directory')
  console.log('PASS hosted retry/fresh denial, rollback, no-op/audit categories/privacy, trusted metadata and append-only/inactive-sharing denials')
  return races
}
