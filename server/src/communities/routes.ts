import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import type { PublicCommunityOperations, ProtectedCommunityOperations } from './types.ts'
import * as schemas from './json-schema.ts'
import { optionalAuthentication, verifyOptionalIdentity, getAuthenticatedContext } from '../http-authentication.ts'
import type { BearerVerifier } from '../token-verifier.ts'
import { ApplicationError } from '../http-errors.ts'

export const publicCommunityRoutes: FastifyPluginAsyncTypebox<{ service: PublicCommunityOperations; verify: BearerVerifier }> = async (routes, { service, verify }) => {
  // Public access and standing
  routes.get("/api/community-standings", { schema: schemas.listStandingsSchema }, async (request, reply) => {
    if (!await verifyOptionalIdentity(request, reply, verify)) return reply
    return service.listStandings()
  })
  routes.get("/api/public/communities/:slug", { onRequest: optionalAuthentication(verify), schema: schemas.readLandingSchema }, async (request, reply) => {
    const row = await service.readLanding(request.params)
    return row ?? reply.code(404).send({ code: 'missing', requestId: request.id })
  })
  routes.get("/api/public/communities/:slug/directory", { onRequest: optionalAuthentication(verify), schema: schemas.publicDirectorySchema }, request => service.publicDirectory(request.params, request.query))
}

export const communityRoutes: FastifyPluginAsyncTypebox<{ service: ProtectedCommunityOperations }> = async (routes, { service }) => {
  // Creation and lifecycle
  routes.post("/api/communities", { bodyLimit: 32768, schema: schemas.createCommunitySchema }, async (request, reply) => {
    let result
    try {
      result = await service.createCommunity(getAuthenticatedContext(request), request.body)
    } catch (e) {
      if (e instanceof Error && 'code' in e && e.code === '23505') throw new ApplicationError(409, 'handle_taken')
      throw e
    }
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    return reply.code(201).send(result.value)
  })
  routes.post("/api/communities/:tenantId/commands", { bodyLimit: 32768, schema: schemas.executeCommandSchema }, async (request, reply) => {
    const result = await service.executeCommand(getAuthenticatedContext(request), request.params, request.body)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    return result.value
  })

  // Requests and reviews
  routes.get("/api/communities/:tenantId/me/request", { schema: schemas.ownRequestSchema }, async (request, reply) => {
    const result = await service.ownRequest(getAuthenticatedContext(request), request.params)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    if ('status' in result.value) return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
    return result.value
  })
  routes.get("/api/communities/:tenantId/accounts/:target/review", { schema: schemas.reviewAccountSchema }, async (request, reply) => {
    const result = await service.reviewAccount(getAuthenticatedContext(request), request.params)
    if (!result.eligible) return reply.code(403).send({ code: 'unavailable', requestId: request.id })
    if (result.value.status !== undefined) return reply.code(result.value.status).send({ code: 'unavailable', requestId: request.id })
    return result.value.row
  })
  routes.get("/api/communities/:tenantId/staff-candidates", { schema: schemas.staffCandidatesSchema }, async (request, reply) => {
    const result = await service.staffCandidates(getAuthenticatedContext(request), request.params, request.query)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    return result.value
  })
  routes.get("/api/communities/:tenantId/requests", { schema: schemas.pendingRequestsSchema }, async (request, reply) => {
    const result = await service.pendingRequests(getAuthenticatedContext(request), request.params, request.query)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    return result.value
  })

  // Profiles and preferences
  routes.get("/api/communities/:tenantId/accounts/:userId/profile", { schema: schemas.readProfileSchema }, async (request, reply) => {
    const result = await service.readProfile(getAuthenticatedContext(request), request.params)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    if (result.value.status === 200) return result.value.profile
    return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
  })
  routes.patch("/api/communities/:tenantId/me/profile", { schema: schemas.saveOwnProfileSchema }, request => service.saveOwnProfile(getAuthenticatedContext(request), request.params, request.body))
  routes.get("/api/communities/:tenantId/me/preferences", { schema: schemas.readOwnPreferencesSchema }, request => service.readOwnPreferences(getAuthenticatedContext(request), request.params))
  routes.patch("/api/communities/:tenantId/me/preferences", { schema: schemas.saveOwnPreferencesSchema }, request => service.saveOwnPreferences(getAuthenticatedContext(request), request.params, request.body))

  // Configuration and copy
  routes.get("/api/communities/:tenantId/details", { schema: schemas.readDetailsSchema }, request => service.readDetails(getAuthenticatedContext(request), request.params))
  routes.patch("/api/communities/:tenantId/details", { schema: schemas.saveDetailsSchema }, request => service.saveDetails(getAuthenticatedContext(request), request.params, request.body))
  routes.get("/api/communities/:tenantId/settings", { schema: schemas.readSettingsSchema }, request => service.readSettings(getAuthenticatedContext(request), request.params))
  routes.patch("/api/communities/:tenantId/settings", { schema: schemas.saveSettingsSchema }, request => service.saveSettings(getAuthenticatedContext(request), request.params, request.body))
  routes.get("/api/communities/:tenantId/copy", { schema: schemas.readCopySchema }, request => service.readCopy(getAuthenticatedContext(request), request.params))
  routes.put("/api/communities/:tenantId/copy/:contentKey", { schema: schemas.saveCopySchema }, request => service.saveCopy(getAuthenticatedContext(request), request.params, request.body))
  routes.delete("/api/communities/:tenantId/copy/:contentKey", { schema: schemas.deleteCopySchema }, request => service.deleteCopy(getAuthenticatedContext(request), request.params))

  // Directories and account facts
  routes.get("/api/communities/:tenantId/directory", { schema: schemas.memberDirectorySchema }, request => service.memberDirectory(getAuthenticatedContext(request), request.params, request.query))
  routes.get("/api/communities/:tenantId/accounts", { schema: schemas.ownerAccountsSchema }, request => service.ownerAccounts(getAuthenticatedContext(request), request.params, request.query))
  routes.get("/api/communities/:tenantId/accounts/:userId", { schema: schemas.accountFactsSchema }, request => service.accountFacts(getAuthenticatedContext(request), request.params))

  // Staff and participant permissions
  routes.get("/api/communities/:tenantId/staff", { schema: schemas.listStaffSchema }, request => service.listStaff(getAuthenticatedContext(request), request.params, request.query))
  routes.get("/api/communities/:tenantId/staff/:userId", { schema: schemas.readStaffSchema }, request => service.readStaff(getAuthenticatedContext(request), request.params))
  routes.get("/api/communities/:tenantId/participant-permissions", { schema: schemas.listParticipantPermissionsSchema }, request => service.listParticipantPermissions(getAuthenticatedContext(request), request.params, request.query))
  routes.get("/api/communities/:tenantId/accounts/:userId/permissions", { schema: schemas.readParticipantPermissionsSchema }, request => service.readParticipantPermissions(getAuthenticatedContext(request), request.params))
  routes.patch("/api/communities/:tenantId/accounts/:userId/permissions", { schema: schemas.saveParticipantPermissionsSchema }, request => service.saveParticipantPermissions(getAuthenticatedContext(request), request.params, request.body))

  // Audit history
  routes.get("/api/communities/:tenantId/history", { schema: schemas.historySchema }, async (request, reply) => {
    const result = await service.history(getAuthenticatedContext(request), request.params, request.query)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    return result.value
  })
}
