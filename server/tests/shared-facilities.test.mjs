import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import Fastify from 'fastify'
import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, sql } from 'kysely'
import { IneligibleActorError, withEligibleActorTransaction } from '../src/database.ts'
import { ApplicationError, registerHttpErrors } from '../src/http-errors.ts'
import { directoryCursors } from '../src/directory-cursors.ts'
import { getAuthenticatedContext, registerRequiredAuthentication } from '../src/http-authentication.ts'
import { actorId, targetId, tenantId } from './helpers/http-harness.mjs'

const context = { actorId, requestId: targetId }

function transactionDatabase(t, steps) {
  const pending = [...steps], events = [], queries = []
  class Driver extends DummyDriver {
    async acquireConnection() {
      return { executeQuery: async query => {
        events.push('query'); queries.push(query)
        assert.ok(pending.length, 'unexpected SQL execution')
        const step = pending.shift()
        if (step instanceof Error) throw step
        return { rows: step }
      } }
    }
    async beginTransaction() { events.push('begin') }
    async commitTransaction() { events.push('commit') }
    async rollbackTransaction() { events.push('rollback') }
    async releaseConnection() { events.push('release') }
  }
  const db = new Kysely({ dialect: {
    createDriver: () => new Driver(), createAdapter: () => new PostgresAdapter(),
    createQueryCompiler: () => new PostgresQueryCompiler(), createIntrospector: db => new PostgresIntrospector(db),
  } })
  t.after(async () => { await db.destroy(); assert.equal(pending.length, 0) })
  return { db, events, queries }
}

test('transaction binds trusted context, locks eligibility, then returns application status values unchanged', async t => {
  const h = transactionDatabase(t, [[], [{ allowed: true }]])
  const value = { status: 403, detail: null, eligible: false, value: 'application-owned' }
  const result = await withEligibleActorTransaction(h.db, context, async tx => {
    h.events.push('work')
    assert.equal(tx.isTransaction, true)
    assert.equal(h.queries.length, 2)
    return value
  })
  assert.equal(result, value)
  assert.deepEqual(h.events, ['begin', 'query', 'query', 'work', 'commit', 'release'])
  assert.equal(h.queries[0].sql.replace(/\s+/g, ' '),
    "select set_config('request.jwt.claim.sub', $1, true), set_config('ct.operation_id', $2, true)")
  assert.deepEqual(h.queries[0].parameters, [actorId, targetId])
  assert.equal(h.queries[1].sql, 'select app_private.lock_eligible_actor() as allowed')
})

test('denied eligibility skips application work without fabricating an application status', async t => {
  const h = transactionDatabase(t, [[], [{ allowed: false }]])
  await assert.rejects(withEligibleActorTransaction(h.db, context, async () => assert.fail('ineligible callback must not execute')), IneligibleActorError)
  assert.deepEqual(h.events, ['begin', 'query', 'query', 'rollback', 'release'])
})

test('eligibility-query errors propagate and roll back before application work', async t => {
  const failure = Object.assign(new Error('locked eligibility failed'), { code: '42501' })
  const h = transactionDatabase(t, [[], failure])
  await assert.rejects(withEligibleActorTransaction(h.db, context, async () => assert.fail('callback must not execute')), error => error === failure)
  assert.deepEqual(h.events, ['begin', 'query', 'query', 'rollback', 'release'])
})

test('typed eligibility denial maps to 403 without unexpected-error logging', async t => {
  const app = Fastify({ requestIdHeader: false })
  t.after(() => app.close())
  const logged = t.mock.method(console, 'error', () => {})
  registerHttpErrors(app)
  app.get('/denied', () => { throw new IneligibleActorError() })
  for (const method of ['GET', 'HEAD']) {
    const response = await app.inject({ method, url: '/denied' })
    assert.equal(response.statusCode, 403)
    if (method === 'HEAD') assert.equal(response.body, '')
    else {
      assert.equal(response.json().code, 'ineligible')
      assert.equal(typeof response.json().requestId, 'string')
    }
  }
  assert.equal(logged.mock.callCount(), 0)
})

