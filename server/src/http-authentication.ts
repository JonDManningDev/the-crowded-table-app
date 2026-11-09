import type { FastifyInstance, FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify'
import type { AuthenticatedContext } from './database.ts'
import type { BearerVerifier } from './token-verifier.ts'

export function registerRequiredAuthentication(app: FastifyInstance, verify: BearerVerifier) {
  app.decorateRequest('authenticatedContext', null)
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')
    const actorId = await verify(request.headers.authorization)
    if (!actorId) return reply.code(401).send({ code: 'unauthenticated', requestId: request.id })
    request.setDecorator<AuthenticatedContext>('authenticatedContext', { actorId, requestId: request.id })
  })
}

export function getAuthenticatedContext(request: FastifyRequest): AuthenticatedContext {
  const context = request.getDecorator<AuthenticatedContext | null>('authenticatedContext')
  if (!context) throw new Error('Authenticated context is unavailable.')
  return context
}

// Standing calls this after validation and does not acquire a cache directive.
export async function verifyOptionalIdentity(request: FastifyRequest, reply: FastifyReply, verify: BearerVerifier): Promise<boolean> {
  if (request.headers.authorization !== undefined && !await verify(request.headers.authorization)) {
    reply.code(401).send({ code: 'unauthenticated', requestId: request.id })
    return false
  }
  return true
}

export function optionalAuthentication(verify: BearerVerifier): onRequestAsyncHookHandler {
  return async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    if (!await verifyOptionalIdentity(request, reply, verify)) return reply
  }
}
