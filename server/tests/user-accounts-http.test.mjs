import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Fastify from 'fastify'
import { ApplicationError } from '../src/application-errors.ts'
import { getAuthenticatedContext, registerRequiredAuthentication } from '../src/http-authentication.ts'
import { registerHttpErrors } from '../src/http-errors.ts'
import { userAccountRoutes } from '../src/user-accounts/routes.ts'
import { actorId, authorization, createHttpHarness, targetId, tenantId } from './helpers/http-harness.mjs'

const flags = { user_is_discoverable: true, enable_matchmaking: false, allow_direct_messages: true }
const profile = { user_id: actorId, display_name: 'Test person', bio: null, created_at: '2026-11-04T00:00:00.000Z',
  updated_at: '2026-11-04T00:00:00.000Z', created_by: actorId, updated_by: actorId }
const summary = { id: tenantId, name: 'Test community', city: null, state_province: null, country_code: 'HN',
  operational_status: 'active', created_at: profile.created_at, is_owned: true, is_managed: true, is_member: true }
const block = { blocker_user_id: actorId, blocked_user_id: targetId, created_at: profile.created_at, created_by: actorId }
const profileInput = { display_name: '  Test person  ', bio: null }
const blockInput = { confirmed: true, source: { kind: 'community_profile', tenantId } }
const taggedFlags = { eligible: true, value: { status: 200, row: { ...flags, internal_secret: 'omit' } } }
const cases = [
  { operation: 'readAccountPreferences', method: 'GET', path: '/api/me/preferences', result: taggedFlags, expected: flags },
  { operation: 'saveAccountPreferences', method: 'PUT', path: '/api/me/preferences', payload: flags, args: [flags], result: taggedFlags, expected: flags },
  { operation: 'readOwnProfile', method: 'GET', path: '/api/me/profile', result: { profile: { ...profile, internal_secret: 'omit' } }, expected: { profile } },
  { operation: 'saveOwnProfile', method: 'PUT', path: '/api/me/profile', payload: profileInput, args: [profileInput], result: { profile }, expected: { profile } },
  { operation: 'listMyCommunities', method: 'GET', path: '/api/me/communities', query: '?filter=managed&limit=2&cursor=opaque',
    args: [{ filter: 'managed', limit: '2', cursor: 'opaque' }], result: { rows: [{ ...summary, internal_secret: 'omit' }], next: 'next-cursor' }, expected: { rows: [summary], next: 'next-cursor' } },
  { operation: 'discoverGlobalProfiles', method: 'GET', path: '/api/profiles', query: '?q=%20CaFe%20&limit=2&cursor=opaque',
    args: [{ q: ' CaFe ', limit: '2', cursor: 'opaque' }], result: { rows: [{ ...profile, internal_secret: 'omit' }], next: null }, expected: { rows: [profile], next: null } },
  { operation: 'readGlobalProfile', method: 'GET', path: `/api/profiles/${targetId}`, args: [targetId], result: { ...profile, internal_secret: 'omit' }, expected: profile },
  { operation: 'listAccountBlocks', method: 'GET', path: '/api/me/blocks', query: '?limit=2&cursor=opaque', args: [{ limit: '2', cursor: 'opaque' }],
    result: { rows: [{ ...block, internal_secret: 'omit' }], next: null }, expected: { rows: [block], next: null } },
  { operation: 'blockAccount', method: 'PUT', path: `/api/me/blocks/${targetId}`, payload: blockInput, args: [targetId, blockInput],
    result: { blocked: true, internal_secret: 'omit' }, expected: { blocked: true } },
  { operation: 'unblockAccount', method: 'DELETE', path: `/api/me/blocks/${targetId}`, args: [targetId],
    result: { blocked: false, internal_secret: 'omit' }, expected: { blocked: false } },
]

function harness(t) {
  const pending = [], calls = [], unexpected = [], verifications = [], requests = [], registrations = [], featureHits = []
  const service = Object.fromEntries(cases.map(({ operation }) => [operation, async (...args) => {
    calls.push({ operation, args })
    const step = pending.shift()
    if (!step || step.operation !== operation) {
      unexpected.push(operation)
      throw new Error(`Unexpected service operation: ${operation}`)
    }
    if (step.result instanceof Error) throw step.result
    return step.result
  }]))
  const app = Fastify({ bodyLimit: 8192, requestIdHeader: false, genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } })
  registerHttpErrors(app)
  app.addHook('onRequest', async request => { requests.push({ id: request.id, url: request.url }) })
  app.addHook('onRegister', (instance, options) => {
    if (options.service === service) {
      instance.decorateRequest('accountAdapterProbe', true)
      instance.addHook('onRequest', async request => { featureHits.push(request.url) })
    }
  })
  app.addHook('onRoute', function (route) {
    if (this.hasRequestDecorator('accountAdapterProbe')) registrations.push({ method: route.method, path: route.url })
  })
  const scope = request => ({ context: request.server.hasRequestDecorator('authenticatedContext'),
    feature: request.server.hasRequestDecorator('accountAdapterProbe') })
  app.get('/public-sibling', scope)
  app.get('/health-sibling', scope)
  app.register(async parent => {
    registerRequiredAuthentication(parent, async header => { verifications.push(header); return header === authorization.authorization ? actorId : null })
    parent.register(userAccountRoutes, { service })
    parent.get('/community-sibling', request => ({ ...scope(request), actor: getAuthenticatedContext(request).actorId }))
  })
  t.after(async () => {
    try { await app.close() } finally {
      assert.deepEqual(unexpected, [])
      assert.equal(pending.length, 0, 'all expected service calls must execute')
    }
  })
  return { app, calls, verifications, requests, registrations, featureHits,
    queue: (operation, result) => pending.push({ operation, result }) }
}

