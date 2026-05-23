import Fastify from 'fastify'
import { webhookRoutes } from './modules/webhook/webhook.routes'
import { jobsRoutes } from './modules/jobs/jobs.routes'
import { createBullBoardAdapter } from './dashboard/bull-board'
import { logger } from './shared/logger/logger'
import { generateRequestId } from './shared/utils/request-id'

export async function buildApp() {
  const app = Fastify({
    logger: false,
    genReqId: generateRequestId,
  })

  app.addHook('onRequest', async (request) => {
    logger.info(
      { method: request.method, url: request.url, requestId: request.id },
      'Incoming request',
    )
  })

  app.addHook('onResponse', async (request, reply) => {
    logger.info(
      { method: request.method, url: request.url, statusCode: reply.statusCode, requestId: request.id },
      'Request completed',
    )
  })

  const boardAdapter = createBullBoardAdapter()
  await app.register(boardAdapter.registerPlugin(), { prefix: '/admin/queues' })

  await app.register(webhookRoutes)
  await app.register(jobsRoutes)

  return app
}
