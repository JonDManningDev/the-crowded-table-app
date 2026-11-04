import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Fastify from 'fastify'
import * as plugins from '../src/communities/routes.ts'
import { registerRequiredAuthentication, getAuthenticatedContext } from '../src/http-authentication.ts'
import { registerHttpErrors } from '../src/http-errors.ts'
import { ApplicationError } from '../src/application-errors.ts'
import { actorId, targetId, tenantId, authorization, createHttpHarness } from './helpers/http-harness.mjs'

const operations = [
  {
    "group": 1,
    "name": "listStandings",
    "method": "GET",
    "path": "/api/community-standings",
    "params": false,
    "query": false,
    "body": false,
    "tagged": false,
    "public": true
  },
  {
    "group": 1,
    "name": "readLanding",
    "method": "GET",
    "path": "/api/public/communities/:slug",
    "params": true,
    "query": false,
    "body": false,
    "tagged": false,
    "public": true
  },
  {
    "group": 1,
    "name": "publicDirectory",
    "method": "GET",
    "path": "/api/public/communities/:slug/directory",
    "params": true,
    "query": true,
    "body": false,
    "tagged": false,
    "public": true
  },
  {
    "group": 2,
    "name": "createCommunity",
    "method": "POST",
    "path": "/api/communities",
    "params": false,
    "query": false,
    "body": true,
    "tagged": true,
    "public": false
  },
  {
    "group": 2,
    "name": "executeCommand",
    "method": "POST",
    "path": "/api/communities/:tenantId/commands",
    "params": true,
    "query": false,
    "body": true,
    "tagged": true,
    "public": false
  },
  {
    "group": 3,
    "name": "ownRequest",
    "method": "GET",
    "path": "/api/communities/:tenantId/me/request",
    "params": true,
    "query": false,
    "body": false,
    "tagged": true,
    "public": false
  },
  {
    "group": 3,
    "name": "reviewAccount",
    "method": "GET",
    "path": "/api/communities/:tenantId/accounts/:target/review",
    "params": true,
    "query": false,
    "body": false,
    "tagged": true,
    "public": false
  },
  {
    "group": 3,
    "name": "staffCandidates",
    "method": "GET",
    "path": "/api/communities/:tenantId/staff-candidates",
    "params": true,
    "query": true,
    "body": false,
    "tagged": true,
    "public": false
  },
  {
    "group": 3,
    "name": "pendingRequests",
    "method": "GET",
    "path": "/api/communities/:tenantId/requests",
    "params": true,
    "query": true,
    "body": false,
    "tagged": true,
    "public": false
  }
];
const baseline = JSON.parse(readFileSync(new URL('./fixtures/http-contract.json', import.meta.url), 'utf8'))
function contract(operation) { return baseline.schemas[`${operation.method} ${operation.path}`] }
function sample(schema, key = '') {
  if ('const' in schema) return schema.const
  if (schema.enum) return schema.enum[0]
  if (schema.oneOf) return sample(schema.oneOf[0], key)
  if (Array.isArray(schema.type) && schema.type.includes('null')) return null
  if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, value]) => [key, sample(value, key)]))
  if (schema.type === 'array') return [sample(schema.items)]
  if (schema.type === 'boolean') return false
  if (schema.format === 'uuid') return key === 'tenantId' || key === 'tenant_id' ? tenantId : targetId
  if (schema.format === 'date-time') return '2026-11-04T00:00:00.000Z'
  if (key === 'slug') return 'test-community'
  if (key === 'country' || key === 'country_code') return 'HN'
  return 'Example'
}
function input(operation, method = operation.method) {
  const schema = contract(operation), params = schema.params ? sample(schema.params) : undefined
  const url = operation.path.replace(/:(\w+)/g, (_, name) => encodeURIComponent(params[name]))
  return { method, url, headers: operation.public ? {} : authorization,
    ...(schema.body && { payload: sample(schema.body) }) }
}
function response(operation) {
  const schemas = contract(operation).response, status = operation.name === 'createCommunity' ? 201 : 200
  return { status, dto: sample(schemas[status]) }
}
function result(operation, dto) {
  if (!operation.tagged) return dto
  if (operation.name === 'reviewAccount') return { eligible: true, value: { row: dto } }
  if (operation.name === 'readProfile') return { eligible: true, value: { status: 200, profile: dto } }
  return { eligible: true, value: dto }
}
function cache(operation) { return operation.public ? operation.name === 'listStandings' ? undefined : 'no-store' : 'private, no-store' }
function harness(t) {
  const pending = [], calls = [], unexpected = [], verified = [], requests = [], registered = [], hits = []
  const all = Object.fromEntries(operations.map(operation => [operation.name, async (...args) => {
    calls.push({ name: operation.name, args })
    const next = pending.shift()
    if (!next || next.name !== operation.name) { unexpected.push(operation.name); throw new Error('Unexpected service operation') }
    if (next.value instanceof Error) throw next.value
    return next.value
  }]))
  const publicOps = Object.fromEntries(operations.filter(operation => operation.public).map(operation => [operation.name, all[operation.name]]))
  const protectedOps = Object.fromEntries(operations.filter(operation => !operation.public).map(operation => [operation.name, all[operation.name]]))
  const verify = async header => { verified.push(header); return header === authorization.authorization ? actorId : null }
  const app = Fastify({ bodyLimit: 8192, requestIdHeader: false, genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } })
  registerHttpErrors(app)
  app.addHook('onRequest', async request => { requests.push({ id: request.id, url: request.url }) })
  app.addHook('onRegister', (instance, options) => {
    if (options.service === publicOps || options.service === protectedOps) {
      instance.decorateRequest('communityAdapterProbe', true)
      instance.addHook('onRequest', async request => { hits.push(request.url) })
    }
  })
  app.addHook('onRoute', function (route) {
    if (this.hasRequestDecorator('communityAdapterProbe')) registered.push(`${route.method} ${route.url}`)
  })
  const scope = request => ({ feature: request.server.hasRequestDecorator('communityAdapterProbe'), identity: request.server.hasRequestDecorator('authenticatedContext') })
  app.get('/health-sibling', scope)
  app.register(plugins.publicCommunityRoutes, { service: publicOps, verify })
  app.register(async parent => {
    registerRequiredAuthentication(parent, verify)
    if (operations.some(operation => !operation.public)) parent.register(plugins.communityRoutes, { service: protectedOps })
    parent.get('/account-sibling', request => ({ ...scope(request), actor: getAuthenticatedContext(request).actorId }))
  })
  t.after(async () => { try { await app.close() } finally { assert.deepEqual(unexpected, []); assert.equal(pending.length, 0) } })
  return { app, calls, verified, requests, registered, hits, queue: (name, value) => pending.push({ name, value }) }
}
function checkCall(h, operation, request) {
  const call = h.calls.at(-1), args = []
  assert.equal(call.name, operation.name)
  if (!operation.public) args.push({ actorId, requestId: h.requests.at(-1).id })
  const schema = contract(operation)
  if (operation.params) args.push(sample(schema.params))
  if (operation.query) args.push({})
  if (operation.body) args.push(request.payload)
  assert.deepEqual(JSON.parse(JSON.stringify(call.args)), args)
}
function error(h, operation, response, status, code, head = false) {
  assert.equal(response.statusCode, status)
  assert.equal(response.headers['cache-control'], cache(operation))
  if (head) assert.equal(response.body, '')
  else assert.deepEqual(response.json(), { code, requestId: h.requests.at(-1).id })
}

