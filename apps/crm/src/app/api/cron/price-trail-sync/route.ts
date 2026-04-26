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

  const startedAt = Date.now()
  const supabase  = await createClient()

  // Get all active profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('account_status', 'active')
    .limit(500)

  if (!profiles?.length) {
    return NextResponse.json({ ok: true, synced: 0, duration_ms: Date.now() - startedAt })
  }

  let totalSynced = 0

  for (const profile of profiles) {
    const n = await syncFromPortalListings(profile.id, 'portal_import')
    totalSynced += n
    await new Promise(r => setTimeout(r, 100)) // pace requests
  }

  return NextResponse.json({
    ok:              true,
    profiles:        profiles.length,
    points_synced:   totalSynced,
    duration_ms:     Date.now() - startedAt,
    ran_at:          new Date().toISOString(),
  })
}
