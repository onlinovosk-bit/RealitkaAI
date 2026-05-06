import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { query } from '../db'
import { updateDealStage } from '../integrations/hubspot'

const router = Router()

// HubSpot webhook events we care about
const TRACKED_EVENTS = new Set([
  'deal.creation',
  'deal.propertyChange',
  'contact.creation',
  'contact.propertyChange',
])

function verifyHubSpotSignature(req: Request): boolean {
  const secret = process.env.HUBSPOT_WEBHOOK_SECRET
  if (!secret) return true // skip in dev if not configured

  const sig = req.headers['x-hubspot-signature-v3'] as string | undefined
  if (!sig) return false

  const timestamp = req.headers['x-hubspot-request-timestamp'] as string | undefined
  if (!timestamp) return false

  // Reject stale requests older than 5 minutes
  if (Date.now() - parseInt(timestamp, 10) > 300_000) return false

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  const method = req.method
  const uri = `https://${req.hostname}${req.originalUrl}`

  const message = `${method}${uri}${rawBody}${timestamp}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

interface HubSpotWebhookEvent {
  eventId: number
  subscriptionId: number
  portalId: number
  appId: number
  occurredAt: number
  subscriptionType: string
  attemptNumber: number
  objectId: number
  propertyName?: string
  propertyValue?: string
  changeSource?: string
}

// POST /api/hubspot/webhook
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  if (!verifyHubSpotSignature(req)) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid HubSpot signature', code: 401 })
    return
  }

  // HubSpot sends an array of events in one payload
  const events: HubSpotWebhookEvent[] = Array.isArray(req.body) ? req.body : [req.body]

  // Acknowledge immediately — process async
  res.status(200).json({ ok: true, received: events.length })

  // Default org for inbound HubSpot events (override per org in multi-tenant setup)
  const orgId = process.env.DEFAULT_ORGANIZATION_ID ?? '00000000-0000-0000-0000-000000000001'

  for (const event of events) {
    if (!TRACKED_EVENTS.has(event.subscriptionType)) continue

    try {
      await query(
        `INSERT INTO events (organization_id, event_type, source, payload)
         VALUES ($1, $2, 'hubspot', $3)`,
        [orgId, event.subscriptionType, JSON.stringify(event)]
      )

      // Handle deal stage changes — sync back if we own the demo record
      if (
        event.subscriptionType === 'deal.propertyChange' &&
        event.propertyName === 'dealstage' &&
        event.propertyValue
      ) {
        const dealId = String(event.objectId)
        const rows = await query<{ id: string; status: string }>(
          `SELECT id, status FROM demo_requests
           WHERE organization_id = $1 AND hubspot_deal_id = $2
           LIMIT 1`,
          [orgId, dealId]
        )

        if (rows.length > 0) {
          const stageToStatus: Record<string, string> = {
            closedwon: 'closed_won',
            closedlost: 'closed_lost',
            appointmentscheduled: 'contacted',
            qualifiedtobuy: 'qualified',
          }
          const newStatus = stageToStatus[event.propertyValue]
          if (newStatus && newStatus !== rows[0].status) {
            await query(
              `UPDATE demo_requests SET status = $1 WHERE id = $2`,
              [newStatus, rows[0].id]
            )
          }
        }
      }
    } catch (err) {
      console.error('[hubspot-webhook] Failed to process event', event.eventId, (err as Error).message)
    }
  }
})

export { updateDealStage }
export default router
