import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getAuthenticatedContext } from '../../http-authentication.ts'
import type { UserAccountRoutesOptions } from './types.ts'
import { readAccountPreferencesSchema, saveAccountPreferencesSchema,
  readOwnGlobalProfileSchema, saveGlobalProfileSchema,
  listMyCommunitiesSchema,
  discoverGlobalProfilesSchema, readOtherGlobalProfileSchema,
  listAccountBlocksSchema, blockUserSchema, unblockUserSchema } from './json-schema.ts'

export const preferencesPath = '/api/me/preferences'
const ownProfilePath = '/api/me/profile'
const myCommunitiesPath = '/api/me/communities'

export const userAccountRoutes: FastifyPluginAsyncTypebox<UserAccountRoutesOptions> = async (routes, { service }) => {
  // Account preferences
  routes.get(preferencesPath, { schema: readAccountPreferencesSchema }, async (request, reply) => {
    const result = await service.readAccountPreferences(getAuthenticatedContext(request))
    if (result.status !== 200) return reply.code(result.status).send({ code: 'missing', requestId: request.id })
    return result.row
  })
  routes.put(preferencesPath, { schema: saveAccountPreferencesSchema }, async (request, reply) => {
    const result = await service.saveAccountPreferences(getAuthenticatedContext(request), request.body)
    if (result.status !== 200) return reply.code(result.status).send({ code: 'missing', requestId: request.id })
    return result.row
  })

  // Own profile
  routes.get(ownProfilePath, { schema: readOwnGlobalProfileSchema }, request => service.readOwnGlobalProfile(getAuthenticatedContext(request)))
  routes.put(ownProfilePath, { schema: saveGlobalProfileSchema }, request =>
    service.saveGlobalProfile(getAuthenticatedContext(request), request.body))

  // My communities
  routes.get(myCommunitiesPath, { schema: listMyCommunitiesSchema }, request =>
    service.listMyCommunities(getAuthenticatedContext(request), request.query))

  // Global profiles
  routes.get('/api/profiles', { schema: discoverGlobalProfilesSchema }, request =>
    service.discoverGlobalProfiles(getAuthenticatedContext(request), request.query))
  routes.get('/api/profiles/:userId', { schema: readOtherGlobalProfileSchema }, request =>
    service.readOtherGlobalProfile(getAuthenticatedContext(request), request.params.userId))

  // Account blocks
  routes.get('/api/me/blocks', { schema: listAccountBlocksSchema }, request =>
    service.listAccountBlocks(getAuthenticatedContext(request), request.query))
  routes.put('/api/me/blocks/:userId', { schema: blockUserSchema }, request =>
    service.blockUser(getAuthenticatedContext(request), request.params.userId))
  routes.delete('/api/me/blocks/:userId', { schema: unblockUserSchema }, request =>
    service.unblockUser(getAuthenticatedContext(request), request.params.userId))
}