function requestOptions(item, method = item.method) {
  return { method, url: item.path + (item.query ?? ''), headers: { ...authorization, 'x-request-id': 'forged' },
    ...(item.payload !== undefined && { payload: item.payload }) }
}
function assertCall(h, item) {
  const call = h.calls.at(-1)
  assert.equal(call.operation, item.operation)
  assert.deepEqual(call.args[0], { actorId, requestId: h.requests.at(-1).id })
  assert.notEqual(call.args[0].requestId, 'forged')
  // Query parser prototypes are not part of the transport DTO contract.
  assert.deepEqual(JSON.parse(JSON.stringify(call.args.slice(1))), item.args ?? [])
}
function assertError(h, response, status, code, head = false) {
  assert.equal(response.statusCode, status)
  assert.equal(response.headers['cache-control'], 'private, no-store')
  if (head) assert.equal(response.body, '')
  else assert.deepEqual(response.json(), { code, requestId: h.requests.at(-1).id })
}

test('isolated plugin registers exactly ten operations and dispatches validated context/input with fixed projections', async t => {
  const h = harness(t)
  await h.app.ready()
  const baseline = JSON.parse(readFileSync(new URL('./fixtures/http-contract.json', import.meta.url), 'utf8'))
  const expectedPaths = new Set(['/api/me/preferences', '/api/me/profile', '/api/me/communities', '/api/profiles',
    '/api/profiles/:userId', '/api/me/blocks', '/api/me/blocks/:userId'])
  const expected = baseline.routes.filter(route => expectedPaths.has(route.path)).map(({ method, path }) => ({ method, path }))
  const sorted = items => items.map(item => `${item.method} ${item.path}`).sort()
  assert.equal(h.registrations.length, 16)
  assert.deepEqual(sorted(h.registrations), sorted(expected))
  for (const item of cases) {
    const before = h.verifications.length
    h.queue(item.operation, item.result)
    const response = await h.app.inject(requestOptions(item))
    assert.equal(response.statusCode, 200, item.operation)
    assert.equal(response.headers['cache-control'], 'private, no-store')
    assert.deepEqual(response.json(), item.expected)
    assert.equal(h.verifications.length - before, 1)
    assertCall(h, item)
  }
  assert.equal(h.calls.length, 10)
  assert.equal(new Set(h.calls.map(call => call.args[0].requestId)).size, 10)
})

test('all six automatic HEAD routes dispatch the matching GET operation and expose no body', async t => {
  const h = harness(t)
  for (const item of cases.filter(item => item.method === 'GET')) {
    const before = h.verifications.length
    h.queue(item.operation, item.result)
    const response = await h.app.inject(requestOptions(item, 'HEAD'))
    assert.equal(response.statusCode, 200)
    assert.equal(response.body, '')
    assert.equal(response.headers['cache-control'], 'private, no-store')
    assert.equal(h.verifications.length - before, 1)
    assertCall(h, item)
  }
  assert.equal(h.calls.length, 6)
})

test('all feature operations and HEADs reject identity before validation or service execution', async t => {
  const h = harness(t)
  for (const item of cases.flatMap(item => item.method === 'GET' ? [item, { ...item, method: 'HEAD' }] : [item])) {
    for (const header of [undefined, 'Bearer invalid']) {
      const response = await h.app.inject({ ...requestOptions(item), url: item.path + '?forged_actor=1',
        headers: header ? { authorization: header } : {} })
      assertError(h, response, 401, 'unauthenticated', item.method === 'HEAD')
    }
  }
  assert.equal(h.verifications.length, 32)
  assert.equal(h.calls.length, 0)
})

