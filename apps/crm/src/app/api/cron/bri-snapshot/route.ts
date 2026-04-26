// ================================================================
// Revolis.AI — BRI Snapshot Cron
// Rotates score_24h_ago → score_7d_ago daily at 02:00 UTC
// vercel.json: {"path": "/api/cron/bri-snapshot", "schedule": "0 2 * * *"}
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rotate_bri_snapshots')

  if (error) {
    console.error('[bri-snapshot cron]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok:         true,
    rotated:    data as number,
    rotated_at: new Date().toISOString(),
  })
}
