import { Router, Request, Response } from 'express'
import { query } from '../db'
import { createOrUpdateContact, createDeal, associateContactToDeal } from '../integrations/hubspot'
import { scoreDemo } from '../scoring/engine'
import { triggerSequence } from '../queues/sequences'
import { notifyHighScore } from '../integrations/slack'

const router = Router()

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

// POST /api/demos — create demo request + HubSpot sync
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { organization_id, email, name, company, source, metadata } = req.body as {
    organization_id: string
    email: string
    name?: string
    company?: string
    source?: string
    metadata?: Record<string, unknown>
  }

  if (!organization_id || !isValidUuid(organization_id)) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'organization_id (UUID) required', code: 400 })
    return
  }
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'valid email required', code: 400 })
    return
  }

  // Quick pre-demo score (company + source signal only, full score comes after outcome)
  let initialScore = 50
  if (company) initialScore += 20
  const premiumSources = ['outbound', 'referral', 'event']
  if (source && premiumSources.includes(source)) initialScore += 20
  if ((metadata?.['agency_size'] as number | undefined ?? 0) > 5) initialScore += 10
  initialScore = Math.min(initialScore, 100)

  const [nameParts] = [name?.split(' ') ?? []]
  const firstname = nameParts[0]
  const lastname = nameParts.slice(1).join(' ') || undefined

  const [demo] = await query<{ id: string; created_at: string }>(
    `INSERT INTO demo_requests (organization_id, email, name, company, source, score, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at`,
    [organization_id, email, name ?? null, company ?? null, source ?? 'web', initialScore, JSON.stringify(metadata ?? {})]
  )

  await query(
    `INSERT INTO events (organization_id, event_type, source, demo_request_id, payload)
     VALUES ($1, 'demo_requested', $2, $3, $4)`,
    [organization_id, source ?? 'web', demo.id, JSON.stringify({ email, score: initialScore })]
  )

  // HubSpot sync (fire-and-forget)
  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    void (async () => {
      try {
        const contact = await createOrUpdateContact({ email, firstname, lastname, company })
        const dealId = await createDeal({ dealname: `Demo — ${email}` })
        await associateContactToDeal(contact.id, dealId)
        await query(`UPDATE demo_requests SET hubspot_deal_id = $1 WHERE id = $2`, [dealId, demo.id])
      } catch (err) {
        console.error('[demos] HubSpot sync failed', (err as Error).message)
      }
    })()
  }

  res.status(201).json({ ok: true, id: demo.id, score: initialScore, created_at: demo.created_at })
})

interface OutcomeBody {
  organization_id: string
  // Scoring inputs
  steps_completed?: number[]
  aha_moment?: boolean
  leads_recognized?: number
  estimated_lost_deals?: number
  has_system?: boolean
  pre_demo_engaged?: boolean
  team_size?: number
  leads_per_month?: number
  open_confirmed?: boolean
  interest_level?: 'high' | 'medium' | 'low' | 'none'
  est_loss_eur?: number
  decision?: 'start_now' | 'not_now' | 'thinking' | 'no'
}

// POST /api/demos/:id/outcome — score demo + trigger sequences
router.post('/:id/outcome', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const body = req.body as OutcomeBody

  if (!body.organization_id || !isValidUuid(body.organization_id)) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'organization_id required', code: 400 })
    return
  }

  const demoRows = await query<{
    id: string; email: string; name: string | null; company: string | null; hubspot_deal_id: string | null
  }>(
    `SELECT id, email, name, company, hubspot_deal_id FROM demo_requests
     WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, body.organization_id]
  )

  if (demoRows.length === 0) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Demo not found', code: 404 })
    return
  }

  const demo = demoRows[0]

  const { score, bucket, signals } = scoreDemo({
    ahaMonent:           body.aha_moment,
    leadsRecognized:     body.leads_recognized,
    estimatedLostDeals:  body.estimated_lost_deals,
    hasSystem:           body.has_system,
    preDemoEngaged:      body.pre_demo_engaged,
    teamSize:            body.team_size,
    leadsPerMonth:       body.leads_per_month,
    openConfirmed:       body.open_confirmed,
  })

  // Upsert demo_outcomes
  await query(
    `INSERT INTO demo_outcomes
       (organization_id, demo_request_id, steps_completed, aha_moment, leads_recognized,
        estimated_lost_deals, has_system, pre_demo_engaged, team_size, leads_per_month,
        open_confirmed, interest_level, est_loss_eur, decision, score, bucket, signals)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (demo_request_id) DO UPDATE SET
       steps_completed = EXCLUDED.steps_completed,
       aha_moment = EXCLUDED.aha_moment,
       leads_recognized = EXCLUDED.leads_recognized,
       estimated_lost_deals = EXCLUDED.estimated_lost_deals,
       has_system = EXCLUDED.has_system,
       pre_demo_engaged = EXCLUDED.pre_demo_engaged,
       team_size = EXCLUDED.team_size,
       leads_per_month = EXCLUDED.leads_per_month,
       open_confirmed = EXCLUDED.open_confirmed,
       interest_level = EXCLUDED.interest_level,
       est_loss_eur = EXCLUDED.est_loss_eur,
       decision = EXCLUDED.decision,
       score = EXCLUDED.score,
       bucket = EXCLUDED.bucket,
       signals = EXCLUDED.signals,
       scored_at = NOW()`,
    [
      body.organization_id, id,
      body.steps_completed ?? null,
      body.aha_moment ?? false,
      body.leads_recognized ?? null,
      body.estimated_lost_deals ?? null,
      body.has_system ?? null,
      body.pre_demo_engaged ?? false,
      body.team_size ?? null,
      body.leads_per_month ?? null,
      body.open_confirmed ?? false,
      body.interest_level ?? null,
      body.est_loss_eur ?? null,
      body.decision ?? null,
      score, bucket, JSON.stringify(signals),
    ]
  )

  // Update demo_requests with final score
  const statusMap: Record<string, string> = {
    start_now: 'qualified',
    not_now:   'contacted',
    thinking:  'contacted',
    no:        'disqualified',
  }
  const newStatus = body.decision ? (statusMap[body.decision] ?? 'contacted') : 'contacted'
  await query(
    `UPDATE demo_requests SET score = $1, status = $2 WHERE id = $3`,
    [score, newStatus, id]
  )

  await query(
    `INSERT INTO events (organization_id, event_type, source, demo_request_id, payload)
     VALUES ($1, 'demo_outcome_scored', 'internal', $2, $3)`,
    [body.organization_id, id, JSON.stringify({ score, bucket, signals, decision: body.decision })]
  )

  // Trigger sequence + Slack (fire-and-forget)
  void (async () => {
    try {
      await triggerSequence({
        orgId: body.organization_id,
        demoRequestId: id,
        email: demo.email,
        name: demo.name ?? undefined,
        bucket,
        score,
      })

      if (bucket === 'HIGH') {
        await notifyHighScore({
          email: demo.email,
          name: demo.name ?? undefined,
          company: demo.company ?? undefined,
          score,
          demoId: id,
          hubspotDealId: demo.hubspot_deal_id,
        })
      }
    } catch (err) {
      console.error('[demos] sequence/slack trigger failed', (err as Error).message)
    }
  })()

  res.json({ ok: true, id, score, bucket, signals })
})

export default router
