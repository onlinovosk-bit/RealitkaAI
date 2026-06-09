// ================================================================
// Revolis.AI — BRI Snapshot Cron
// Rotates score_24h_ago → score_7d_ago daily at 02:00 UTC
// vercel.json: {"path": "/api/cron/bri-snapshot", "schedule": "0 2 * * *"}
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { err } from '@/lib/api-response'
import { createClient }              from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return err('Unauthorized', 401)
  }

  // Idempotency: rotate_bri_snapshots RPC handles daily rotation atomically.
  // TODO: bri_snapshots per-agency table idempotency — not in schema; rely on RPC.
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('rotate_bri_snapshots')

    if (error) {
      console.error('[bri-snapshot cron]', error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const rotated = typeof data === 'number' ? data : Number(data ?? 0)

    return NextResponse.json({
      ok: true,
      rotated: Number.isFinite(rotated) ? rotated : 0,
      rotated_at: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[bri-snapshot cron] unexpected', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