test('community plugins register each migrated operation exactly once and dispatch only service inputs', async t => {
  const h = harness(t)
  await h.app.ready()
  const expected = operations.flatMap(operation => [`${operation.method} ${operation.path}`,
    ...(operation.method === 'GET' ? [`HEAD ${operation.path}`] : [])]).sort()
  assert.deepEqual(h.registered.sort(), expected)
  for (const operation of operations) {
    const expected = response(operation), request = input(operation), before = h.verified.length
    const dto = structuredClone(expected.dto)
    if (Array.isArray(dto)) for (const row of dto) row.internal_secret = 'omit'
    else dto.internal_secret = 'omit'
    h.queue(operation.name, result(operation, dto))
    const received = await h.app.inject(request)
    assert.equal(received.statusCode, expected.status, operation.name)
    assert.deepEqual(received.json(), expected.dto, operation.name)
    assert.equal(received.headers['cache-control'], cache(operation))
    assert.equal(h.verified.length - before, operation.public ? 0 : 1)
    checkCall(h, operation, request)
  }
})

test('migrated GET operations retain automatic HEAD dispatch, authentication and empty bodies', async t => {
  const h = harness(t)
  for (const operation of operations.filter(operation => operation.method === 'GET')) {
    const request = input(operation, 'HEAD'), before = h.verified.length
    h.queue(operation.name, result(operation, response(operation).dto))
    const received = await h.app.inject(request)
    assert.equal(received.statusCode, 200)
    assert.equal(received.body, '')
    assert.equal(received.headers['cache-control'], cache(operation))
    assert.equal(h.verified.length - before, operation.public ? 0 : 1)
    checkCall(h, operation, request)
  }
})

