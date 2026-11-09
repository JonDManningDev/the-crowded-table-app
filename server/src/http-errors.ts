import type { FastifyInstance } from 'fastify'
import { Type } from 'typebox'
import { ApplicationError } from './application-errors.ts'

export const errorResponse = Type.Object({ code: Type.String(), requestId: Type.String() })

export function registerHttpErrors(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApplicationError) return reply.code(error.statusCode).send({ code: error.message, requestId: request.id })
    if (error instanceof Error && 'code' in error && ['23514','22023'].includes(String(error.code))) {
      return reply.code(400).send({ code: error.message === 'invalid_timezone' ? 'invalid_timezone' : 'invalid_details', requestId: request.id })
    }
    const status = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
      && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 503
    if (status === 503) console.error('API request failed', request.id, error instanceof Error && 'code' in error ? error.code : 'internal')
    return reply.code(status).send({ code: status === 503 ? 'unavailable' : 'invalid_request', requestId: request.id })
  })
}
