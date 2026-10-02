// ================================================================
// Revolis.AI — Morning Brief Cron
// Delivers personalised brief to every profile with enabled settings
// vercel.json: {"path": "/api/cron/morning-brief", "schedule": "0 6 * * *"}
//
// BRIEF-CRON-OBSERVE-01 — tento beh vracal `{ sent: 0, failed: 0 }` rovnako
// pri „brief nemá nikto zapnutý" ako pri „všetkým zlyhalo doručenie", a po
// behu nezostala stopa (logy Vercelu tu prežijú asi hodinu). Odvtedy:
//   • každý beh nechá riadok v `cron_runs`,
//   • denník rozlišuje, či nastavenia neexistujú, alebo len nie sú zapnuté,
//   • beh, ktorý mal komu poslať a neposlal nikomu, vracia HTTP 500.
// ================================================================
import { NextRequest, NextResponse }     from 'next/server'
import { createAdminClient }             from '@/lib/supabase/server'
import { generateAndDeliverBrief }       from '@/lib/morning-brief/assemble'
import { cronHttpStatus, deriveCronStatus, recordCronRun, recordUnauthorizedCronRun, vercelCronSchedule, callerUserAgent } from '@/lib/ops/cron-run'
import {
  briefNobodyEnabledReason,
  summariseBriefDeliveries,
  type BriefDeliveryResult,
} from '@/lib/morning-brief/run-summary'

const JOB = 'morning-brief'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    // Odmietnutie požiadavky s cron hlavičkou musí po sebe nechať stopu, inak je
    // prázdna cron_runs nerozlíšiteľná od „cron vôbec nebežal". Hlavička JE len
    // rozlišovač, nie dôkaz — poslať ju vie ktokoľvek — preto sa do riadku
    // ukladá aj rozvrh a user agent a číta sa spolu s časom. Bez platného cron
    // výrazu v hlavičke sa nezapisuje nič a nerobí sa ani dotaz do DB.
    const schedule = vercelCronSchedule(request.headers)
    if (schedule) {
      await recordUnauthorizedCronRun(
        createAdminClient(), JOB, schedule, callerUserAgent(request.headers),
      )
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const supabase = createAdminClient()

  // Dva dotazy, nie jeden: bez celkového počtu by „0 zapnutých" znamenalo
  // zároveň „nastavenia neexistujú" aj „existujú, ale sú vypnuté".
  const [{ count: settingsRows, error: countErr }, { data: settings, error }] = await Promise.all([
    supabase.from('morning_brief_settings').select('profile_id', { count: 'exact', head: true }),
    supabase.from('morning_brief_settings').select('profile_id').eq('enabled', true),
  ])

  if (error || countErr) {
    const message = (error ?? countErr)!.message
    console.error('[morning-brief cron] settings fetch failed:', message)
    await recordCronRun(supabase, {
      job: JOB, status: 'failed', startedAt,
      firstError: `morning_brief_settings: ${message}`,
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }

  const scanned  = settingsRows ?? 0
  const eligible = settings?.length ?? 0

  if (eligible === 0) {
    const reason = briefNobodyEnabledReason(scanned)
    const logError = await recordCronRun(supabase, {
      job: JOB, status: 'empty', startedAt,
      scanned, eligible: 0, firstError: reason,
      detail: { settings_rows: scanned, enabled_rows: 0 },
    })
    return NextResponse.json({
      ok: true, status: 'empty', reason,
      settings_rows: scanned, sent: 0, failed: 0, profiles: [],
      run_log_error: logError,
      generated_at: new Date().toISOString(),
    })
  }

  const BATCH = 5  // conservative — brief delivery calls Resend email API
  const all: BriefDeliveryResult[] = []

  for (let i = 0; i < eligible; i += BATCH) {
    const batchResults = await Promise.all(
      settings!.slice(i, i + BATCH).map(async ({ profile_id }): Promise<BriefDeliveryResult> => {
        try {
          const result = await generateAndDeliverBrief(profile_id)
          if (result) {
            return {
              profileId: result.profileId,
              delivered: result.delivered,
              channels:  result.channels,
              error:     result.error,
            }
          }
          return {
            profileId: profile_id,
            delivered: false,
            channels:  [],
            error:     'generateAndDeliverBrief vrátilo null (profil alebo nastavenia sa nenačítali)',
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(`[morning-brief cron] profile ${profile_id} failed:`, message)
          return { profileId: profile_id, delivered: false, channels: [], error: message }
        }
      })
    )
    all.push(...batchResults)
  }

  const { written, failed, firstError } = summariseBriefDeliveries(all)
  const status = deriveCronStatus(eligible, written, failed)

  const logError = await recordCronRun(supabase, {
    job: JOB, status, startedAt,
    scanned, eligible, written, failed, firstError,
    detail: { settings_rows: scanned, enabled_rows: eligible },
  })

  // Pravidlo aj s dôvodom žije v cronHttpStatus(); tu sa len použije, aby obe
  // cron routes nemali každá svoju verziu.
  const httpStatus = cronHttpStatus(status, logError)

  return NextResponse.json({
    ok: status !== 'failed',
    status,
    settings_rows: scanned,
    sent:          written,
    failed,
    first_error:   firstError,
    profiles:      all,
    run_log_error: logError,
    generated_at:  new Date().toISOString(),
  }, { status: httpStatus })
}
