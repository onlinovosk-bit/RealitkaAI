// ================================================================
// Revolis.AI — Realvia Queue Processor Cron
// Drains pending Realvia webhook jobs (property sync for Reality Smolko)
// vercel.json: { "path": "/api/cron/realvia-process", "schedule": "*/5 * * * *" }
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { processRealviaQueue } from '@/lib/realvia/processQueue'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processRealviaQueue()

    return NextResponse.json({
      ok: result.failed === 0,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      durationMs: result.durationMs,
      ran_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[realvia-process]', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Queue processing failed',
      },
      { status: 500 },
    )
  }
}
