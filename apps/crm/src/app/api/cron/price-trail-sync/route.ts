// ================================================================
// Revolis.AI — Price Trail Sync Cron
// Runs after arbitrage scan to sync portal prices into trail
// vercel.json: { "path": "/api/cron/price-trail-sync", "schedule": "30 */6 * * *" }
// 30 min after arbitrage scan (runs on the hour)
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import { syncFromPortalListings }      from '@/lib/price-trail/engine'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const startedAt = Date.now()
    const supabase  = await createClient()

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('account_status', 'active')
      .limit(500)

    if (!profiles?.length) {
      return NextResponse.json({ ok: true, synced: 0, duration_ms: Date.now() - startedAt })
    }

    let totalSynced = 0
    const BATCH = 5
    for (let i = 0; i < profiles.length; i += BATCH) {
      const counts = await Promise.all(
        profiles.slice(i, i + BATCH).map(p => syncFromPortalListings(p.id, 'portal_import'))
      )
      totalSynced += counts.reduce((s, n) => s + n, 0)
    }

    return NextResponse.json({
      ok:              true,
      profiles:        profiles.length,
      points_synced:   totalSynced,
      duration_ms:     Date.now() - startedAt,
      ran_at:          new Date().toISOString(),
    })
  } catch (error) {
    console.error('[price-trail-sync]', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Sync zlyhal.' },
      { status: 500 }
    )
  }
}
