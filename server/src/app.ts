import type { DirectoryCursors } from './directory-cursors.ts'
import { registerCommunityDirectory, registerPublicDirectory } from './communities/directory.ts'
import { registerCommunityCommands } from './communities/routes.ts'
import { registerAccountRecords } from './communities/records.ts'
import { registerAccountHistory } from './communities/history.ts'
import { registerCommunitySelfService } from './accounts/self-service.ts'
import { registerCommunityConfiguration, registerCommunityLanding } from './communities/configuration.ts'
import { registerCommunityProfile } from './communities/profile.ts'
import { registerStandingReference } from './communities/standing.ts'
import { registerHttpErrors } from './http-errors.ts'
import { registerRequiredAuthentication } from './http-authentication.ts'
import type { BearerVerifier } from './token-verifier.ts'
import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { createUserAccountService } from './user-accounts/service.ts'
import { userAccountRoutes } from './user-accounts/routes.ts'
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
  const userAccountService = createUserAccountService({ db, cursors })
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
    registerCommunitySelfService(routes, db)
    routes.register(userAccountRoutes, { service: userAccountService })
    registerCommunityConfiguration(routes, db)
    registerCommunityProfile(routes, db)
  })
  return app
}
