import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import Fastify from 'fastify'
import { createHealthService } from '../src/health/service.ts'
import { healthRoutes } from '../src/health/routes.ts'
import { registerHttpErrors } from '../src/http-errors.ts'
import { registerRequiredAuthentication, optionalAuthentication } from '../src/http-authentication.ts'
import { actorId, authorization, createHttpHarness } from './helpers/http-harness.mjs'

function harness(t) {
  const calls = [], identities = [], requests = [], registrations = [], hits = []
  let failure
  const service = {
    readLiveness(...args) { calls.push(['live', args]); return { live: true } },
    async readReadiness(...args) { calls.push(['ready', args]); if (failure) throw failure; return { ready: true } },
  }
  const verify = async header => { identities.push(header); return header === authorization.authorization ? actorId : null }
  const app = Fastify({ requestIdHeader: false, genReqId: () => randomUUID() })
  registerHttpErrors(app)
  app.addHook('onRequest', async request => { requests.push(request.id) })
  app.addHook('onRegister', (instance, options) => {
    if (options.service === service) {
      instance.decorateRequest('healthProbe', true)
      instance.addHook('onRequest', async request => { hits.push(request.url) })
    }
  })
  app.addHook('onRoute', function (route) {
    if (this.hasRequestDecorator('healthProbe')) registrations.push([route.method, route.url, route.schema ?? null])
  })
  app.register(healthRoutes, { service })
  const scope = request => ({ health: request.server.hasRequestDecorator('healthProbe'),
    identity: request.server.hasRequestDecorator('authenticatedContext') })
  app.get('/public-sibling', { onRequest: optionalAuthentication(verify) }, scope)
  app.register(async parent => {
    registerRequiredAuthentication(parent, verify)
    parent.get('/account-sibling', scope)
    parent.get('/community-sibling', scope)
  })
  t.after(() => app.close())
  return { app, calls, identities, requests, registrations, hits, fail: error => { failure = error } }
}

test('health service keeps liveness independent and awaits a fresh readiness check for each call', async () => {
  let checks = 0, release
  const barrier = new Promise(resolve => { release = resolve })
  const service = createHealthService({ checkReadiness: async () => { checks++; await barrier } })
  assert.deepEqual(service.readLiveness(), { live: true })
  assert.equal(checks, 0)
  let complete = false
  const pending = service.readReadiness().then(result => { complete = true; return result })
  await Promise.resolve()
  assert.equal(checks, 1)
  assert.equal(complete, false)
  release()
  assert.deepEqual(await pending, { ready: true })
  assert.deepEqual(await service.readReadiness(), { ready: true })
  assert.equal(checks, 2)
})

test('health service propagates the original readiness failure', async () => {
  const failure = new Error('private readiness detail')
  const service = createHealthService({ checkReadiness: async () => { throw failure } })
  await assert.rejects(service.readReadiness(), error => error === failure)
  assert.deepEqual(service.readLiveness(), { live: true })
})

test('health adapter registers exactly two GETs and HEADs without schemas or request restrictions', async t => {
  const h = harness(t)
  await h.app.ready()
  assert.deepEqual(h.registrations.sort(), [
    ['GET', '/health/live', null], ['GET', '/health/ready', null],
    ['HEAD', '/health/live', null], ['HEAD', '/health/ready', null],
  ])
  for (const method of ['GET', 'HEAD']) for (const probe of ['live', 'ready']) {
    for (const headers of [{}, { authorization: 'Bearer invalid' }]) {
      const response = await h.app.inject({ method, url: `/health/${probe}?extra=accepted`, headers })
      assert.equal(response.statusCode, 200)
      assert.equal(response.body, method === 'HEAD' ? '' : JSON.stringify({ [probe]: true }))
      assert.equal(response.headers['cache-control'], undefined)
      assert.deepEqual(h.calls.at(-1), [probe, []])
    }
  }
  assert.equal(h.calls.length, 8)
  assert.deepEqual(h.identities, [])
})

test('readiness adapter uses root unavailable mapping, trusted request IDs and safe logging for GET and HEAD', async t => {
  const h = harness(t), logs = []
  t.mock.method(console, 'error', (...args) => logs.push(args))
  h.fail(new Error('private connection detail'))
  for (const method of ['GET', 'HEAD']) {
    const response = await h.app.inject({ method, url: '/health/ready', headers: { authorization: 'Bearer invalid', 'request-id': 'forged' } })
    assert.equal(response.statusCode, 503)
    assert.equal(response.headers['cache-control'], undefined)
    assert.equal(response.body, method === 'HEAD' ? '' : JSON.stringify({ code: 'unavailable', requestId: h.requests.at(-1) }))
    assert.notEqual(h.requests.at(-1), 'forged')
    assert.deepEqual(logs.at(-1), ['API request failed', h.requests.at(-1), 'internal'])
  }
  assert.deepEqual(h.identities, [])
  assert.equal(h.calls.length, 2)
  assert.equal(logs.length, 2)
})

test('health hooks stay encapsulated and sibling authentication/cache behavior remains intact', async t => {
  const h = harness(t)
  for (const url of ['/account-sibling', '/community-sibling']) {
    const allowed = await h.app.inject({ url, headers: authorization })
    assert.deepEqual(allowed.json(), { health: false, identity: true })
    assert.equal(allowed.headers['cache-control'], 'private, no-store')
    const denied = await h.app.inject(url)
    assert.equal(denied.statusCode, 401)
  }
  const publicResponse = await h.app.inject('/public-sibling')
  assert.deepEqual(publicResponse.json(), { health: false, identity: false })
  assert.equal(publicResponse.headers['cache-control'], 'no-store')
  assert.equal((await h.app.inject({ url: '/public-sibling', headers: { authorization: 'Bearer invalid' } })).statusCode, 401)
  const before = h.identities.length
  assert.equal((await h.app.inject({ url: '/health/live', headers: { authorization: 'Bearer invalid' } })).statusCode, 200)
  assert.equal(h.identities.length, before)
  assert.deepEqual(h.hits, ['/health/live'])
})

test('application composition keeps liveness query-free and readiness on the existing runtime check', async t => {
  const h = createHttpHarness(t)
  assert.equal((await h.app.inject('/health/live')).statusCode, 200)
  assert.deepEqual(h.queries, [])
  h.queue([{ ready: true }])
  assert.equal((await h.app.inject('/health/ready')).body, '{"ready":true}')
  assert.equal(h.queries.length, 1)
  assert.match(h.queries[0].sql, /current_user = 'ct_api' and session_user = 'ct_api'/)
  assert.deepEqual(h.queries[0].parameters, [])
  assert.deepEqual(h.verifications, [])
})
