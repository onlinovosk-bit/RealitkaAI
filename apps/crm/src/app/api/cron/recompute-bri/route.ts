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
//
// BRI-CRON-OBSERVE-01 — prvý beh 2026-09-30 o 02:40 nezapísal ani jedno skóre
// a o 07:50 sa už nedalo zistiť prečo: runtime logy Vercelu tu prežijú asi
// hodinu a táto route vracala `{ ok: true, computed: 0 }` rovnako pri „nebolo
// čo počítať" ako pri „všetko zlyhalo". Odvtedy:
//   • každý beh nechá riadok v `cron_runs` (scanned / eligible / written /
//     failed / prvá chyba doslovne),
//   • beh, ktorý mal čo počítať a nezapísal nič, vracia HTTP 500, aby bol
//     v prehľade Cron Jobs červený a nie zeleno tichý.
// ================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/server'
import { batchRecomputeBRI }         from '@/lib/events/bri-score'
import { deriveCronStatus, recordCronRun } from '@/lib/ops/cron-run'
import { checkEngagementSignal, engagementMissingReason } from '@/lib/events/engagement-signal'

const JOB = 'recompute-bri'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  // Service-role, not the cookie client: a cron request carries no session,
  // so the cookie client reads `profiles` as anon and RLS returns nothing.
  const supabase = createAdminClient()

  try {
    // EVENTS-REVIVE-01 — bez jediného eventu dá RPC každému leadu tých istých
    // 12/100. Zapísať 514 rovnakých čísel do produkcie a tváriť sa, že je to
    // skóre pripravenosti kupujúceho, je vymyslené číslo (CLAUDE.md, 4).
    // Radšej nezapíšeme nič a povieme prečo.
    const signal = await checkEngagementSignal(supabase)

    if (signal.error) {
      // Nevedieť, či signál existuje, NIE JE to isté ako vedieť, že chýba.
      console.error('[recompute-bri cron] events probe failed:', signal.error)
      await recordCronRun(supabase, {
        job: JOB, status: 'failed', startedAt,
        firstError: `events probe: ${signal.error}`,
      })
      return NextResponse.json({ ok: false, error: signal.error }, { status: 500 })
    }

    if (!signal.present) {
      const reason = engagementMissingReason()
      console.warn('[recompute-bri cron]', reason)
      const logError = await recordCronRun(supabase, {
        job: JOB, status: 'empty', startedAt,
        firstError: reason,
        detail: { skipped: 'no_engagement_signal', event_rows: 0 },
      })
      return NextResponse.json({
        ok: true,
        status: 'empty',
        skipped: 'no_engagement_signal',
        reason,
        scores_computed: 0,
        run_log_error: logError,
        computed_at: new Date().toISOString(),
      })
    }

    // `account_status` does not exist on `profiles` — the column is `is_active`.
    // The old filter made this query error, `profiles` came back null, and the
    // route returned `{ computed: 0 }` without ever saying why (BRI-DEAD-PATH).
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true)

    if (profileErr) {
      console.error('[recompute-bri cron] profile fetch failed:', profileErr.message)
      await recordCronRun(supabase, {
        job: JOB, status: 'failed', startedAt,
        firstError: `profiles fetch: ${profileErr.message}`,
      })
      return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 })
    }

    const scanned = profiles?.length ?? 0
    let eligible = 0
    let written  = 0
    let failed   = 0
    let firstError: string | null = null

    const BATCH = 5
    for (let i = 0; i < scanned; i += BATCH) {
      const results = await Promise.all(
        profiles!.slice(i, i + BATCH).map(p => batchRecomputeBRI(p.id, supabase))
      )
      for (const r of results) {
        eligible += r.leads
        written  += r.computed
        failed   += r.failed
        firstError ??= r.firstError
      }
    }

    const status = deriveCronStatus(eligible, written, failed)
    const logError = await recordCronRun(supabase, {
      job: JOB, status, startedAt,
      scanned, eligible, written, failed, firstError,
      detail: { profiles_scanned: scanned },
    })

    // Beh, ktorý mal čo počítať a nezapísal nič, nie je úspech. HTTP 500 je
    // jediné, čo v prehľade Cron Jobs uvidíš bez toho, aby si sa pýtal DB.
    const httpStatus = status === 'failed' ? 500 : 200

    return NextResponse.json({
      ok: status !== 'failed',
      status,
      profiles_processed: scanned,
      leads_eligible:     eligible,
      scores_computed:    written,
      scores_failed:      failed,
      first_error:        firstError,
      // Keď zlyhá aj samotný denník, nesmie to zapadnúť — inak sme späť tam,
      // kde sa o behu nedá zistiť nič.
      run_log_error:      logError,
      computed_at:        new Date().toISOString(),
    }, { status: httpStatus })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recompute zlyhal.'
    console.error('[recompute-bri]', error)
    await recordCronRun(supabase, {
      job: JOB, status: 'failed', startedAt, firstError: message,
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
