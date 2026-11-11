import { IneligibleActorError } from '../src/database.ts'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Fastify from 'fastify'
import * as plugins from '../src/communities/routes.ts'
import { registerRequiredAuthentication, getAuthenticatedContext } from '../src/http-authentication.ts'
import { ApplicationError, registerHttpErrors } from '../src/http-errors.ts'
import { staffFlags } from '../src/communities/types.ts'
import { actorId, targetId, tenantId, authorization, createHttpHarness } from './helpers/http-harness.mjs'

const operations = [
  {"group":1,"name":"listStandings","method":"GET","path":"/api/community-standings","params":false,"query":false,"body":false,"public":true},
  {"group":1,"name":"readLanding","method":"GET","path":"/api/public/communities/:slug","params":true,"query":false,"body":false,"public":true},
  {"group":1,"name":"publicDirectory","method":"GET","path":"/api/public/communities/:slug/directory","params":true,"query":true,"body":false,"public":true},
  {"group":2,"name":"createCommunity","method":"POST","path":"/api/communities","params":false,"query":false,"body":true,"public":false},
  {"group":2,"name":"executeCommand","method":"POST","path":"/api/communities/:tenantId/commands","params":true,"query":false,"body":true,"public":false},
  {"group":3,"name":"ownRequest","method":"GET","path":"/api/communities/:tenantId/me/request","params":true,"query":false,"body":false,"public":false},
  {"group":3,"name":"reviewAccount","method":"GET","path":"/api/communities/:tenantId/accounts/:target/review","params":true,"query":false,"body":false,"public":false},
  {"group":3,"name":"staffCandidates","method":"GET","path":"/api/communities/:tenantId/staff-candidates","params":true,"query":true,"body":false,"public":false},
  {"group":3,"name":"pendingRequests","method":"GET","path":"/api/communities/:tenantId/requests","params":true,"query":true,"body":false,"public":false},
  {"group":4,"name":"readProfile","method":"GET","path":"/api/communities/:tenantId/accounts/:userId/profile","params":true,"query":false,"body":false,"public":false},
  {"group":4,"name":"saveOwnProfile","method":"PATCH","path":"/api/communities/:tenantId/me/profile","params":true,"query":false,"body":true,"public":false},
  {"group":4,"name":"readOwnPreferences","method":"GET","path":"/api/communities/:tenantId/me/preferences","params":true,"query":false,"body":false,"public":false},
  {"group":4,"name":"saveOwnPreferences","method":"PATCH","path":"/api/communities/:tenantId/me/preferences","params":true,"query":false,"body":true,"public":false},
  {"group":5,"name":"readDetails","method":"GET","path":"/api/communities/:tenantId/details","params":true,"query":false,"body":false,"public":false},
  {"group":5,"name":"saveDetails","method":"PATCH","path":"/api/communities/:tenantId/details","params":true,"query":false,"body":true,"public":false},
  {"group":5,"name":"readSettings","method":"GET","path":"/api/communities/:tenantId/settings","params":true,"query":false,"body":false,"public":false},
  {"group":5,"name":"saveSettings","method":"PATCH","path":"/api/communities/:tenantId/settings","params":true,"query":false,"body":true,"public":false},
  {"group":5,"name":"readCopy","method":"GET","path":"/api/communities/:tenantId/copy","params":true,"query":false,"body":false,"public":false},
  {"group":5,"name":"saveCopy","method":"PUT","path":"/api/communities/:tenantId/copy/:contentKey","params":true,"query":false,"body":true,"public":false},
  {"group":5,"name":"deleteCopy","method":"DELETE","path":"/api/communities/:tenantId/copy/:contentKey","params":true,"query":false,"body":false,"public":false},
  {"group":6,"name":"memberDirectory","method":"GET","path":"/api/communities/:tenantId/directory","params":true,"query":true,"body":false,"public":false},
  {"group":6,"name":"ownerAccounts","method":"GET","path":"/api/communities/:tenantId/accounts","params":true,"query":true,"body":false,"public":false},
  {"group":6,"name":"accountFacts","method":"GET","path":"/api/communities/:tenantId/accounts/:userId","params":true,"query":false,"body":false,"public":false},
  {"group":7,"name":"listStaff","method":"GET","path":"/api/communities/:tenantId/staff","params":true,"query":true,"body":false,"public":false},
  {"group":7,"name":"readStaff","method":"GET","path":"/api/communities/:tenantId/staff/:userId","params":true,"query":false,"body":false,"public":false},
  {"group":7,"name":"listParticipantPermissions","method":"GET","path":"/api/communities/:tenantId/participant-permissions","params":true,"query":true,"body":false,"public":false},
  {"group":7,"name":"readParticipantPermissions","method":"GET","path":"/api/communities/:tenantId/accounts/:userId/permissions","params":true,"query":false,"body":false,"public":false},
  {"group":7,"name":"saveParticipantPermissions","method":"PATCH","path":"/api/communities/:tenantId/accounts/:userId/permissions","params":true,"query":false,"body":true,"public":false},
  {"group":8,"name":"history","method":"GET","path":"/api/communities/:tenantId/history","params":true,"query":true,"body":false,"public":false},
];const baseline = JSON.parse(readFileSync(new URL('./fixtures/http-contract.json', import.meta.url), 'utf8'))
function contract(operation) { return baseline.schemas[`${operation.method} ${operation.path}`] }
function sample(schema, key = '') {
  if ('const' in schema) return schema.const
  if (schema.enum) return schema.enum[0]
  if (schema.anyOf) return schema.anyOf.some(branch => branch.type === 'null') ? null : sample(schema.anyOf[0], key)
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
  if (operation.name === 'reviewAccount') return { row: dto }
  if (operation.name === 'readProfile') return { status: 200, profile: dto }
  return dto
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
function checkCall(h, operation, request, query = {}) {
  const call = h.calls.at(-1), args = []
  assert.equal(call.name, operation.name)
  if (!operation.public) args.push({ actorId, requestId: h.requests.at(-1).id })
  const schema = contract(operation)
  if (operation.params) args.push(sample(schema.params))
  if (operation.query) args.push(query)
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
  assert.equal(operations.length, 29)
  assert.equal(operations.filter(operation => operation.public).length, 3)
  assert.equal(operations.filter(operation => !operation.public).length, 26)
  assert.equal(operations.filter(operation => operation.method === 'GET').length, 20)
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
    if (operation.body) {
      error(h, operation, await h.app.inject({ ...request, payload: { ...request.payload, actorId } }), 400, 'invalid_request')
    }
  }
  const standing = operations.find(operation => operation.name === 'listStandings'), before = h.verified.length
  error(h, standing, await h.app.inject({ url: '/api/community-standings?forged_identity=1', headers: { authorization: 'Bearer invalid' } }), 400, 'invalid_request')
  assert.equal(h.verified.length, before)
  assert.equal(h.calls.length, 0)
})

