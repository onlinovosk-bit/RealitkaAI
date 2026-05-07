// ================================================================
// Revolis.AI — BRI Batch Recompute Cron
// Runs every 6 hours to refresh all lead scores
// vercel.json: {"path": "/api/cron/recompute-bri", "schedule": "0 */6 * * *"}
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { batchRecomputeBRI }         from '@/lib/events/bri-score'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('account_status', 'active')

    if (!profiles?.length) return NextResponse.json({ ok: true, computed: 0 })

    let totalComputed = 0
    const BATCH = 5
    for (let i = 0; i < profiles.length; i += BATCH) {
      const counts = await Promise.all(
        profiles.slice(i, i + BATCH).map(p => batchRecomputeBRI(p.id))
      )
      totalComputed += counts.reduce((s, n) => s + n, 0)
    }

    return NextResponse.json({
      ok: true,
      profiles_processed: profiles.length,
      scores_computed: totalComputed,
      computed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[recompute-bri]', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Recompute zlyhal.' },
      { status: 500 }
    )
  }
}
