import type { DirectoryCursors } from './directory-cursors.ts'
import { publicCommunityRoutes, communityRoutes } from './features/communities/routes.ts'
import { createCommunityService } from './features/communities/service.ts'
import { registerHttpErrors } from './http-errors.ts'
import { registerRequiredAuthentication } from './http-authentication.ts'
import type { BearerVerifier } from './token-verifier.ts'
import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'
import { createUserAccountService } from './features/user-accounts/service.ts'
import { userAccountRoutes } from './features/user-accounts/routes.ts'
import { checkRuntime, type AppDatabase } from './database.ts'
import { createHealthService } from './health/service.ts'
import { healthRoutes } from './health/routes.ts'

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
  const communityService = createCommunityService({ db, cursors })
  const userAccountService = createUserAccountService({ db, cursors })
  const healthService = createHealthService({ checkReadiness: () => checkRuntime(db) })
  app.register(healthRoutes, { service: healthService })
  app.register(publicCommunityRoutes, {
    service: {
      getCommunityStandingReference: communityService.getCommunityStandingReference,
      readCommunityLanding: communityService.readCommunityLanding,
      getPublicCommunityDirectory: communityService.getPublicCommunityDirectory,
    },
    verify,
  })
  app.register(async routes => {
    registerRequiredAuthentication(routes, verify)
    routes.register(communityRoutes, {
      service: {
        createCommunity: communityService.createCommunity,
        joinCommunity: communityService.joinCommunity,
        deactivateOwnCommunityAccount: communityService.deactivateOwnCommunityAccount,
        reactivateOwnCommunityAccount: communityService.reactivateOwnCommunityAccount,
        withdrawCommunityEntryRequest: communityService.withdrawCommunityEntryRequest,
        approveCommunityJoinRequest: communityService.approveCommunityJoinRequest,
        suspendCommunityAccount: communityService.suspendCommunityAccount,
        removeUserFromCommunity: communityService.removeUserFromCommunity,
        clearCommunityAccountRestriction: communityService.clearCommunityAccountRestriction,
        grantCommunityStaffAssignment: communityService.grantCommunityStaffAssignment,
        resumeCommunityStaffAssignment: communityService.resumeCommunityStaffAssignment,
        revokeCommunityStaffAssignment: communityService.revokeCommunityStaffAssignment,
        reappointCommunityStaff: communityService.reappointCommunityStaff,
        updateCommunityStaffPermissions: communityService.updateCommunityStaffPermissions,
        archiveCommunity: communityService.archiveCommunity,
        restoreCommunity: communityService.restoreCommunity,
        readOwnCommunityEntryRequest: communityService.readOwnCommunityEntryRequest,
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
        history: communityService.history,
      },
    })

    routes.register(userAccountRoutes, { service: userAccountService })
  })
  return app
}