test('application exceptions propagate unchanged and roll back work on the same transaction', async t => {
  const failure = new ApplicationError(409, 'stale_state')
  const h = transactionDatabase(t, [[], [{ allowed: true }], []])
  await assert.rejects(withEligibleActorTransaction(h.db, context, async tx => {
    await sql`select 42`.execute(tx)
    throw failure
  }), error => error === failure)
  assert.deepEqual(h.events, ['begin', 'query', 'query', 'query', 'rollback', 'release'])
})

test('authenticated contexts are isolated across overlapping requests and absent from public scope', async t => {
  const app = Fastify({ requestIdHeader: false }), contexts = [], verified = []
  t.after(() => app.close())
  app.get('/public', request => ({ decorated: request.server.hasRequestDecorator('authenticatedContext') }))
  app.register(async routes => {
    registerRequiredAuthentication(routes, async token => {
      verified.push(token)
      return token === 'first' ? actorId : token === 'second' ? targetId : null
    })
    routes.get('/protected', async request => {
      const authenticated = getAuthenticatedContext(request)
      assert.equal(authenticated.requestId, request.id)
      contexts.push(authenticated)
      await setImmediate()
      assert.equal(getAuthenticatedContext(request), authenticated)
      return authenticated
    })
  })
  const responses = await Promise.all(['first', 'second'].map(authorization => app.inject({ url: '/protected',
    headers: { authorization, 'x-request-id': 'forged' } })))
  assert.deepEqual(responses.map(response => response.json().actorId), [actorId, targetId])
  assert.notEqual(contexts[0], contexts[1])
  assert.notEqual(contexts[0].requestId, contexts[1].requestId)
  assert.ok(contexts.every(context => context.requestId !== 'forged'))
  assert.deepEqual((await app.inject({ url: '/public', headers: { authorization: 'invalid' } })).json(), { decorated: false })
  assert.deepEqual(verified, ['first', 'second'])
})

test('context extraction rejects both undecorated and not-yet-authenticated requests', async t => {
  const app = Fastify()
  t.after(() => app.close())
  app.get('/undeclared', request => {
    assert.throws(() => getAuthenticatedContext(request), { code: 'FST_ERR_DEC_UNDECLARED' })
    return { rejected: true }
  })
  app.register(async routes => {
    routes.decorateRequest('authenticatedContext', null)
    routes.get('/empty', request => {
      assert.throws(() => getAuthenticatedContext(request), /Authenticated context is unavailable/)
      return { rejected: true }
    })
  })
  for (const url of ['/undeclared', '/empty']) {
    const response = await app.inject({ url })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { rejected: true })
  }
})

test('relocated codec decodes a pre-refactor cursor and retains scope, key and tamper rejection', () => {
  const scope = ['member-directory', actorId, tenantId], key = '01'.repeat(32)
  // Captured from the original codec at a5cb9d1 with synthetic IDs and this key.
  const cursor = 'Yd9fIgvgaNBbFWpxJIz9_i8wCbNIGYsnfe4qRnAvpUgKF8rrfihMb6CCzd3yPFJ7DkBKsXf81WkuwlHgyEvXnA'
  const cursors = directoryCursors(key)
  assert.equal(cursors.decode(scope, cursor), targetId)
  assert.equal(cursors.decode(scope), null)
  assert.equal(cursors.decode(scope, cursors.encode(scope, targetId)), targetId)
  for (const decode of [() => cursors.decode(['owner-accounts', actorId, tenantId], cursor),
    () => directoryCursors('02'.repeat(32)).decode(scope, cursor),
    () => cursors.decode(scope, 'A' + cursor.slice(1)), () => cursors.decode(scope, cursor + '=')]) {
    assert.throws(decode, error => error instanceof ApplicationError && error.statusCode === 400 && error.message === 'invalid_cursor')
  }
  assert.throws(() => directoryCursors('invalid'), /DIRECTORY_CURSOR_KEY/)
})
