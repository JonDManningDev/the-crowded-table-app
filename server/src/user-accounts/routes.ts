import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { preferencesPath } from './account-preferences.ts'
import { myCommunitiesPath, ownProfilePath } from './self-service.ts'
import { getAuthenticatedContext } from '../http-authentication.ts'
import type { UserAccountService } from './service.ts'
import { readAccountPreferencesSchema, saveAccountPreferencesSchema,
  readOwnProfileSchema, saveOwnProfileSchema,
  listMyCommunitiesSchema,
  discoverGlobalProfilesSchema, readGlobalProfileSchema,
  listAccountBlocksSchema, blockAccountSchema, unblockAccountSchema } from './schema.ts'

interface UserAccountRoutesOptions { service: UserAccountService }

export const userAccountRoutes: FastifyPluginAsyncTypebox<UserAccountRoutesOptions> = async (routes, { service }) => {
  // Account preferences
  routes.get(preferencesPath, { schema: readAccountPreferencesSchema }, async (request, reply) => {
    const result = await service.readAccountPreferences(getAuthenticatedContext(request))
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    if (result.value.status !== 200) return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
    return result.value.row
  })
  routes.put(preferencesPath, { schema: saveAccountPreferencesSchema }, async (request, reply) => {
    const result = await service.saveAccountPreferences(getAuthenticatedContext(request), request.body)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    if (result.value.status !== 200) return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
    return result.value.row
  })

  // Own profile
  routes.get(ownProfilePath, { schema: readOwnProfileSchema }, request => service.readOwnProfile(getAuthenticatedContext(request)))
  routes.put(ownProfilePath, { schema: saveOwnProfileSchema }, request =>
    service.saveOwnProfile(getAuthenticatedContext(request), request.body))

  // My communities
  routes.get(myCommunitiesPath, { schema: listMyCommunitiesSchema }, request =>
    service.listMyCommunities(getAuthenticatedContext(request), request.query))

  // Global profiles
  routes.get('/api/profiles', { schema: discoverGlobalProfilesSchema }, request =>
    service.discoverGlobalProfiles(getAuthenticatedContext(request), request.query))
  routes.get('/api/profiles/:userId', { schema: readGlobalProfileSchema }, request =>
    service.readGlobalProfile(getAuthenticatedContext(request), request.params.userId))

  // Account blocks
  routes.get('/api/me/blocks', { schema: listAccountBlocksSchema }, request =>
    service.listAccountBlocks(getAuthenticatedContext(request), request.query))
  routes.put('/api/me/blocks/:userId', { schema: blockAccountSchema }, request =>
    service.blockAccount(getAuthenticatedContext(request), request.params.userId, request.body))
  routes.delete('/api/me/blocks/:userId', { schema: unblockAccountSchema }, request =>
    service.unblockAccount(getAuthenticatedContext(request), request.params.userId))
}
