// ================================================================
// Revolis.AI — Arbitrage Scan Cron
// vercel.json: { "path": "/api/cron/arbitrage-scan", "schedule": "0 */6 * * *" }
// Runs: 00:00, 06:00, 12:00, 18:00 UTC
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import { runArbitrageScan }           from '@/lib/arbitrage/scan'

const MAX_PROFILES_PER_RUN = 100

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase  = await createClient()

  const { data: configs } = await supabase
    .from('arbitrage_config')
    .select('profile_id')
    .eq('enabled', true)
    .limit(MAX_PROFILES_PER_RUN)

  if (!configs?.length) {
    return NextResponse.json({ ok: true, scanned: 0, duration_ms: Date.now() - startedAt })
  }

  // Also expire old matches
  try {
    await supabase.rpc('expire_arbitrage_matches')
  } catch (err) {
    console.error(err)
  }

  const results = await Promise.allSettled(
    configs.map(c => runArbitrageScan(c.profile_id))
  )

  const summaries = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<any>).value)

  const totalMatches  = summaries.reduce((s, r) => s + (r.matches_new ?? 0), 0)
  const totalListings = summaries.reduce((s, r) => s + (r.listings_fetched ?? 0), 0)

  return NextResponse.json({
    ok:              true,
    profiles_scanned: configs.length,
    total_listings:  totalListings,
    total_new_matches: totalMatches,
    duration_ms:     Date.now() - startedAt,
    ran_at:          new Date().toISOString(),
  })
}
