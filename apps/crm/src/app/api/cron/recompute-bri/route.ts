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
    for (const profile of profiles) {
      const count = await batchRecomputeBRI(profile.id)
      totalComputed += count
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
