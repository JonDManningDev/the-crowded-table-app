import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { ApplicationError } from '../src/application-errors.ts'
import { actorId, authorization, createHttpHarness, targetId, tenantId } from './helpers/http-harness.mjs'

const baseline = JSON.parse(readFileSync(new URL('./fixtures/http-contract.json', import.meta.url), 'utf8'))
const preferences = { user_is_discoverable: true, enable_matchmaking: false, allow_direct_messages: true }
const createInput = { name: 'Test community', slug: 'test-community', country: 'HN', timezone: 'America/Tegucigalpa',
  region: '', city: '', profile: { displayName: 'Test owner', bio: null } }
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
const community = `/api/communities/${tenantId}`
const landing = { id: tenantId, slug: 'test-community', name: 'Test community', country_code: 'HN',
  state_province: null, city: null, timezone: 'America/Tegucigalpa', auto_approve_users: false,
  allow_public_chat_visibility: false, allow_public_activity_visibility: false,
  allow_public_directory_visibility: false, overrides: [] }

function concrete(path) {
  return path.replace(/:(\w+)/g, (_, key) => key === 'slug' ? 'test-community'
    : key === 'tenantId' ? tenantId : key === 'contentKey' ? 'test-copy' : targetId)
}

function errorResponse(h, response, status, code, cache = 'private, no-store', head = false) {
  assert.equal(response.statusCode, status)
  assert.equal(response.headers['cache-control'], cache ?? undefined)
  const requestId = h.requests.at(-1).id
  assert.match(requestId, uuid)
  if (head) assert.equal(response.body, '')
  else assert.deepEqual(response.json(), { code, requestId })
}

test('registration contract: 41 operations, 28 automatic HEADs, complete schemas and effective limits', async t => {
  const h = createHttpHarness(t)
  await h.app.ready()
  const actual = h.contract()
  assert.deepEqual(actual, baseline)
  assert.equal(actual.routes.length, 69)
  assert.equal(new Set(actual.routes.map(r => `${r.method} ${r.path}`)).size, 69)
  assert.deepEqual(actual.routes.reduce((counts, r) => ({ ...counts, [r.method]: (counts[r.method] ?? 0) + 1 }), {}),
    { GET: 28, HEAD: 28, POST: 2, PATCH: 5, PUT: 4, DELETE: 2 })
  assert.equal(Object.keys(actual.schemas).length, 41)
  assert.deepEqual(actual.root, { bodyLimit: 8192, requestIdHeader: false })
  assert.deepEqual(Object.entries(actual.schemas).filter(([, schema]) => schema === null).map(([key]) => key),
    ['GET /health/live', 'GET /health/ready'])
  for (const route of actual.routes.filter(r => r.method === 'GET')) {
    assert.deepEqual(actual.routes.find(r => r.path === route.path && r.method === 'HEAD'), { ...route, method: 'HEAD' })
  }
  assert.deepEqual(actual.routes.filter(r => r.bodyLimit !== 8192).map(r => [r.method, r.path, r.bodyLimit]), [
    ['POST', '/api/communities', 32768], ['POST', '/api/communities/:tenantId/commands', 32768],
  ])
})

test('every protected operation and generated HEAD rejects absent/invalid identity before database execution', async t => {
  const h = createHttpHarness(t)
  const protectedRoutes = baseline.routes.filter(r => r.authentication === 'required-onRequest')
  assert.equal(protectedRoutes.length, 59)
  for (const route of protectedRoutes) {
    for (const token of [undefined, 'Bearer invalid']) {
      const before = h.verifications.length
      const response = await h.app.inject({ method: route.method, url: concrete(route.path),
        headers: token ? { authorization: token } : {} })
      errorResponse(h, response, 401, 'unauthenticated', 'private, no-store', route.method === 'HEAD')
      assert.deepEqual(h.verifications.slice(before), [token], `${route.method} ${route.path}`)
    }
  }
  assert.equal(h.queries.length, 0)
})

