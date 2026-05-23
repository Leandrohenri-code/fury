import { Redis } from 'ioredis'
import { takedownQueue } from './takedown.queue'
import type { TakedownJobData } from './takedown.types'
import type { ViolationPayload } from '../webhook/webhook.schema'
import { redisConfig } from '../../config/redis'
import { logger } from '../../shared/logger/logger'

// Dedicated Redis client for atomic deduplication locks.
// Separate from the BullMQ connection so we can issue raw commands.
const redis = new Redis(redisConfig)

// TTL long enough to cover the full job lifecycle (enqueue → process → complete).
// Cleaned up on completion/failure so re-processing is allowed immediately after.
const DEDUP_TTL_SECONDS = 3600

interface EnqueueResult {
  jobId: string
  status: 'enqueued' | 'duplicate'
}

export async function enqueueTakedown(
  payload: ViolationPayload,
  requestId: string,
): Promise<EnqueueResult> {
  // Idempotência: evita múltiplos takedowns simultâneos para o mesmo anúncio.
  // BullMQ reserva ":" para separadores internos de chave Redis — usamos "|".
  const jobId = `${payload.tenantId}|${payload.adId}`

  // SET NX é atômico — apenas um request vence mesmo com concorrência real.
  const lockKey = `fury:dedup:${jobId}`
  const acquired = await redis.set(lockKey, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')

  if (!acquired) {
    logger.warn({ jobId, requestId }, '[Queue] Duplicate job detected — skipping')
    return { jobId, status: 'duplicate' }
  }

  const data: TakedownJobData = {
    ...payload,
    requestId,
    enqueuedAt: new Date().toISOString(),
  }

  const job = await takedownQueue.add('process-violation', data, { jobId })

  logger.info(
    { jobId: job.id, adId: payload.adId, tenantId: payload.tenantId, requestId },
    '[Queue] Job enqueued',
  )

  return { jobId, status: 'enqueued' }
}

// Called by the worker after job completes or fails — releases the lock so
// the same ad can be re-processed once the job is no longer in-flight.
export async function releaseDedupLock(jobId: string): Promise<void> {
  await redis.del(`fury:dedup:${jobId}`)
}
