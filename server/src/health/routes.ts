import type { FastifyPluginAsync } from 'fastify'
import type { HealthService } from './service.ts'
import type { LivenessResponse, ReadinessResponse } from './json-schema.ts'

export const healthRoutes: FastifyPluginAsync<{ service: HealthService }> = async (routes, { service }) => {
  // Liveness
  routes.get<{ Reply: LivenessResponse }>('/health/live', () => service.readLiveness())

  // Readiness
  routes.get<{ Reply: ReadinessResponse }>('/health/ready', () => service.readReadiness())
}
