// ================================================================
// Revolis.AI — BRI Batch Recompute Cron
// vercel.json: {"path": "/api/cron/recompute-bri", "schedule": "40 2 * * *"}
//
// Denne, nie každých 6 hodín: účet je na Vercel Hobby, ktorý povoľuje len jeden
// beh denne — sub-denný výraz zhodí celý deployment, nielen ten cron. Pôvodná
// hlavička tu sľubovala "0 */6 * * *", pričom vo vercel.json nebol vôbec žiadny
// záznam; to bola presne tá nezrovnalosť, ktorú BRI-DEAD-PATH (#738) našiel.
//
// Čas je zvolený: bri-snapshot o 02:00 prerotuje score_24h_ago → score_7d_ago,
// o 02:40 sa dopočítajú nové skóre, a ranný brief o 06:00 ich už vidí čerstvé.
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'
import { batchRecomputeBRI }         from '@/lib/events/bri-score'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Service-role, not the cookie client: a cron request carries no session,
    // so the cookie client reads `profiles` as anon and RLS returns nothing.
    const supabase = createAdminClient()

    // `account_status` does not exist on `profiles` — the column is `is_active`.
    // The old filter made this query error, `profiles` came back null, and the
    // route returned `{ computed: 0 }` without ever saying why (BRI-DEAD-PATH).
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true)

    if (profileErr) {
      console.error('[recompute-bri cron] profile fetch failed:', profileErr.message)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    if (!profiles?.length) return NextResponse.json({ ok: true, computed: 0 })

    let totalComputed = 0
    const BATCH = 5
    for (let i = 0; i < profiles.length; i += BATCH) {
      const counts = await Promise.all(
        profiles.slice(i, i + BATCH).map(p => batchRecomputeBRI(p.id, supabase))
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