test('service denials retain operation-specific eligibility, missing and unavailable outcomes', async t => {
  const h = harness(t)
  for (const operation of operations.filter(operation => !operation.public)) {
    h.queue(operation.name, new IneligibleActorError())
    error(h, operation, await h.app.inject(input(operation)), 403, operation.name === 'reviewAccount' ? 'unavailable' : 'ineligible')
  }
  for (const operation of operations.filter(operation => ['ownRequest', 'reviewAccount', 'readProfile'].includes(operation.name))) {
    h.queue(operation.name, { status: 404 })
    error(h, operation, await h.app.inject(input(operation)), 404, operation.name === 'reviewAccount' ? 'unavailable' : 'missing')
  }
  for (const operation of operations.filter(operation => !operation.public && !['ownRequest', 'reviewAccount', 'readProfile'].includes(operation.name))) {
    h.queue(operation.name, new ApplicationError(404, 'missing'))
    error(h, operation, await h.app.inject(input(operation)), 404, 'missing')
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
    h.queue(history.name, { rows: [], next: null })
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

test('public service retains projections and anonymous transaction scope without actor eligibility', async t => {
  const h = createHttpHarness(t)
  h.queue([])
  assert.equal((await h.app.inject('/api/community-standings')).statusCode, 200)
  assert.deepEqual(h.queries[0].parameters, [])
  const landing = operations.find(operation => operation.name === 'readLanding')
  h.queue([], [{ id: tenantId }], [], [response(landing).dto])
  assert.equal((await h.app.inject(input(landing))).statusCode, 200)
  const directory = operations.find(operation => operation.name === 'publicDirectory')
  h.queue([], [{ id: tenantId }], [], [{ operational_status: 'active', allow_public_directory_visibility: true }], [])
  assert.equal((await h.app.inject(input(directory))).statusCode, 200)
  assert.ok(h.queries.some(q => q.sql.includes('for share') && q.parameters[0] === 'test-community'))
  assert.ok(h.queries.every(q => !/lock_eligible_actor|request.jwt.claim.sub|ct.operation_id/.test(q.sql)))
})

test('exact profile service projects the same eight columns independently of HTTP schemas', async t => {
  const h = createHttpHarness(t), operation = operations.find(operation => operation.name === 'readProfile')
  h.eligible([], [response(operation).dto])
  assert.equal((await h.app.inject(input(operation))).statusCode, 200)
  assert.equal(/^select (.*?) from /.exec(h.queries.at(-1).sql)?.[1],
    '"p"."tenant_id", "p"."user_id", "p"."display_name", "p"."bio", "p"."created_at", "p"."updated_at", "p"."created_by", "p"."updated_by"')
  assert.deepEqual(h.queries.at(-1).parameters, [actorId, tenantId, targetId, actorId, actorId])
})

test('directory and exact/owner facts retain ordered projections and bound parameters', async t => {
  const h = createHttpHarness(t)
  const facts = ['tenant_id', 'user_id', 'standing', 'first_approved_at', 'has_disciplinary_restriction', 'created_at', 'updated_at', 'created_by', 'updated_by']
  const profile = ['tenant_id', 'user_id', 'display_name', 'bio', 'created_at', 'updated_at', 'created_by', 'updated_by']
  for (const name of ['memberDirectory', 'ownerAccounts', 'accountFacts']) {
    const operation = operations.find(operation => operation.name === name), dto = response(operation).dto
    if (name === 'memberDirectory') h.eligible([], [{ id: tenantId }], [{ operational_status: 'active', standing: 'approved' }], dto.rows)
    else h.eligible([], [{ id: tenantId }], [{ operational_status: 'active', accountId: actorId, standing: 'approved',
      assignmentId: actorId, role: 'owner', status: 'active' }], name === 'accountFacts' ? [dto] : dto.rows)
    assert.equal((await h.app.inject(input(operation))).statusCode, 200)
    const query = h.queries.at(-1)
    if (name === 'memberDirectory') {
      const projections = [...query.sql.matchAll(/jsonb_build_object\((.*?)\)/g)].map(match => match[1])
      assert.deepEqual(projections, [facts.map((key, index) => `$${index + 1}::text, "c"."${key}"`).join(', '),
        profile.map((key, index) => `$${index + 10}::text, "p"."${key}"`).join(', ')])
      assert.deepEqual(query.parameters, [...facts, ...profile, tenantId, null, null, 51])
    } else {
      assert.equal(/^select (.*?) from /.exec(query.sql)?.[1], facts.map(key => `"${key}"`).join(', '))
      assert.deepEqual(query.parameters, name === 'accountFacts' ? [tenantId, targetId, true] : [tenantId, null, null, 51])
    }
  }
})

test('staff and participant services retain distinct projections and read/write denial mappings', async t => {
  const h = createHttpHarness(t)
  const metadata = ['tenant_id', 'user_id', 'created_at', 'updated_at', 'created_by', 'updated_by']
  for (const name of ['listStaff', 'readStaff', 'listParticipantPermissions', 'readParticipantPermissions']) {
    const operation = operations.find(operation => operation.name === name), dto = response(operation).dto
    const list = name.startsWith('list'), staff = name.endsWith('Staff')
    h.eligible([], [{ id: tenantId }], [{ operational_status: 'active', accountId: actorId, standing: 'approved',
      assignmentId: actorId, role: 'owner', status: 'active', can_grant_staff: true, can_manage_community_permissions: true }], list ? dto.rows : [dto])
    assert.equal((await h.app.inject(input(operation))).statusCode, 200)
    const query = h.queries.at(-1), fields = [...metadata, ...(staff ? ['role', 'status', ...staffFlags] : ['can_post_public_events'])]
    assert.equal(/^select (.*?) from /.exec(query.sql)?.[1], fields.map(key => `"${key}"`).join(', '))
    assert.deepEqual(query.parameters, list ? [tenantId, null, null, 51] : [tenantId, targetId])
  }
  for (const [name, status, code] of [['readStaff', 404, 'missing'], ['saveParticipantPermissions', 403, 'forbidden']]) {
    const operation = operations.find(operation => operation.name === name)
    h.eligible([], [{ id: tenantId }], [{ operational_status: 'active', accountId: actorId, standing: 'approved', assignmentId: null }])
    error(h, operation, await h.app.inject(input(operation)), status, code)
  }
})

test('all paged/selective community operations forward validated nonempty query inputs unchanged', async t => {
  const h = harness(t)
  for (const operation of operations.filter(operation => operation.query)) {
    const query = Object.fromEntries(Object.keys(contract(operation).querystring.properties).map(key => [key,
      key === 'limit' ? '2' : key === 'category' ? 'community_account' : ['after', 'target', 'eventId'].includes(key) ? targetId : 'opaque-cursor']))
    const request = input(operation)
    request.url += '?' + new URLSearchParams(query)
    h.queue(operation.name, result(operation, response(operation).dto))
    assert.equal((await h.app.inject(request)).statusCode, 200, operation.name)
    checkCall(h, operation, request, query)
  }
})

test('history keeps open details and empty unauthorized pages; own requests keep null distinct from missing', async t => {
  const h = harness(t), history = operations.find(operation => operation.name === 'history')
  const dto = response(history).dto
  dto.rows[0].details = { future: [{ subject: 'kept', count: 1 }], flag: true, 'line\nbreak': null }
  h.queue(history.name, result(history, dto))
  assert.deepEqual((await h.app.inject(input(history))).json(), dto)
  const own = operations.find(operation => operation.name === 'ownRequest')
  h.queue(own.name, { request: null })
  const ownResponse = await h.app.inject(input(own))
  assert.equal(ownResponse.statusCode, 200)
  assert.deepEqual(ownResponse.json(), { request: null })
  const actual = createHttpHarness(t)
  actual.eligible([], [{ operational_status: 'active' }], [{ operational_status: 'active', accountId: null, assignmentId: null }], [])
  const empty = await actual.app.inject(input(history))
  assert.equal(empty.statusCode, 200)
  assert.deepEqual(empty.json(), { rows: [], next: null })
  assert.equal(actual.queries.length, 6)
})

test('member directory preserves nullable profile and staff role and projects returned profiles', async t => {
  const h = harness(t)
  const operation = operations.find(operation => operation.name === 'memberDirectory')
  const dto = response(operation).dto
  const profile = { tenant_id: tenantId, user_id: targetId, display_name: 'Player', bio: 'Bio',
    created_at: '2026-11-04T00:00:00.000Z', updated_at: '2026-11-04T00:00:00.000Z',
    created_by: actorId, updated_by: null }
  const row = { ...dto.rows[0], profile, staff_role: 'admin' }
  h.queue(operation.name, { rows: [...dto.rows, { ...row, profile: { ...profile, internal_secret: 'omit' } }], next: null })
  const received = await h.app.inject(input(operation))
  assert.equal(received.statusCode, 200)
  assert.deepEqual(received.json(), { rows: [...dto.rows, row], next: null })
})

test('community command tags accept their own fields and reject invalid variants before dispatch', async t => {
  const h = harness(t)
  const operation = operations.find(operation => operation.name === 'executeCommand')
  const request = input(operation)
  const fullPermissions = Object.fromEntries(staffFlags.map(flag => [flag, false]))
  const cases = [
    [{ kind: 'join', profile: { displayName: 'Player', bio: 'b'.repeat(2000) } }, { profile: { displayName: 'Player', bio: 'b'.repeat(2001) } }],
    [{ kind: 'deactivate' }, { requestId: targetId }],
    [{ kind: 'reactivate' }, { profile: { displayName: 'Player', bio: null } }],
    [{ kind: 'withdraw', requestId: targetId }, { requestId: undefined }],
    [{ kind: 'approve', requestId: targetId, revision: actorId }, { revision: undefined }],
    [{ kind: 'suspend', target: targetId, revision: actorId, reason: '' }, { reason: false }],
    [{ kind: 'remove', target: targetId, revision: actorId }, { target: 1 }],
    [{ kind: 'clear', target: targetId, revision: actorId }, { revision: undefined }],
    [{ kind: 'grant', target: targetId }, { permissions: fullPermissions }],
    [{ kind: 'resume', target: targetId }, { target: undefined }],
    [{ kind: 'revoke', target: targetId, reason: 'Reason' }, { reason: null }],
    [{ kind: 'reappoint', target: targetId, permissions: fullPermissions }, { permissions: { can_grant_staff: true } }],
    [{ kind: 'permissions', target: targetId, permissions: { can_grant_staff: false } }, { permissions: {} }],
    [{ kind: 'archive', archived: false }, { archived: 'false' }],
  ]
  for (const [payload, invalid] of cases) {
    const dto = { outcome: 'accepted', tenantId }
    h.queue(operation.name, result(operation, dto))
    const accepted = await h.app.inject({ ...request, payload })
    assert.equal(accepted.statusCode, 200, payload.kind)
    assert.deepEqual(accepted.json(), dto)
    checkCall(h, operation, { ...request, payload })
    error(h, operation, await h.app.inject({ ...request, payload: { ...payload, ...invalid } }), 400, 'invalid_request')
  }
  for (const payload of [
    { kind: 'unknown' },
    { kind: 'join', profile: { displayName: 'Player', bio: null, hidden: true } },
    { kind: 'permissions', target: targetId, permissions: { can_grant_staff: true, unknown: false } },
    { kind: 'permissions', target: targetId, permissions: { can_grant_staff: 'true' } },
  ]) {
    error(h, operation, await h.app.inject({ ...request, payload }), 400, 'invalid_request')
  }
  assert.equal(h.calls.length, cases.length)
})

test('nullable scalars preserve valid values and reject malformed service output', async t => {
  const h = harness(t)
  t.mock.method(console, 'error', () => {})
  const facts = operations.find(operation => operation.name === 'accountFacts')
  const dto = { tenant_id: tenantId, user_id: targetId, standing: 'approved',
    first_approved_at: '2026-11-04T00:00:00.000Z', has_disciplinary_restriction: false,
    created_at: '2026-11-04T00:00:00.000Z', updated_at: '2026-11-04T00:00:00.000Z',
    created_by: actorId, updated_by: null }
  for (const [value, expected] of [[{ ...dto, first_approved_at: new Date(dto.first_approved_at) }, dto],
    [{ ...dto, first_approved_at: null }, { ...dto, first_approved_at: null }]]) {
    h.queue(facts.name, value)
    const received = await h.app.inject(input(facts))
    assert.equal(received.statusCode, 200)
    assert.deepEqual(received.json(), expected)
  }
  for (const invalid of [{ first_approved_at: 'invalid date' }, { created_by: 'invalid UUID' }]) {
    h.queue(facts.name, { ...dto, ...invalid })
    error(h, facts, await h.app.inject(input(facts)), 503, 'unavailable')
  }
  const details = operations.find(operation => operation.name === 'saveDetails')
  const request = { ...input(details), payload: { city: 'c'.repeat(120), state_province: null } }
  const saved = { ...response(details).dto, ...request.payload }
  h.queue(details.name, saved)
  const received = await h.app.inject(request)
  assert.equal(received.statusCode, 200)
  assert.deepEqual(received.json(), saved)
  error(h, details, await h.app.inject({ ...request, payload: { city: 'c'.repeat(121) } }), 400, 'invalid_request')
  h.queue(details.name, { ...saved, city: 'c'.repeat(121) })
  error(h, details, await h.app.inject(request), 503, 'unavailable')
})

test('nullable staff fields preserve valid values, null, and legacy serializer behavior', async t => {
  const h = harness(t)
  for (const name of ['publicDirectory', 'memberDirectory', 'staffCandidates']) {
    const operation = operations.find(operation => operation.name === name)
    const roles = ['owner', 'admin', null, 'unexpected-role']
    const statuses = ['active', 'paused', null, 'unexpected-status']
    const dto = response(operation).dto
    dto.rows = roles.map((staff_role, index) => ({
      ...dto.rows[0],
      staff_role,
      ...(name === 'staffCandidates' && { staff_status: statuses[index] }),
    }))
    h.queue(name, result(operation, dto))
    const received = await h.app.inject(input(operation))
    assert.equal(received.statusCode, 200, name)
    assert.deepEqual(received.json(), dto, name)
  }
})
