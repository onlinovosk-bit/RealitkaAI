// ================================================================
// Revolis.AI — Morning Brief Cron
// Delivers personalised brief to every profile with enabled settings
// vercel.json: {"path": "/api/cron/morning-brief", "schedule": "0 6 * * *"}
// ================================================================
import { NextRequest, NextResponse }     from 'next/server'
import { createClient }                  from '@/lib/supabase/server'
import { generateAndDeliverBrief }       from '@/lib/morning-brief/assemble'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: settings, error } = await supabase
    .from('morning_brief_settings')
    .select('profile_id')
    .eq('enabled', true)

  if (error) {
    console.error('[morning-brief cron] settings fetch failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!settings?.length) {
    return NextResponse.json({ sent: 0, failed: 0, profiles: [] })
  }

  const BATCH = 5  // conservative — brief delivery calls Resend email API
  const all: Array<{ profileId: string; delivered: boolean; channels: string[]; error?: string }> = []

  for (let i = 0; i < settings.length; i += BATCH) {
    const batchResults = await Promise.all(
      settings.slice(i, i + BATCH).map(async ({ profile_id }) => {
        try {
          const result = await generateAndDeliverBrief(profile_id)
          if (result) return { profileId: result.profileId, delivered: result.delivered, channels: result.channels, error: result.error }
          return { profileId: profile_id, delivered: false, channels: [] }
        } catch (err: any) {
          console.error(`[morning-brief cron] profile ${profile_id} failed:`, err.message)
          return { profileId: profile_id, delivered: false, channels: [], error: err.message }
        }
      })
    )
    all.push(...batchResults)
  }

  const sent   = all.filter(r => r.delivered).length
  const failed = all.filter(r => !r.delivered).length
  const profiles = all

  return NextResponse.json({
    ok:           true,
    sent,
    failed,
    profiles,
    generated_at: new Date().toISOString(),
  })
}
