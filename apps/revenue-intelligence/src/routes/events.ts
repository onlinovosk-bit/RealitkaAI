import { Router, Request, Response } from 'express'
import { query } from '../db'

const router = Router()

interface EventBody {
  organization_id: string
  event_type: string
  source?: string
  demo_request_id?: string
  payload?: Record<string, unknown>
}

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

// POST /api/events
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as EventBody

  if (!body.organization_id || !isValidUuid(body.organization_id)) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'organization_id (UUID) required', code: 400 })
    return
  }
  if (!body.event_type || typeof body.event_type !== 'string') {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'event_type required', code: 400 })
    return
  }
  if (body.demo_request_id && !isValidUuid(body.demo_request_id)) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'demo_request_id must be a UUID', code: 400 })
    return
  }

  const [event] = await query<{ id: string; created_at: string }>(
    `INSERT INTO events (organization_id, event_type, source, demo_request_id, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [
      body.organization_id,
      body.event_type,
      body.source ?? 'internal',
      body.demo_request_id ?? null,
      JSON.stringify(body.payload ?? {}),
    ]
  )

  res.status(201).json({ ok: true, id: event.id, created_at: event.created_at })
})

// GET /api/events — list recent events for an org
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { organization_id, event_type, limit = '50' } = req.query as Record<string, string>

  if (!organization_id || !isValidUuid(organization_id)) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'organization_id (UUID) required', code: 400 })
    return
  }

  const cap = Math.min(parseInt(limit, 10) || 50, 200)
  const params: unknown[] = [organization_id, cap]
  let typeFilter = ''
  if (event_type) {
    params.push(event_type)
    typeFilter = `AND event_type = $${params.length}`
  }

  const events = await query(
    `SELECT id, event_type, source, demo_request_id, payload, created_at
     FROM events
     WHERE organization_id = $1 ${typeFilter}
     ORDER BY created_at DESC
     LIMIT $2`,
    params
  )

  res.json({ ok: true, events })
})

export default router
