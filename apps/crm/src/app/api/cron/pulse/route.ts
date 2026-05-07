// ================================================================
// Revolis.AI — Pulse Cron Endpoint
// Runs every 5 minutes to verify all critical integrations are alive
// vercel.json: {"path": "/api/cron/pulse", "schedule": "*/5 * * * *"}
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { runPulseCheck } from '@/lib/infra/pulse'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const result = await runPulseCheck()

  const status = result.ok ? 200 : 503
  return NextResponse.json(result, { status })
}
