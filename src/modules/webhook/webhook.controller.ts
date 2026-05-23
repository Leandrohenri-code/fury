import type { FastifyRequest, FastifyReply } from 'fastify'
import { violationSchema, type ViolationPayload } from './webhook.schema'
import { enqueueTakedown } from '../takedown/takedown.service'
import { logger } from '../../shared/logger/logger'
import { startTimer } from '../../shared/utils/duration'

export async function handleViolation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const elapsed = startTimer()
  const requestId = request.id

  const parsed = violationSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    })
  }

  const payload: ViolationPayload = parsed.data

  logger.info(
    { adId: payload.adId, tenantId: payload.tenantId, violationType: payload.violationType, severity: payload.severity, requestId },
    '[Webhook] Violation received',
  )

  const { jobId, status } = await enqueueTakedown(payload, requestId)

  const isDuplicate = status === 'duplicate'

  return reply.status(isDuplicate ? 200 : 202).send({
    jobId,
    status,
    message: isDuplicate
      ? 'A takedown job is already in progress for this ad.'
      : 'Takedown job enqueued successfully.',
    durationMs: elapsed(),
  })
}
