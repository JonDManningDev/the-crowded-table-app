import assert from 'node:assert/strict'
import { channel } from 'node:diagnostics_channel'
import { DummyDriver, Kysely, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from 'kysely'
import { buildApi } from '../../src/app.ts'
import { directoryCursors } from '../../src/directory-cursors.ts'

export const actorId = '11111111-1111-4111-8111-111111111111'
export const tenantId = '22222222-2222-4222-8222-222222222222'
export const targetId = '33333333-3333-4333-8333-333333333333'
export const authorization = { authorization: 'Bearer test-actor' }

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  }
  return value
}

// Only object keys and registration order are normalized. Schema arrays, absent
// schemas, full paths, and every generated HEAD registration remain observable.
export function httpContract(registrations, initialConfig) {
  const schemas = {}, routes = []
  for (const route of registrations) {
    const schemaRef = `${route.method === 'HEAD' ? 'GET' : route.method} ${route.path}`
    if (schemaRef in schemas) assert.deepEqual(schemas[schemaRef], route.schema)
    schemas[schemaRef] = route.schema
    routes.push({ method: route.method, path: route.path, schemaRef,
      authentication: route.authentication, bodyLimit: route.bodyLimit,
      declaredResponseStatuses: Object.keys(route.schema?.response ?? {}).map(Number).sort((a, b) => a - b) })
  }
  routes.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : a.method < b.method ? -1 : a.method > b.method ? 1 : 0)
  return canonical({ root: { bodyLimit: initialConfig.bodyLimit, requestIdHeader: initialConfig.requestIdHeader }, schemas, routes })
}

// These are transport doubles, not a SQL/authorization emulator. Each executed
// query consumes one explicitly queued result, including attribution/eligibility
// queries. Unexpected queries stay recorded even if the root HTTP handler catches
// the thrown assertion. Real runtime-role suites own database correctness.
export function createHttpHarness(t) {
  const pending = [], unexpected = [], queries = [], verifications = [], requests = [], registrations = []
  class ScriptedDriver extends DummyDriver {
    async acquireConnection() {
      const connection = await super.acquireConnection()
      return {
        ...connection,
        async executeQuery(query) {
          queries.push(query)
          if (!pending.length) {
            unexpected.push(query.sql)
            throw new Error(`Unexpected test database execution: ${query.sql}`)
          }
          const step = pending.shift()
          if (step instanceof Error) throw step
          return { rows: step }
        },
        async *streamQuery() {
          unexpected.push('streamQuery')
          throw new Error('Unexpected streaming query')
        },
      }
    }
  }
  const db = new Kysely({ dialect: {
    createDriver: () => new ScriptedDriver(), createAdapter: () => new PostgresAdapter(),
    createQueryCompiler: () => new PostgresQueryCompiler(), createIntrospector: db => new PostgresIntrospector(db),
  } })
  const init = channel('fastify.initialization')
  const capture = ({ fastify }) => {
    fastify.addHook('onRoute', function (route) {
      const authentication = this.hasRequestDecorator('authenticatedContext') ? 'required-onRequest'
        : route.onRequest ? 'optional-onRequest'
          : route.url === '/api/community-standings' ? 'optional-handler' : 'none'
      for (const method of Array.isArray(route.method) ? route.method : [route.method]) {
        registrations.push({ method, path: route.url, authentication,
          bodyLimit: route.bodyLimit ?? fastify.initialConfig.bodyLimit,
          schema: structuredClone(route.schema ?? null) })
      }
    })
    fastify.addHook('onRequest', async request => { requests.push({ id: request.id, url: request.url }) })
  }
  let app
  init.subscribe(capture)
  try {
    app = buildApi({ db, verify: async header => {
      verifications.push(header)
      return header === authorization.authorization ? actorId : null
    }, cursors: directoryCursors('01'.repeat(32)), cleanup: () => db.destroy() })
  } finally { init.unsubscribe(capture) }
  t.after(async () => {
    try { await app.close() } finally {
      assert.deepEqual(unexpected, [], 'HTTP error handling must not swallow unexpected test queries')
      assert.equal(pending.length, 0, 'all scripted query results must be consumed')
    }
  })
  return { app, queries, verifications, requests, registrations,
    queue: (...steps) => pending.push(...steps),
    eligible: (...steps) => pending.push([{ allowed: true }], ...steps),
    contract: () => httpContract(registrations, app.initialConfig) }
}
