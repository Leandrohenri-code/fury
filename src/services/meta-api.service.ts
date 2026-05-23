import axios from 'axios'
import { logger } from '../shared/logger/logger'
import { startTimer } from '../shared/utils/duration'

// Simulates a Meta Ads API takedown request.
// In production this would be the Graph API endpoint for ad removal.
const META_API_URL = 'https://jsonplaceholder.typicode.com/posts/1'

export interface MetaApiResponse {
  userId: number
  id: number
  title: string
  body: string
}

export async function requestTakedown(jobId: string): Promise<MetaApiResponse> {
  const elapsed = startTimer()

  logger.info({ jobId }, '[Meta API] Request started')

  const response = await axios.get<MetaApiResponse>(META_API_URL, {
    timeout: 10_000,
    headers: {
      'X-Job-Id': jobId,
      'User-Agent': 'fury/1.0',
    },
  })

  logger.info({ jobId, status: response.status, durationMs: elapsed() }, '[Meta API] Success')

  return response.data
}