test('public, protected and health scopes retain isolated authentication and cache behavior', async t => {
  const h = createHttpHarness(t)
  for (const method of ['GET', 'HEAD']) {
    for (const headers of [{}, { authorization: 'Bearer invalid' }]) {
      const before = h.verifications.length
      const live = await h.app.inject({ method, url: '/health/live', headers })
      assert.equal(live.statusCode, 200)
      assert.equal(live.headers['cache-control'], undefined)
      assert.equal(live.body, method === 'HEAD' ? '' : '{"live":true}')
      h.queue([{ ready: true }])
      const ready = await h.app.inject({ method, url: '/health/ready', headers })
      assert.equal(ready.statusCode, 200)
      assert.equal(ready.headers['cache-control'], undefined)
      assert.equal(ready.body, method === 'HEAD' ? '' : '{"ready":true}')
      assert.equal(h.verifications.length, before, 'health does not verify supplied credentials')
    }
    for (const headers of [{}, authorization]) {
      const before = h.verifications.length
      h.queue([{ ...landing, internal_secret: 'omit' }])
      const publicLanding = await h.app.inject({ method, url: '/api/public/communities/test-community', headers })
      assert.equal(publicLanding.statusCode, 200)
      assert.equal(publicLanding.headers['cache-control'], 'no-store')
      if (method === 'HEAD') assert.equal(publicLanding.body, '')
      else assert.deepEqual(publicLanding.json(), landing)
      h.queue([{ rows: [{ user_id: targetId, display_name: 'Test member', staff_role: null }] }])
      const directory = await h.app.inject({ method, url: '/api/public/communities/test-community/directory', headers })
      assert.equal(directory.statusCode, 200)
      assert.equal(directory.headers['cache-control'], 'no-store')
      if (method === 'HEAD') assert.equal(directory.body, '')
      else assert.deepEqual(directory.json(), { rows: [{ display_name: 'Test member', staff_role: null }], next: null })
      h.queue([])
      const standing = await h.app.inject({ method, url: '/api/community-standings', headers })
      assert.equal(standing.statusCode, 200)
      assert.equal(standing.headers['cache-control'], undefined)
      assert.equal(standing.body, method === 'HEAD' ? '' : '[]')
      assert.equal(h.verifications.length - before, headers.authorization ? 3 : 0)
    }
    for (const url of ['/api/public/communities/test-community', '/api/public/communities/test-community/directory', '/api/community-standings']) {
      const response = await h.app.inject({ method, url, headers: { authorization: 'Bearer invalid' } })
      errorResponse(h, response, 401, 'unauthenticated', url.includes('/public/') ? 'no-store' : null, method === 'HEAD')
    }
    errorResponse(h, await h.app.inject({ method, url: '/api/me/preferences' }), 401, 'unauthenticated', 'private, no-store', method === 'HEAD')
  }
})

test('validation precedence preserves standing verification inside its handler', async t => {
  const h = createHttpHarness(t)
  for (const method of ['GET', 'HEAD']) {
    const before = h.verifications.length
    errorResponse(h, await h.app.inject({ method, url: '/api/community-standings?extra=1',
      headers: { authorization: 'Bearer invalid' } }), 400, 'invalid_request', null, method === 'HEAD')
    assert.equal(h.verifications.length, before, 'invalid standing query never reaches optional verification')
    for (const url of ['/api/public/communities/x?extra=1', '/api/public/communities/x/directory?extra=1',
      '/api/communities/not-a-uuid/accounts/not-a-uuid/profile?extra=1']) {
      const cache = url.includes('/public/') ? 'no-store' : 'private, no-store'
      errorResponse(h, await h.app.inject({ method, url, headers: { authorization: 'Bearer invalid' } }),
        401, 'unauthenticated', cache, method === 'HEAD')
      errorResponse(h, await h.app.inject({ method, url, headers: authorization }),
        400, 'invalid_request', cache, method === 'HEAD')
    }
  }
  assert.equal(h.queries.length, 0)
})

