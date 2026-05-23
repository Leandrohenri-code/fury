import type { FastifyRequest, FastifyReply } from 'fastify'
import { takedownQueue } from '../takedown/takedown.queue'

interface JobParams {
  id: string
}

// Maps BullMQ internal states to our public API contract.
const STATUS_MAP: Record<string, string> = {
  waiting: 'waiting',
  active: 'active',
  completed: 'completed',
  failed: 'failed',
  delayed: 'waiting',
  prioritized: 'waiting',
  unknown: 'failed',
}

export async function getJobStatus(
  request: FastifyRequest<{ Params: JobParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params
  const job = await takedownQueue.getJob(id)

  if (!job) {
    return reply.status(404).send({ error: 'Job not found' })
  }

  const state = await job.getState()

  return reply.send({
    jobId: job.id,
    status: STATUS_MAP[state] ?? state,
    attempts: job.attemptsMade,
    result: job.returnvalue ?? null,
    error: job.failedReason ?? null,
  })
}
