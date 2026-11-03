import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { preferencesPath, preferencesSchema, type AccountPreferences } from '../../shared/account-preferences.ts'
import { accountPreferences } from './accounts/preferences.ts'
import { checkRuntime, type AppDatabase } from './database.ts'

export function buildApi(db: AppDatabase, verify: (header?: string) => Promise<string | null>) {
  const app = Fastify({ bodyLimit: 8192, genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } })
  app.addHook('onClose', () => db.destroy())
  app.setErrorHandler((error, request, reply) => {
    const status = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
      && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 503
    if (status === 503) console.error('API request failed', request.id, error instanceof Error && 'code' in error ? error.code : 'internal')
    return reply.code(status).send({ code: status === 503 ? 'unavailable' : 'invalid_request', requestId: request.id })
  })
  app.get('/health/live', async () => ({ live: true }))
  app.get('/health/ready', async () => { await checkRuntime(db); return { ready: true } })
  app.register(async routes => {
    routes.decorateRequest('actor', '')
    routes.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'private, no-store')
      const actor = await verify(request.headers.authorization)
      if (!actor) return reply.code(401).send({ code: 'unauthenticated', requestId: request.id })
      request.setDecorator('actor', actor)
    })
    const querystring = { type: 'object', additionalProperties: false, properties: {} }
    const failure = { type: 'object', required: ['code', 'requestId'], properties: { code: { type: 'string' }, requestId: { type: 'string' } } }
    const response = { 200: preferencesSchema, 403: failure, 404: failure }
    routes.get(preferencesPath, { schema: { querystring, response } }, async (request, reply) => {
      const result = await accountPreferences(db, request.getDecorator<string>('actor'), request.id)
      if (result.status !== 200) return reply.code(result.status).send({ code: result.status === 403 ? 'ineligible' : 'missing', requestId: request.id })
      return result.row
    })
    routes.put<{ Body: AccountPreferences }>(preferencesPath, { schema: { querystring, body: preferencesSchema, response } }, async (request, reply) => {
      const result = await accountPreferences(db, request.getDecorator<string>('actor'), request.id, request.body)
      if (result.status !== 200) return reply.code(result.status).send({ code: result.status === 403 ? 'ineligible' : 'missing', requestId: request.id })
      return result.row
    })
  })
  return app
}
