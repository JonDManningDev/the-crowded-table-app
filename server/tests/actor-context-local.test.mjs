import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import pg from 'pg'
import { sql } from 'kysely'
import { createClient } from '@supabase/supabase-js'
import { localStack } from '../../supabase/tests/local-stack.mjs'
import { connectDatabase, checkRuntime, withEligibleActorTransaction, IneligibleActorError } from '../src/database.ts'

test('ordered actor context on the real runtime role', async t => {
  const local = localStack(), endpoint = new URL(process.env.DATABASE_URL)
  assert.ok(['localhost', '127.0.0.1'].includes(endpoint.hostname))
  assert.equal(endpoint.username, 'ct_api'); assert.equal(endpoint.port, new URL(local.DB_URL).port)
  const db = connectDatabase(endpoint.href, 1)
  const admin = new pg.Client({ connectionString: local.DB_URL })
  const writer = new pg.Client({ connectionString: local.DB_URL })
  const auth = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin
  const users = []
  const context = actorId => ({ actorId, requestId: randomUUID() })
  const facts = async tx => (await sql`select current_user, session_user,
    nullif(current_setting('request.jwt.claim.sub',true),'') as actor,
    nullif(current_setting('ct.operation_id',true),'') as operation,
    current_setting('search_path') as path, pg_backend_pid() as pid`.execute(tx)).rows[0]
  const clear = async () => {
    const row = await facts(db)
    assert.equal(row.actor, null); assert.equal(row.operation, null)
    assert.equal(row.current_user, 'ct_api'); assert.equal(row.session_user, 'ct_api')
  }
  async function user() {
    const made = await auth.createUser({ email: `actor-context-${randomUUID()}@example.test`, email_confirm: true })
    assert.ifError(made.error); users.push(made.data.user.id); return made.data.user.id
  }
  async function waiting(blocker) {
    const deadline = Date.now() + 1500
    while (Date.now() < deadline) {
      const result = await admin.query('select exists(select from pg_stat_activity where $1::int=any(pg_blocking_pids(pid))) as blocked', [blocker])
      if (result.rows[0].blocked) return
      await delay(10)
    }
    assert.fail('expected row-lock wait before the runtime lock timeout')
  }
  try {
    await admin.connect(); await writer.connect(); await checkRuntime(db)
    const writerPid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid
    const a = await user(), b = await user()

    await t.test('invoker function has the exact restricted boundary and leaves the Auth definer narrow', async () => {
      const fn = (await admin.query(`select p.prosecdef,p.provolatile,p.proconfig,pg_get_userbyid(p.proowner) as owner,
        has_function_privilege('ct_api',p.oid,'EXECUTE') as runtime,
        exists(select from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) where grantee=0 and privilege_type='EXECUTE') as public_execute
        from pg_proc p where p.oid='app_private.begin_actor_context(uuid,uuid)'::regprocedure`)).rows[0]
      assert.deepEqual(fn, { prosecdef: false, provolatile: 'v', proconfig: ['search_path=""'], owner: 'postgres', runtime: true, public_execute: false })
      for (const role of ['anon', 'authenticated', 'service_role']) {
        assert.equal((await admin.query("select has_function_privilege($1,'app_private.begin_actor_context(uuid,uuid)','EXECUTE') as allowed", [role])).rows[0].allowed, false)
        await assert.rejects(admin.query(`begin; set local role ${role}; select app_private.begin_actor_context('${a}', '${randomUUID()}'); commit`), { code: '42501' })
        await admin.query('rollback')
      }
      await assert.rejects(sql`select id from auth.users`.execute(db), { code: '42501' })
      const primitive = (await admin.query("select prosecdef,provolatile from pg_proc where oid='app_private.lock_eligible_actor()'::regprocedure")).rows[0]
      assert.deepEqual(primitive, { prosecdef: true, provolatile: 'v' })
    })

    await t.test('context survives function return, preserves search_path, and clears after commit or rollback', async () => {
      const originalPath = (await facts(db)).path
      for (const actor of [a, b]) {
        const trusted = context(actor)
        assert.equal(await withEligibleActorTransaction(db, trusted, async tx => {
          const row = await facts(tx)
          assert.equal(row.actor, actor); assert.equal(row.operation, trusted.requestId); assert.equal(row.path, originalPath)
          await tx.updateTable('user_accounts').set({ allow_direct_messages: false }).where('user_id', '=', actor).execute()
          return 'callback value'
        }), 'callback value')
        assert.equal((await admin.query('select updated_by from public.user_accounts where user_id=$1', [actor])).rows[0].updated_by, actor)
        await clear()
        await assert.rejects(withEligibleActorTransaction(db, trusted, async tx => {
          assert.equal((await facts(tx)).actor, actor)
          await tx.updateTable('user_accounts').set({ allow_direct_messages: true }).where('user_id', '=', actor).execute()
          throw new Error('rollback probe')
        }), /rollback probe/)
        assert.equal((await admin.query('select allow_direct_messages from public.user_accounts where user_id=$1', [actor])).rows[0].allow_direct_messages, false)
        await clear()
      }
      for (const invalid of [{ actorId: null, requestId: randomUUID() }, { actorId: a, requestId: null }, context(randomUUID())]) {
        await assert.rejects(withEligibleActorTransaction(db, invalid, () => assert.fail('denied callback')), IneligibleActorError)
        await clear()
      }
      for (const invalid of [{ actorId: 'malformed', requestId: randomUUID() }, { actorId: a, requestId: 'malformed' }]) {
        await assert.rejects(withEligibleActorTransaction(db, invalid, () => assert.fail('invalid callback')), { code: '22P02' })
        await clear()
      }
    })

    await t.test('committed Auth changes win before the function lock; rollback preserves eligibility', async () => {
      for (const [change, commit] of [
        ["banned_until=now()+interval '1 hour'", true], ['email_confirmed_at=null', true],
        ['email=null', true], ['is_anonymous=true', true], ["banned_until=now()+interval '1 hour'", false],
      ]) {
        const actor = await user()
        await writer.query('begin')
        let attempt
        try {
          await writer.query(`update auth.users set ${change} where id=$1`, [actor])
          attempt = withEligibleActorTransaction(db, context(actor), async tx => (await facts(tx)).actor)
          const outcome = attempt.then(value => ({ value }), error => ({ error }))
          await waiting(writerPid)
          await writer.query(commit ? 'commit' : 'rollback')
          const result = await outcome
          if (commit) assert.ok(result.error instanceof IneligibleActorError)
          else assert.equal(result.value, actor)
        } finally { await writer.query('rollback'); if (attempt) await attempt.catch(() => {}) }
        await clear()
      }
      const removed = await user()
      await writer.query('begin')
      let attempt
      try {
        await writer.query('delete from public.user_accounts where user_id=$1', [removed])
        await writer.query('delete from auth.users where id=$1', [removed])
        attempt = withEligibleActorTransaction(db, context(removed), () => assert.fail('deleted actor callback'))
        const outcome = attempt.catch(error => error)
        await waiting(writerPid); await writer.query('commit')
        assert.ok(await outcome instanceof IneligibleActorError)
        users.splice(users.indexOf(removed), 1)
      } finally { await writer.query('rollback'); if (attempt) await attempt.catch(() => {}) }
      await clear()
    })

    await t.test('an acquired Auth share lock holds through application work and orders before a later ban', async () => {
      let release, ready
      const gate = new Promise(resolve => { release = resolve })
      const started = new Promise(resolve => { ready = resolve })
      const running = withEligibleActorTransaction(db, context(a), async tx => {
        ready((await facts(tx)).pid); await gate; return 'authorized before ban'
      })
      const pid = await started
      const update = writer.query("update auth.users set banned_until=now()+interval '1 hour' where id=$1", [a])
      try { await waiting(pid) } finally { release() }
      assert.equal(await running, 'authorized before ban'); await update
      await assert.rejects(withEligibleActorTransaction(db, context(a), () => assert.fail('banned callback')), IneligibleActorError)
      await clear()
    })

    await t.test('pending unban may deny without waiting, and ban expiry uses transaction-start time', async () => {
      await writer.query('begin')
      try {
        await writer.query('update auth.users set banned_until=null where id=$1', [a])
        await assert.rejects(withEligibleActorTransaction(db, context(a), () => assert.fail('pending unban callback')), IneligibleActorError)
      } finally { await writer.query('rollback') }
      await db.transaction().execute(async tx => {
        await sql`select now()`.execute(tx)
        await admin.query('update auth.users set banned_until=clock_timestamp() where id=$1', [b])
        assert.equal((await sql`select app_private.begin_actor_context(${b}::uuid,${randomUUID()}::uuid) as allowed`.execute(tx)).rows[0].allowed, false)
      })
      assert.equal(await withEligibleActorTransaction(db, context(b), async tx => (await facts(tx)).actor), b)
      await clear()
    })
  } finally {
    try {
      await writer.query('rollback')
      for (const id of users) {
        await admin.query('delete from public.user_accounts where user_id=$1', [id])
        assert.ifError((await auth.deleteUser(id)).error)
      }
    } finally { await db.destroy(); await writer.end(); await admin.end() }
  }
})