test('route schemas reject forbidden fields, invalid selectors and wrong scalar types before service execution', async t => {
  const h = harness(t)
  const invalid = [
    { method: 'GET', url: '/api/me/preferences?actor=forged' },
    { method: 'PUT', url: '/api/me/preferences', payload: { ...flags, user_id: targetId } },
    { method: 'PUT', url: '/api/me/preferences', payload: { ...flags, allow_direct_messages: 'false' } },
    { method: 'PUT', url: '/api/me/preferences', payload: {} },
    { method: 'GET', url: '/api/me/profile?extra=1' },
    { method: 'PUT', url: '/api/me/profile', payload: { display_name: 'Missing bio' } },
    { method: 'GET', url: '/api/me/communities?filter=everyone' },
    { method: 'GET', url: '/api/profiles?limit=101' },
    { method: 'GET', url: '/api/profiles?q=one&q=two' },
    { method: 'GET', url: '/api/profiles/not-a-uuid' },
    { method: 'GET', url: '/api/me/blocks?q=private' },
    { method: 'PUT', url: `/api/me/blocks/${targetId}`, payload: { ...blockInput, confirmed: false } },
    { method: 'PUT', url: `/api/me/blocks/${targetId}`, payload: { confirmed: true, source: { kind: 'community_profile' } } },
    { method: 'PUT', url: `/api/me/blocks/${targetId}`, payload: { ...blockInput, actorId } },
    { method: 'DELETE', url: '/api/me/blocks/not-a-uuid' },
  ]
  for (const input of invalid) assertError(h, await h.app.inject({ ...input, headers: authorization }), 400, 'invalid_request')
  assert.equal(h.calls.length, 0)
  assert.equal(h.verifications.length, invalid.length)
})

test('adapter preserves preference result branches, application errors, profile null and empty pages', async t => {
  const h = harness(t)
  for (const item of cases.slice(0, 2)) {
    h.queue(item.operation, { eligible: false })
    assertError(h, await h.app.inject(requestOptions(item)), 403, 'ineligible')
    h.queue(item.operation, { eligible: true, value: { status: 404 } })
    assertError(h, await h.app.inject(requestOptions(item)), 404, 'missing')
  }
  const failures = [
    ['readOwnProfile', 403, 'ineligible'], ['saveOwnProfile', 403, 'ineligible'],
    ['listMyCommunities', 400, 'invalid_cursor'], ['discoverGlobalProfiles', 400, 'invalid_cursor'],
    ['readGlobalProfile', 404, 'missing'], ['listAccountBlocks', 400, 'invalid_cursor'],
    ['blockAccount', 404, 'missing'], ['unblockAccount', 400, 'invalid_target'],
  ]
  for (const [operation, status, code] of failures) {
    h.queue(operation, new ApplicationError(status, code))
    assertError(h, await h.app.inject(requestOptions(cases.find(item => item.operation === operation))), status, code)
  }
  h.queue('readOwnProfile', { profile: null })
  const own = await h.app.inject({ url: '/api/me/profile', headers: authorization })
  assert.equal(own.statusCode, 200)
  assert.deepEqual(own.json(), { profile: null })
  for (const operation of ['listMyCommunities', 'discoverGlobalProfiles', 'listAccountBlocks']) {
    h.queue(operation, { rows: [], next: null })
    const response = await h.app.inject(requestOptions(cases.find(item => item.operation === operation)))
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { rows: [], next: null })
  }
})

test('child plugin inherits authentication once and keeps its scope isolated from public, health and community siblings', async t => {
  const h = harness(t)
  for (const url of ['/public-sibling', '/health-sibling']) {
    const response = await h.app.inject({ url, headers: { authorization: 'Bearer invalid' } })
    assert.deepEqual(response.json(), { context: false, feature: false })
    assert.equal(response.headers['cache-control'], undefined)
  }
  assert.equal(h.verifications.length, 0)
  const sibling = await h.app.inject({ url: '/community-sibling', headers: authorization })
  assert.deepEqual(sibling.json(), { context: true, feature: false, actor: actorId })
  assert.equal(sibling.headers['cache-control'], 'private, no-store')
  h.queue('readAccountPreferences', taggedFlags)
  assert.equal((await h.app.inject(requestOptions(cases[0]))).statusCode, 200)
  assert.equal(h.verifications.length, 2)
  assert.deepEqual(h.featureHits, ['/api/me/preferences'])
})

test('actual account service SELECT and RETURNING use exactly the approved preference columns', async t => {
  const h = createHttpHarness(t), projection = '"user_is_discoverable", "enable_matchmaking", "allow_direct_messages"'
  h.eligible([flags])
  const read = await h.app.inject({ url: '/api/me/preferences', headers: authorization })
  assert.equal(read.statusCode, 200)
  assert.equal(/^select (.*?) from /.exec(h.queries.at(-1).sql)?.[1], projection)
  assert.deepEqual(h.queries.at(-1).parameters, [actorId])
  h.eligible([flags])
  const saved = await h.app.inject({ method: 'PUT', url: '/api/me/preferences', headers: authorization, payload: flags })
  assert.equal(saved.statusCode, 200)
  assert.equal(/ returning (.*)$/.exec(h.queries.at(-1).sql)?.[1], projection)
})
