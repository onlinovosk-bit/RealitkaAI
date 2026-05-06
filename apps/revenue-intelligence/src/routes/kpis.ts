import { Router, Request, Response } from 'express'
import { query } from '../db'

const router = Router()

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

interface KpiRow {
  period: string
  demos_requested: string
  demos_contacted: string
  demos_qualified: string
  demos_closed_won: string
  demos_closed_lost: string
  conversion_rate: string
  avg_score: string
}

// GET /api/kpis?organization_id=...&period=7d|30d|90d
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { organization_id, period = '30d' } = req.query as Record<string, string>

  if (!organization_id || !isValidUuid(organization_id)) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'organization_id (UUID) required', code: 400 })
    return
  }

  const periodMap: Record<string, string> = {
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
  }
  const interval = periodMap[period] ?? '30 days'

  const [kpi] = await query<KpiRow>(
    `SELECT
       $2::text                                                 AS period,
       COUNT(*)                                                 AS demos_requested,
       COUNT(*) FILTER (WHERE status != 'new')                  AS demos_contacted,
       COUNT(*) FILTER (WHERE status = 'qualified')             AS demos_qualified,
       COUNT(*) FILTER (WHERE status = 'closed_won')            AS demos_closed_won,
       COUNT(*) FILTER (WHERE status = 'closed_lost')           AS demos_closed_lost,
       ROUND(
         100.0 * COUNT(*) FILTER (WHERE status = 'closed_won')
         / NULLIF(COUNT(*) FILTER (WHERE status IN ('closed_won','closed_lost')), 0),
         1
       )                                                        AS conversion_rate,
       ROUND(AVG(score), 1)                                     AS avg_score
     FROM demo_requests
     WHERE organization_id = $1
       AND created_at >= NOW() - ($2 || ' days')::INTERVAL`,
    [organization_id, interval.replace(' days', '')]
  )

  // Event volume breakdown
  const eventCounts = await query<{ event_type: string; count: string }>(
    `SELECT event_type, COUNT(*) AS count
     FROM events
     WHERE organization_id = $1
       AND created_at >= NOW() - ($2 || ' days')::INTERVAL
     GROUP BY event_type
     ORDER BY count DESC`,
    [organization_id, interval.replace(' days', '')]
  )

  // Daily demo volume (sparkline data)
  const daily = await query<{ day: string; count: string }>(
    `SELECT DATE_TRUNC('day', created_at)::date::text AS day,
            COUNT(*) AS count
     FROM demo_requests
     WHERE organization_id = $1
       AND created_at >= NOW() - ($2 || ' days')::INTERVAL
     GROUP BY 1
     ORDER BY 1`,
    [organization_id, interval.replace(' days', '')]
  )

  res.json({
    ok: true,
    period,
    kpi: {
      demos_requested: parseInt(kpi?.demos_requested ?? '0', 10),
      demos_contacted: parseInt(kpi?.demos_contacted ?? '0', 10),
      demos_qualified: parseInt(kpi?.demos_qualified ?? '0', 10),
      demos_closed_won: parseInt(kpi?.demos_closed_won ?? '0', 10),
      demos_closed_lost: parseInt(kpi?.demos_closed_lost ?? '0', 10),
      conversion_rate: parseFloat(kpi?.conversion_rate ?? '0'),
      avg_score: parseFloat(kpi?.avg_score ?? '0'),
    },
    events: eventCounts.map((r) => ({ type: r.event_type, count: parseInt(r.count, 10) })),
    daily: daily.map((r) => ({ day: r.day, count: parseInt(r.count, 10) })),
  })
})

export default router
