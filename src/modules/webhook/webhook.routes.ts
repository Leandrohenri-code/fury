import type { FastifyInstance } from 'fastify'
import { handleViolation } from './webhook.controller'

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhook/violation', handleViolation)
}
