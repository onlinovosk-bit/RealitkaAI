import { Worker, Job } from 'bullmq'
import { redis } from '../queues/index'
import { query } from '../db'
import { sendEmail } from '../integrations/resend'
import { notifyNoTrialAfter4h } from '../integrations/slack'
import {
  trialStartTemplate,
  followup24hTemplate,
  retargetingTemplate,
} from '../email/templates'

interface BaseJobData {
  orgId: string
  demoRequestId: string
  email: string
  name?: string
  score: number
}

interface SendEmailData extends BaseJobData {
  template: 'trial_start'
}

interface Followup24hData extends BaseJobData {
  template: 'followup_24h'
}

interface RetargetingData extends BaseJobData {
  day: number
  variant: 'A' | 'B'
}

interface CheckTrialData extends BaseJobData {}

async function markSent(jobId: string | undefined, orgId: string): Promise<void> {
  if (!jobId) return
  await query(
    `UPDATE sequence_logs SET sent_at = NOW()
     WHERE organization_id = $1 AND job_id = $2`,
    [orgId, jobId]
  ).catch(() => {})
}

async function handleSendEmail(job: Job<SendEmailData>): Promise<void> {
  const { email, name, score } = job.data
  const tpl = trialStartTemplate({ email, name, score })
  const sent = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })
  if (sent) await markSent(job.id, job.data.orgId)

  await query(
    `INSERT INTO events (organization_id, event_type, source, demo_request_id, payload)
     VALUES ($1, 'trial_email_sent', 'sequence', $2, $3)`,
    [job.data.orgId, job.data.demoRequestId, JSON.stringify({ email, score, sent })]
  )
}

async function handleFollowup24h(job: Job<Followup24hData>): Promise<void> {
  const { email, name, score } = job.data
  const tpl = followup24hTemplate({ email, name, score })
  const sent = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })
  if (sent) await markSent(job.id, job.data.orgId)

  await query(
    `INSERT INTO events (organization_id, event_type, source, demo_request_id, payload)
     VALUES ($1, 'followup_email_sent', 'sequence', $2, $3)`,
    [job.data.orgId, job.data.demoRequestId, JSON.stringify({ email, score, sent })]
  )
}

async function handleRetargeting(job: Job<RetargetingData>): Promise<void> {
  const { email, name, score, day } = job.data
  const tpl = retargetingTemplate({ email, name, score, day })
  const sent = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html })
  if (sent) await markSent(job.id, job.data.orgId)

  await query(
    `INSERT INTO events (organization_id, event_type, source, demo_request_id, payload)
     VALUES ($1, 'retargeting_email_sent', 'sequence', $2, $3)`,
    [job.data.orgId, job.data.demoRequestId, JSON.stringify({ email, score, day, sent })]
  )
}

async function handleCheckTrialStarted(job: Job<CheckTrialData>): Promise<void> {
  const { orgId, demoRequestId, email, name, score } = job.data

  const conversions = await query<{ id: string }>(
    `SELECT id FROM conversions
     WHERE organization_id = $1 AND demo_request_id = $2 AND trial_started_at IS NOT NULL
     LIMIT 1`,
    [orgId, demoRequestId]
  )

  if (conversions.length === 0) {
    await notifyNoTrialAfter4h({ email, name, score, demoId: demoRequestId })
    await query(
      `INSERT INTO events (organization_id, event_type, source, demo_request_id, payload)
       VALUES ($1, 'no_trial_after_4h', 'sequence', $2, $3)`,
      [orgId, demoRequestId, JSON.stringify({ email, score })]
    )
  }
}

export function startSequenceWorker(): Worker {
  const worker = new Worker(
    'sequences',
    async (job: Job) => {
      console.log('[worker] processing', job.name, job.id)
      switch (job.name) {
        case 'send_email':
          return handleSendEmail(job as Job<SendEmailData>)
        case 'followup_24h':
          return handleFollowup24h(job as Job<Followup24hData>)
        case 'retargeting':
          return handleRetargeting(job as Job<RetargetingData>)
        case 'check_trial_started':
          return handleCheckTrialStarted(job as Job<CheckTrialData>)
        default:
          console.warn('[worker] unknown job name', job.name)
      }
    },
    { connection: redis, concurrency: 5 }
  )

  worker.on('failed', (job, err) => {
    console.error('[worker] job failed', job?.id, job?.name, err.message)
  })

  worker.on('completed', (job) => {
    console.log('[worker] job done', job.id, job.name)
  })

  console.log('[worker] sequence worker started')
  return worker
}
