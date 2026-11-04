import { registerGlobalProfiles } from './accounts/global-profiles.ts'
import type { DirectoryCursors } from './directory-cursors.ts'
import { registerCommunityDirectory, registerPublicDirectory } from './communities/directory.ts'
import { registerCommunityCommands } from './communities/routes.ts'
import { registerAccountRecords } from './communities/records.ts'
import { registerAccountHistory } from './communities/history.ts'
import { registerSelfService } from './accounts/self-service.ts'
import { registerCommunityConfiguration, registerCommunityLanding } from './communities/configuration.ts'
import { registerCommunityProfile } from './communities/profile.ts'
import { registerStandingReference } from './communities/standing.ts'
import { errorResponse, registerHttpErrors } from './http-errors.ts'
import { getAuthenticatedContext, registerRequiredAuthentication } from './http-authentication.ts'
import type { BearerVerifier } from './token-verifier.ts'
import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { preferencesPath, preferencesSchema, type AccountPreferences } from '../../shared/account-preferences.ts'
import { accountPreferences } from './accounts/preferences.ts'
import { checkRuntime, type AppDatabase } from './database.ts'

export interface BuildApiOptions {
  db: AppDatabase
  verify: BearerVerifier
  cursors: DirectoryCursors
  cleanup: () => Promise<void>
}

export function buildApi({ db, verify, cursors, cleanup }: BuildApiOptions) {
  const app = Fastify({ bodyLimit: 8192, requestIdHeader: false, genReqId: () => randomUUID(),
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } })
  app.addHook('onClose', cleanup)
  registerHttpErrors(app)
  app.get('/health/live', async () => ({ live: true }))
  app.get('/health/ready', async () => { await checkRuntime(db); return { ready: true } })
  registerStandingReference(app, db, verify)
  registerPublicDirectory(app, db, verify, cursors)
  registerCommunityLanding(app, db, verify)
  app.register(async routes => {
    registerRequiredAuthentication(routes, verify)
    registerCommunityCommands(routes, db)
    registerAccountHistory(routes, db)
    registerAccountRecords(routes, db)
    registerCommunityDirectory(routes, db, cursors)
    registerSelfService(routes, db)
    registerGlobalProfiles(routes, db, cursors)
    registerCommunityConfiguration(routes, db)
    registerCommunityProfile(routes, db)
    const querystring = { type: 'object', additionalProperties: false, properties: {} }
    const response = { 200: preferencesSchema, 403: errorResponse, 404: errorResponse }
    routes.get(preferencesPath, { schema: { querystring, response } }, async (request, reply) => {
      const result = await accountPreferences(db, getAuthenticatedContext(request))
      if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
      if (result.value.status !== 200) return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
      return result.value.row
    })
    routes.put<{ Body: AccountPreferences }>(preferencesPath, { schema: { querystring, body: preferencesSchema, response } }, async (request, reply) => {
      const result = await accountPreferences(db, getAuthenticatedContext(request), request.body)
      if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
      if (result.value.status !== 200) return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
      return result.value.row
    })
  })
  return app
}
