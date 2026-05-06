import { sequenceQueue } from './index'
import { query } from '../db'

export interface SequenceParams {
  orgId: string
  demoRequestId: string
  email: string
  name?: string
  bucket: 'HIGH' | 'MEDIUM' | 'LOW'
  score: number
}

const H = 60 * 60 * 1000
const D = 24 * H

export async function triggerSequence(params: SequenceParams): Promise<void> {
  const { orgId, demoRequestId, email, name, bucket, score } = params

  if (bucket === 'HIGH') {
    const job1 = await sequenceQueue.add(
      'send_email',
      { orgId, demoRequestId, email, name, template: 'trial_start', score },
      { delay: 0 }
    )
    await logSequence(orgId, demoRequestId, email, 'high', 0, 'A', job1.id)

    // If no trial after 4 hours → Slack flag for direct call
    await sequenceQueue.add(
      'check_trial_started',
      { orgId, demoRequestId, email, name, score },
      { delay: 4 * H }
    )
  }

  if (bucket === 'MEDIUM') {
    const job1 = await sequenceQueue.add(
      'followup_24h',
      { orgId, demoRequestId, email, name, template: 'followup_24h', score },
      { delay: D }
    )
    await logSequence(orgId, demoRequestId, email, 'medium', 1, 'A', job1.id)

    // Retargeting if no response after 5 days
    for (const day of [5, 10]) {
      const job = await sequenceQueue.add(
        'retargeting',
        { orgId, demoRequestId, email, name, day, variant: 'A', score },
        { delay: day * D }
      )
      await logSequence(orgId, demoRequestId, email, 'retargeting', day, 'A', job.id)
    }
  }

  if (bucket === 'LOW') {
    for (const day of [2, 5, 10]) {
      const job = await sequenceQueue.add(
        'retargeting',
        { orgId, demoRequestId, email, name, day, variant: 'A', score },
        { delay: day * D }
      )
      await logSequence(orgId, demoRequestId, email, 'retargeting', day, 'A', job.id)
    }
  }
}

async function logSequence(
  orgId: string,
  demoRequestId: string,
  email: string,
  sequenceType: string,
  day: number,
  variant: string,
  jobId?: string
): Promise<void> {
  await query(
    `INSERT INTO sequence_logs (organization_id, demo_request_id, email, sequence_type, day, variant, job_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [orgId, demoRequestId, email, sequenceType, day, variant, jobId ?? null]
  )
}
