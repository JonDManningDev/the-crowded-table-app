import type { FastifyPluginAsync } from 'fastify'
import { preferencesPath } from '../../../shared/account-preferences.ts'
import { myCommunitiesPath, ownProfilePath } from '../../../shared/self-service.ts'
import { getAuthenticatedContext } from '../http-authentication.ts'
import type { UserAccountService } from './service.ts'
import { readAccountPreferencesSchema, saveAccountPreferencesSchema, type SaveAccountPreferencesBody,
  readOwnProfileSchema, saveOwnProfileSchema, type SaveOwnProfileBody,
  listMyCommunitiesSchema, type ListMyCommunitiesQuery,
  discoverGlobalProfilesSchema, readGlobalProfileSchema, type DiscoverGlobalProfilesQuery, type UserIdParams,
  listAccountBlocksSchema, blockAccountSchema, unblockAccountSchema, type ListAccountBlocksQuery, type BlockAccountBody } from './schema.ts'

interface UserAccountRoutesOptions { service: UserAccountService }

export const userAccountRoutes: FastifyPluginAsync<UserAccountRoutesOptions> = async (routes, { service }) => {
  // Account preferences
  routes.get(preferencesPath, { schema: readAccountPreferencesSchema }, async (request, reply) => {
    const result = await service.readAccountPreferences(getAuthenticatedContext(request))
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    if (result.value.status !== 200) return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
    return result.value.row
  })
  routes.put<{ Body: SaveAccountPreferencesBody }>(preferencesPath, { schema: saveAccountPreferencesSchema }, async (request, reply) => {
    const result = await service.saveAccountPreferences(getAuthenticatedContext(request), request.body)
    if (!result.eligible) return reply.code(403).send({ code: 'ineligible', requestId: request.id })
    if (result.value.status !== 200) return reply.code(result.value.status).send({ code: 'missing', requestId: request.id })
    return result.value.row
  })

  // Own profile
  routes.get(ownProfilePath, { schema: readOwnProfileSchema }, request => service.readOwnProfile(getAuthenticatedContext(request)))
  routes.put<{ Body: SaveOwnProfileBody }>(ownProfilePath, { schema: saveOwnProfileSchema }, request =>
    service.saveOwnProfile(getAuthenticatedContext(request), request.body))

  // My communities
  routes.get<{ Querystring: ListMyCommunitiesQuery }>(myCommunitiesPath, { schema: listMyCommunitiesSchema }, request =>
    service.listMyCommunities(getAuthenticatedContext(request), request.query))

  // Global profiles
  routes.get<{ Querystring: DiscoverGlobalProfilesQuery }>('/api/profiles', { schema: discoverGlobalProfilesSchema }, request =>
    service.discoverGlobalProfiles(getAuthenticatedContext(request), request.query))
  routes.get<{ Params: UserIdParams }>('/api/profiles/:userId', { schema: readGlobalProfileSchema }, request =>
    service.readGlobalProfile(getAuthenticatedContext(request), request.params.userId))

  // Account blocks
  routes.get<{ Querystring: ListAccountBlocksQuery }>('/api/me/blocks', { schema: listAccountBlocksSchema }, request =>
    service.listAccountBlocks(getAuthenticatedContext(request), request.query))
  routes.put<{ Params: UserIdParams; Body: BlockAccountBody }>('/api/me/blocks/:userId', { schema: blockAccountSchema }, request =>
    service.blockAccount(getAuthenticatedContext(request), request.params.userId, request.body))
  routes.delete<{ Params: UserIdParams }>('/api/me/blocks/:userId', { schema: unblockAccountSchema }, request =>
    service.unblockAccount(getAuthenticatedContext(request), request.params.userId))
}
