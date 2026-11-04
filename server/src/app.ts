import type { DirectoryCursors } from './directory-cursors.ts'
import { publicCommunityRoutes, communityRoutes } from './communities/routes.ts'
import { createCommunityService } from './communities/service.ts'
import { registerAccountHistory } from './communities/history.ts'
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
  const communityService = createCommunityService({db,cursors})
  const userAccountService = createUserAccountService({ db, cursors })
  app.get('/health/live', async () => ({ live: true }))
  app.get('/health/ready', async () => { await checkRuntime(db); return { ready: true } })
  app.register(publicCommunityRoutes, {
    service: {
      listStandings: communityService.listStandings,
      readLanding: communityService.readLanding,
      publicDirectory: communityService.publicDirectory,
    },
    verify,
  })
  app.register(async routes => {
    registerRequiredAuthentication(routes, verify)
    routes.register(communityRoutes, {
      service: {
        createCommunity: communityService.createCommunity,
        executeCommand: communityService.executeCommand,
        ownRequest: communityService.ownRequest,
        reviewAccount: communityService.reviewAccount,
        staffCandidates: communityService.staffCandidates,
        pendingRequests: communityService.pendingRequests,
        readProfile: communityService.readProfile,
        saveOwnProfile: communityService.saveOwnProfile,
        readOwnPreferences: communityService.readOwnPreferences,
        saveOwnPreferences: communityService.saveOwnPreferences,
        readDetails: communityService.readDetails,
        saveDetails: communityService.saveDetails,
        readSettings: communityService.readSettings,
        saveSettings: communityService.saveSettings,
        readCopy: communityService.readCopy,
        saveCopy: communityService.saveCopy,
        deleteCopy: communityService.deleteCopy,
        memberDirectory: communityService.memberDirectory,
        ownerAccounts: communityService.ownerAccounts,
        accountFacts: communityService.accountFacts,
        listStaff: communityService.listStaff,
        readStaff: communityService.readStaff,
        listParticipantPermissions: communityService.listParticipantPermissions,
        readParticipantPermissions: communityService.readParticipantPermissions,
        saveParticipantPermissions: communityService.saveParticipantPermissions,
      },
    })

    registerAccountHistory(routes, db)

    routes.register(userAccountRoutes, { service: userAccountService })

  })
  return app
}
