import { buildApp } from './app'
import { env } from './config/env'
import { logger } from './shared/logger/logger'
import { takedownWorker } from './modules/takedown/takedown.worker'

async function main() {
  const app = await buildApp()

  await app.listen({ port: env.PORT, host: '0.0.0.0' })

  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'FURY is running')

  const shutdown = async () => {
    logger.info('Shutting down gracefully...')
    await Promise.all([app.close(), takedownWorker.close()])
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((error) => {
  logger.error(error, 'Fatal error on startup')
  process.exit(1)
})