test('strict AJV behavior rejects extra fields, coercion and missing values; no new header validation', async t => {
  const h = createHttpHarness(t)
  for (const payload of [{ ...preferences, user_id: targetId }, { ...preferences, allow_direct_messages: 'true' },
    { user_is_discoverable: true, enable_matchmaking: true }]) {
    errorResponse(h, await h.app.inject({ method: 'PUT', url: '/api/me/preferences', headers: authorization, payload }), 400, 'invalid_request')
  }
  errorResponse(h, await h.app.inject({ url: '/api/me/preferences?extra=1', headers: authorization }), 400, 'invalid_request')
  assert.equal(h.queries.length, 0)
  h.eligible([preferences])
  const response = await h.app.inject({ method: 'PUT', url: '/api/me/preferences',
    headers: { ...authorization, 'x-unrecognized-header': 'allowed' }, payload: preferences })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), preferences)
})

test('AJV leaves omitted default-bearing fields absent and preserves explicitly supplied values', async t => {
  const h = createHttpHarness(t)
  h.app.get('/test-only/defaults', { schema: { querystring: {
    type: 'object', additionalProperties: false,
    properties: { value: { type: 'string', default: 'generated' } },
  } } }, async request => request.query)
  const omitted = await h.app.inject('/test-only/defaults')
  assert.equal(omitted.statusCode, 200)
  assert.deepEqual(omitted.json(), {})
  const supplied = await h.app.inject('/test-only/defaults?value=supplied')
  assert.equal(supplied.statusCode, 200)
  assert.deepEqual(supplied.json(), { value: 'supplied' })
  assert.deepEqual(h.queries, [])
})

test('malformed JSON and byte limits preserve authentication precedence and command overrides', async t => {
  const h = createHttpHarness(t)
  const headers = { ...authorization, 'content-type': 'application/json' }
  const body = JSON.stringify(preferences)
  errorResponse(h, await h.app.inject({ method: 'PUT', url: '/api/me/preferences', headers, payload: '{' }), 400, 'invalid_request')
  errorResponse(h, await h.app.inject({ method: 'PUT', url: '/api/me/preferences',
    headers: { 'content-type': 'application/json' }, payload: '{' }), 401, 'unauthenticated')
  errorResponse(h, await h.app.inject({ method: 'PUT', url: '/api/me/preferences',
    headers: { ...authorization, 'content-type': 'application/octet-stream' }, payload: 'not JSON' }), 415, 'invalid_request')
  h.eligible([preferences])
  assert.equal((await h.app.inject({ method: 'PUT', url: '/api/me/preferences', headers,
    payload: body.padEnd(8192, ' ') })).statusCode, 200)
  errorResponse(h, await h.app.inject({ method: 'PUT', url: '/api/me/preferences', headers,
    payload: body.padEnd(8193, ' ') }), 413, 'invalid_request')
  errorResponse(h, await h.app.inject({ method: 'PUT', url: '/api/me/preferences', headers: { 'content-type': 'application/json' },
    payload: body.padEnd(8193, ' ') }), 401, 'unauthenticated')
  h.eligible(...Array.from({ length: 10 }, () => []))
  const created = await h.app.inject({ method: 'POST', url: '/api/communities', headers,
    payload: JSON.stringify(createInput).padEnd(32768, ' ') })
  assert.equal(created.statusCode, 201)
  assert.deepEqual(Object.keys(created.json()).sort(), ['outcome', 'tenantId'])
  assert.equal(created.json().outcome, 'created')
  assert.match(created.json().tenantId, uuid)
  h.eligible([], [{ operational_status: 'active' }], [{ role: 'owner', status: 'active' }])
  const noOp = await h.app.inject({ method: 'POST', url: `${community}/commands`, headers,
    payload: JSON.stringify({ kind: 'archive', archived: false }).padEnd(32768, ' ') })
  assert.equal(noOp.statusCode, 200)
  assert.deepEqual(noOp.json(), { outcome: 'already_applied', tenantId })
  for (const url of ['/api/communities', `${community}/commands`]) {
    errorResponse(h, await h.app.inject({ method: 'POST', url, headers,
      payload: '{}'.padEnd(32769, ' ') }), 413, 'invalid_request')
  }
})

