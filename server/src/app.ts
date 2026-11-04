import { directoryCursors } from './communities/directory-cursor.ts'
import { registerCommunityDirectory, registerPublicDirectory } from './communities/directory.ts'
import { CommunityError } from './communities/commands.ts'
import { registerCommunityCommands } from './communities/routes.ts'
import { registerAccountRecords } from './communities/records.ts'
import { registerAccountHistory } from './communities/history.ts'
import { registerSelfService } from './accounts/self-service.ts'
import { registerCommunityConfiguration, registerCommunityLanding } from './communities/configuration.ts'
import { registerCommunityProfile } from './communities/profile.ts'
import { registerStandingReference } from './communities/standing.ts'
import { errorResponse } from './http.ts'
import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { preferencesPath, preferencesSchema, type AccountPreferences } from '../../shared/account-preferences.ts'
import { accountPreferences } from './accounts/preferences.ts'
import { checkRuntime, type AppDatabase } from './database.ts'

export function buildApi(db: AppDatabase, verify: (header?: string) => Promise<string | null>, directoryCursorKey: string) {
  const cursors = directoryCursors(directoryCursorKey)
  const app = Fastify({ bodyLimit: 8192, requestIdHeader: false, genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } })
  app.addHook('onClose', () => db.destroy())
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof CommunityError) return reply.code(error.statusCode).send({ code: error.message, requestId: request.id })
    if (error instanceof Error && 'code' in error && ['23514','22023'].includes(String(error.code))) {
      return reply.code(400).send({ code: error.message === 'invalid_timezone' ? 'invalid_timezone' : 'invalid_details', requestId: request.id })
    }
    const status = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
      && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 503
    if (status === 503) console.error('API request failed', request.id, error instanceof Error && 'code' in error ? error.code : 'internal')
    return reply.code(status).send({ code: status === 503 ? 'unavailable' : 'invalid_request', requestId: request.id })
  })
  app.get('/health/live', async () => ({ live: true }))
  app.get('/health/ready', async () => { await checkRuntime(db); return { ready: true } })
  registerStandingReference(app, db, verify)
  registerPublicDirectory(app, db, verify, cursors)
  registerCommunityLanding(app, db, verify)
  app.register(async routes => {
    routes.decorateRequest('actor', '')
    routes.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'private, no-store')
      const actor = await verify(request.headers.authorization)
      if (!actor) return reply.code(401).send({ code: 'unauthenticated', requestId: request.id })
      request.setDecorator('actor', actor)
    })
    registerCommunityCommands(routes, db)
    registerAccountHistory(routes, db)
    registerAccountRecords(routes, db)
    registerCommunityDirectory(routes, db, cursors)
    registerSelfService(routes, db)
    registerCommunityConfiguration(routes, db)
    registerCommunityProfile(routes, db)
    const querystring = { type: 'object', additionalProperties: false, properties: {} }
    const response = { 200: preferencesSchema, 403: errorResponse, 404: errorResponse }
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