test('migrated routes validate before service calls and preserve public/protected authentication precedence', async t => {
  const h = harness(t)
  for (const operation of operations) {
    const request = input(operation), before = h.verified.length
    error(h, operation, await h.app.inject({ ...request, url: request.url + '?forged_identity=1' }), 400, 'invalid_request')
    assert.equal(h.verified.length - before, operation.public ? 0 : 1)
    error(h, operation, await h.app.inject({ ...request, headers: { authorization: 'Bearer invalid' } }), 401, 'unauthenticated')
  }
  const standing = operations.find(operation => operation.name === 'listStandings'), before = h.verified.length
  error(h, standing, await h.app.inject({ url: '/api/community-standings?forged_identity=1', headers: { authorization: 'Bearer invalid' } }), 400, 'invalid_request')
  assert.equal(h.verified.length, before)
  assert.equal(h.calls.length, 0)
})

test('service denials retain operation-specific eligibility, missing and unavailable outcomes', async t => {
  const h = harness(t)
  for (const operation of operations.filter(operation => !operation.public)) {
    h.queue(operation.name, operation.tagged ? { eligible: false } : new ApplicationError(403, 'ineligible'))
    error(h, operation, await h.app.inject(input(operation)), 403, operation.name === 'reviewAccount' ? 'unavailable' : 'ineligible')
  }
  for (const operation of operations.filter(operation => ['ownRequest', 'reviewAccount', 'readProfile'].includes(operation.name))) {
    h.queue(operation.name, { eligible: true, value: { status: 404 } })
    error(h, operation, await h.app.inject(input(operation)), 404, operation.name === 'reviewAccount' ? 'unavailable' : 'missing')
  }
  const landing = operations.find(operation => operation.name === 'readLanding')
  h.queue(landing.name, undefined)
  error(h, landing, await h.app.inject(input(landing)), 404, 'missing')
  const directory = operations.find(operation => operation.name === 'publicDirectory')
  h.queue(directory.name, new ApplicationError(404, 'missing'))
  error(h, directory, await h.app.inject(input(directory)), 404, 'missing')
  const creation = operations.find(operation => operation.name === 'createCommunity')
  if (creation) {
    h.queue(creation.name, Object.assign(new Error('private constraint detail'), { code: '23505' }))
    error(h, creation, await h.app.inject(input(creation)), 409, 'handle_taken')
  }
  const history = operations.find(operation => operation.name === 'history')
  if (history) {
    h.queue(history.name, { eligible: true, value: { rows: [], next: null } })
    const received = await h.app.inject(input(history))
    assert.equal(received.statusCode, 200)
    assert.deepEqual(received.json(), { rows: [], next: null })
  }
})

test('public and protected community scopes inherit identity correctly without leaking hooks into siblings', async t => {
  const h = harness(t)
  const health = await h.app.inject({ url: '/health-sibling', headers: { authorization: 'Bearer invalid' } })
  assert.deepEqual(health.json(), { feature: false, identity: false })
  assert.equal(h.verified.length, 0)
  const account = await h.app.inject({ url: '/account-sibling', headers: authorization })
  assert.deepEqual(account.json(), { feature: false, identity: true, actor: actorId })
  assert.equal(h.verified.length, 1)
  assert.deepEqual(h.hits, [])
  for (const operation of operations.filter(operation => operation.public)) {
    const before = h.verified.length
    h.queue(operation.name, result(operation, response(operation).dto))
    assert.equal((await h.app.inject({ ...input(operation), headers: authorization })).statusCode, 200)
    assert.equal(h.verified.length - before, 1)
  }
})

test('public service retains its projections, single-query bindings and absence of actor eligibility', async t => {
  const h = createHttpHarness(t)
  h.queue([])
  assert.equal((await h.app.inject('/api/community-standings')).statusCode, 200)
  assert.equal(h.queries.length, 1)
  assert.equal(h.queries[0].sql, 'select "standing", "enable_standard_chat_visibility", "enable_standard_activity_visibility", "enable_other_profile_visibility", "enable_own_profile_management", "enable_standard_participation", "enable_standard_dms" from "community_standing" order by "standing"')
  assert.deepEqual(h.queries[0].parameters, [])
  const landing = operations.find(operation => operation.name === 'readLanding')
  h.queue([response(landing).dto])
  assert.equal((await h.app.inject(input(landing))).statusCode, 200)
  assert.equal(h.queries.length, 2)
  assert.equal(h.queries[1].sql, 'select * from app_private.community_landing($1)')
  assert.deepEqual(h.queries[1].parameters, ['test-community'])
  const directory = operations.find(operation => operation.name === 'publicDirectory')
  h.queue([{ rows: [] }])
  assert.equal((await h.app.inject(input(directory))).statusCode, 200)
  assert.equal(h.queries.length, 3)
  assert.equal(h.queries[2].sql, 'select app_private.public_community_directory($1,$2::uuid,$3) as rows')
  assert.deepEqual(h.queries[2].parameters, ['test-community', null, 50])
})