test('preferences serialize their fixed projection and bind trusted actor/request attribution', async t => {
  const h = createHttpHarness(t)
  for (const method of ['GET', 'PUT', 'HEAD']) {
    h.eligible([{ ...preferences, internal_secret: 'omit' }])
    const start = h.queries.length
    const response = await h.app.inject({ method, url: '/api/me/preferences',
      headers: { ...authorization, 'x-request-id': 'caller-controlled' }, ...(method === 'PUT' && { payload: preferences }) })
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['cache-control'], 'private, no-store')
    if (method === 'HEAD') assert.equal(response.body, '')
    else assert.deepEqual(response.json(), preferences)
    assert.deepEqual(h.queries[start].parameters, [actorId, h.requests.at(-1).id])
    assert.notEqual(h.requests.at(-1).id, 'caller-controlled')
  }
  assert.equal(new Set(h.requests.map(r => r.id)).size, 3)
})

test('preferences retain distinct ineligible and missing outcomes', async t => {
  const h = createHttpHarness(t)
  for (const method of ['GET', 'PUT', 'HEAD']) {
    const options = { method, url: '/api/me/preferences', headers: authorization, ...(method === 'PUT' && { payload: preferences }) }
    h.queue([], [{ allowed: false }])
    errorResponse(h, await h.app.inject(options), 403, 'ineligible', 'private, no-store', method === 'HEAD')
    h.eligible([])
    errorResponse(h, await h.app.inject(options), 404, 'missing', 'private, no-store', method === 'HEAD')
  }
})

test('own profile and request preserve null versus missing; review retains unavailable codes', async t => {
  const h = createHttpHarness(t)
  h.eligible([])
  const noProfile = await h.app.inject({ url: '/api/me/profile', headers: authorization })
  assert.equal(noProfile.statusCode, 200)
  assert.deepEqual(noProfile.json(), { profile: null })
  h.eligible([], [{ request: null }])
  const noRequest = await h.app.inject({ url: `${community}/me/request`, headers: authorization })
  assert.equal(noRequest.statusCode, 200)
  assert.deepEqual(noRequest.json(), { request: null })
  const request = { request_id: targetId, kind: 'join', requested_at: '2026-11-04T00:00:00.000Z' }
  h.eligible([], [{ request: { ...request, internal_secret: 'omit' } }])
  const pending = await h.app.inject({ url: `${community}/me/request`, headers: authorization })
  assert.equal(pending.statusCode, 200)
  assert.deepEqual(pending.json(), { request })
  h.eligible([], [])
  errorResponse(h, await h.app.inject({ url: `${community}/me/request`, headers: authorization }), 404, 'missing')
  h.eligible([], [])
  errorResponse(h, await h.app.inject({ url: `${community}/accounts/${targetId}/review`, headers: authorization }), 404, 'unavailable')
  h.queue([], [{ allowed: false }])
  errorResponse(h, await h.app.inject({ url: `${community}/accounts/${targetId}/review`, headers: authorization }), 403, 'unavailable')
})

test('unauthorized history stays a successful empty page; authorized detail fields remain open', async t => {
  const h = createHttpHarness(t)
  for (const steps of [[[], []], [[], [{ operational_status: 'active' }], []],
    [[], [{ operational_status: 'active' }], [{ role: 'admin', can_audit_community_accounts: false, can_audit_staff_accounts: false }]]]) {
    h.eligible(...steps)
    const response = await h.app.inject({ url: `${community}/history`, headers: authorization })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { rows: [], next: null })
  }
  const entry = { id: targetId, tenant_id: tenantId, action: 'community_approved', target_user_id: null,
    content_key: null, created_at: '2026-11-04T00:00:00.000000Z', created_by: actorId, operation_id: actorId,
    reason: null, details: { future_field: { retained: true } }, categories: ['community_account'] }
  h.eligible([], [{ operational_status: 'active' }], [{ role: 'owner' }], [{ ...entry, internal_secret: 'omit' }])
  const response = await h.app.inject({ url: `${community}/history`, headers: authorization })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { rows: [entry], next: null })
})

