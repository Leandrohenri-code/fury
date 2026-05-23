import { Queue } from 'bullmq'
import { redisConfig } from '../../config/redis'

export const takedownQueue = new Queue('takedown', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
