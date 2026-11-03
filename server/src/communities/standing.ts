import { errorResponse } from '../http.ts'
import type { FastifyInstance } from 'fastify'
import type { AppDatabase } from '../database.ts'

const fields = ['standing', 'enable_standard_chat_visibility', 'enable_standard_activity_visibility',
  'enable_other_profile_visibility', 'enable_own_profile_management', 'enable_standard_participation',
  'enable_standard_dms'] as const

export function registerStandingReference(app: FastifyInstance, db: AppDatabase, verify: (header?: string) => Promise<string | null>) {
  app.get('/api/community-standings', { schema: {
    querystring: { type: 'object', additionalProperties: false, properties: {} },
    response: { 401: errorResponse, 200: { type: 'array', items: { type: 'object', required: fields,
      properties: Object.fromEntries(fields.map(field => [field, { type: field === 'standing' ? 'string' : 'boolean' }])) } } },
  } }, async (request, reply) => {
    if (request.headers.authorization !== undefined && !await verify(request.headers.authorization)) {
      return reply.code(401).send({ code: 'unauthenticated', requestId: request.id })
    }
    return db.selectFrom('community_standing').select(fields).orderBy('standing').execute()
  })
}