test('public missing landing/directory map to 404 while a visible empty directory is 200', async t => {
  const h = createHttpHarness(t)
  h.queue([])
  errorResponse(h, await h.app.inject({ url: '/api/public/communities/test-community' }), 404, 'missing', 'no-store')
  h.queue([{ rows: null }])
  errorResponse(h, await h.app.inject({ url: '/api/public/communities/test-community/directory' }), 404, 'missing', 'no-store')
  h.queue([{ rows: [] }])
  const response = await h.app.inject({ url: '/api/public/communities/test-community/directory' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { rows: [], next: null })
})

test('root error translation preserves application, PostgreSQL, 4xx and unexpected outcomes and safe logging', async t => {
  const h = createHttpHarness(t)
  const logs = []
  t.mock.method(console, 'error', (...args) => logs.push(args))
  const cases = [
    ...[[400, 'invalid_command'], [403, 'forbidden'], [404, 'missing'], [409, 'stale_state']]
      .map(([status, code]) => [new ApplicationError(status, code), status, code]),
    ...['23514', '22023'].flatMap(code => [
      [Object.assign(new Error('invalid_timezone'), { code }), 400, 'invalid_timezone'],
      [Object.assign(new Error('private database detail'), { code }), 400, 'invalid_details'],
    ]),
    [Object.assign(new Error('private rate detail'), { statusCode: 429 }), 429, 'invalid_request'],
    [Object.assign(new Error('private server detail'), { statusCode: 500, code: 'XX000' }), 503, 'unavailable'],
    [new Error('private unexpected detail'), 503, 'unavailable'],
  ]
  for (const [error, status, code] of cases) {
    h.queue(error)
    const before = logs.length
    errorResponse(h, await h.app.inject({ url: '/api/me/preferences', headers: authorization }), status, code)
    assert.equal(logs.length - before, status === 503 ? 1 : 0)
    if (status === 503) assert.deepEqual(logs.at(-1), ['API request failed', h.requests.at(-1).id, error.code ?? 'internal'])
  }
  h.eligible([], Object.assign(new Error('private uniqueness detail'), { code: '23505' }))
  errorResponse(h, await h.app.inject({ method: 'POST', url: '/api/communities', headers: authorization, payload: createInput }), 409, 'handle_taken')
  assert.equal(logs.length, 2)
  assert.equal(new Set(h.requests.map(r => r.id)).size, cases.length + 1)
})

test('readiness failure stays outside authentication and uses root unavailable translation', async t => {
  const h = createHttpHarness(t)
  const logs = []
  t.mock.method(console, 'error', (...args) => logs.push(args))
  h.queue([{ ready: false }])
  errorResponse(h, await h.app.inject({ url: '/health/ready', headers: { authorization: 'Bearer invalid' } }), 503, 'unavailable', null)
  assert.equal(h.verifications.length, 0)
  assert.deepEqual(logs, [['API request failed', h.requests.at(-1).id, 'internal']])
})

test('root not-found keeps Fastify default JSON and does not acquire protected hooks', async t => {
  const h = createHttpHarness(t)
  for (const method of ['GET', 'HEAD']) {
    for (const url of ['/unknown', '/api/me/not-a-route']) {
      const response = await h.app.inject({ method, url, headers: { authorization: 'Bearer invalid' } })
      assert.equal(response.statusCode, 404)
      assert.equal(response.headers['cache-control'], undefined)
      // Injection exposes Fastify's default not-found payload even for HEAD.
      // This is distinct from the 28 registered automatic HEAD operations.
      assert.deepEqual(response.json(), { message: `Route ${method}:${url} not found`, error: 'Not Found', statusCode: 404 })
    }
  }
  assert.equal(h.verifications.length, 0)
  assert.equal(h.queries.length, 0)
})
