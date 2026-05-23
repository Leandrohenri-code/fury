import { Worker, UnrecoverableError, type Job } from 'bullmq'
import axios from 'axios'
import { redisConfig } from '../../config/redis'
import type { TakedownJobData } from './takedown.types'
import { requestTakedown, type MetaApiResponse } from '../../services/meta-api.service'
import { releaseDedupLock } from './takedown.service'
import { logger } from '../../shared/logger/logger'

// 4xx errors are client-side issues — retrying will not change the outcome.
function isNonRetryable(error: unknown): boolean {
  if (axios.isAxiosError(error) && error.response) {
    return error.response.status >= 400 && error.response.status < 500
  }
  return false
}

async function processTakedown(job: Job<TakedownJobData>): Promise<MetaApiResponse> {
  const { adId, tenantId, requestId } = job.data
  const attempt = job.attemptsMade + 1
  const maxAttempts = job.opts.attempts ?? 3

  logger.info(
    { jobId: job.id, adId, tenantId, attempt, maxAttempts, requestId },
    `[Worker] Attempt ${attempt}/${maxAttempts}`,
  )

  try {
    const result = await requestTakedown(job.id!)
    logger.info({ jobId: job.id, adId, tenantId, requestId }, '[Worker] Takedown completed')
    return result
  } catch (error) {
    if (isNonRetryable(error)) {
      logger.error(
        { jobId: job.id, adId, error: (error as Error).message },
        '[Worker] Non-retryable error — failing immediately',
      )
      throw new UnrecoverableError('Non-retryable HTTP client error')
    }

    logger.warn(
      { jobId: job.id, adId, attempt, maxAttempts, requestId },
      '[Worker] Retryable error — scheduling retry',
    )
    throw error
  }
}

export const takedownWorker = new Worker<TakedownJobData, MetaApiResponse>(
  'takedown',
  processTakedown,
  {
    connection: redisConfig,
    concurrency: 5,
  },
)

takedownWorker.on('completed', async (job) => {
  await releaseDedupLock(job.id!)
  logger.info({ jobId: job.id }, '[Worker] Job completed')
})

takedownWorker.on('failed', async (job, error) => {
  if (job?.id) await releaseDedupLock(job.id)
  logger.error({ jobId: job?.id, error: error.message }, '[Worker] Job failed')
})
