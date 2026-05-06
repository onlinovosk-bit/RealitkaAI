import { Queue } from 'bullmq'
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('error', (err) => {
  console.error('[redis] connection error', err.message)
})

export const sequenceQueue = new Queue('sequences', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 1000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
  },
})
