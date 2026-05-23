import type { FastifyInstance } from 'fastify'
import { getJobStatus } from './jobs.controller'

export async function jobsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/jobs/:id', getJobStatus)
}
