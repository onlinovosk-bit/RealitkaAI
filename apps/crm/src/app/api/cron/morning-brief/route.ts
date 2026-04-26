// ================================================================
// Revolis.AI — Morning Brief Cron Route
// vercel.json schedule: "30 5 * * *"  →  05:30 UTC = 07:30 SK
// Runs 30 min before 08:00 to ensure delivery by 08:00 SK
//
// Why 05:30 UTC:
//   - SK is UTC+2 (CET) or UTC+3 (CEST in summer)
//   - Schedule conservatively at UTC+2 = deliver by 07:30 SK worst case
//   - Adjust to "45 4 * * *" in summer (CEST UTC+3)
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import { generateAndDeliverBrief }    from '@/lib/morning-brief/assemble'

// Hard limit: max briefs per cron run (safety valve)
const MAX_PER_RUN = 500

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase  = await createClient()

  // Get all profiles with brief enabled
  const { data: profiles, error } = await supabase
    .from('morning_brief_settings')
    .select('profile_id, delivery_hour_utc, delivery_minute_utc')
    .eq('enabled', true)
    .limit(MAX_PER_RUN)

  if (error || !profiles?.length) {
    return NextResponse.json({
      ok:       true,
      sent:     0,
      skipped:  0,
      duration: Date.now() - startedAt,
    })
  }

  const currentHourUTC = new Date().getUTCHours()

  // Only deliver to profiles whose configured hour matches now
  const eligible = profiles.filter(p => p.delivery_hour_utc === currentHourUTC)

  let sent = 0, failed = 0, skipped = 0

  const results = await Promise.allSettled(
    eligible.map(p => generateAndDeliverBrief(p.profile_id))
  )

  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value?.delivered) sent++
    else if (r.status === 'fulfilled' && r.value === null) skipped++
    else failed++
  })

  console.log(`[morning-brief cron] sent=${sent} failed=${failed} skipped=${skipped} ms=${Date.now()-startedAt}`)

  return NextResponse.json({
    ok:            true,
    total_profiles: profiles.length,
    eligible,
    sent,
    failed,
    skipped,
    duration_ms:   Date.now() - startedAt,
    ran_at:        new Date().toISOString(),
  })
}
