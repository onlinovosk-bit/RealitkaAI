// ================================================================
// Revolis.AI — Dashboard insights batch (Haiku + cache per agency)
// vercel.json: 0 6 * * * and 0 13 * * *
// Auth: Authorization: Bearer $CRON_SECRET
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  generateAndCacheAgencyInsights,
  listActiveAgencyIds,
} from '@/lib/ai/dashboard-insights-cron'

const BATCH = 3

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const admin = createAdminClient()
  const agencyIds = await listActiveAgencyIds(admin)

  if (!agencyIds.length) {
    return NextResponse.json({
      ok: true,
      agencies: 0,
      succeeded: 0,
      failed: 0,
      duration_ms: Date.now() - startedAt,
    })
  }

  const results: Awaited<ReturnType<typeof generateAndCacheAgencyInsights>>[] = []

  for (let i = 0; i < agencyIds.length; i += BATCH) {
    const batch = agencyIds.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      batch.map(agencyId => generateAndCacheAgencyInsights(admin, agencyId)),
    )
    results.push(...batchResults)
  }

  const succeeded = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok)

  return NextResponse.json({
    ok: failed.length === 0,
    agencies: agencyIds.length,
    succeeded,
    failed: failed.length,
    errors: failed.length ? failed : undefined,
    duration_ms: Date.now() - startedAt,
    ran_at: new Date().toISOString(),
  })
}
