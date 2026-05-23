import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import { takedownQueue } from '../modules/takedown/takedown.queue'

export function createBullBoardAdapter(): FastifyAdapter {
  const serverAdapter = new FastifyAdapter()
  serverAdapter.setBasePath('/admin/queues')

  createBullBoard({
    queues: [new BullMQAdapter(takedownQueue)],
    serverAdapter,
  })

  return serverAdapter
}
