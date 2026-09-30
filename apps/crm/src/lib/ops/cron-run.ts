// ================================================================
// Revolis.AI — cron_runs: trvalá stopa po jednom behu cronu
//
// BRI-CRON-OBSERVE-01. Runtime logy Vercelu tu prežijú asi hodinu, takže beh
// cronu o 02:40 sa ráno o 08:00 už nedá vyšetriť. Tento zápis je jediné, čo
// po behu zostane — preto nesie aj to, čo bolo na vstupe, nielen výsledok.
//
// Zápis je fail-soft: keď sa denník nepodarí uložiť, cron tým nespadne, lebo
// jeho úlohou je počítať skóre, nie logovať. Ale zlyhanie sa NEZAHODÍ — vráti
// sa volajúcemu, ktorý ho pošle v HTTP odpovedi. Ticho zahodená chyba je presne
// ten vzor, ktorý túto tabuľku vyvolal.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'

export type CronRunStatus = 'ok' | 'empty' | 'partial' | 'failed'

export interface CronRunRecord {
  job:         string
  status:      CronRunStatus
  scanned?:    number
  eligible?:   number
  written?:    number
  failed?:     number
  firstError?: string | null
  detail?:     Record<string, unknown>
  startedAt?:  Date
}

/**
 * Odvodí stav behu z čísel, aby ho každý cron nepomenúvaval po svojom.
 *
 *   nič na vstupe            → empty
 *   nič sa nezapísalo        → failed
 *   zapísalo sa, ale nie všetko → partial
 *   inak                     → ok
 */
export function deriveCronStatus(
  eligible: number,
  written:  number,
  failed:   number,
): CronRunStatus {
  if (eligible === 0)            return 'empty'
  if (written  === 0)            return 'failed'
  if (failed   >  0)             return 'partial'
  return 'ok'
}

/**
 * Zapíše jeden riadok do `cron_runs`. Vracia chybu namiesto toho, aby ju
 * pohltila; `null` znamená, že zápis prešiel.
 */
export async function recordCronRun(
  client: SupabaseClient,
  run:    CronRunRecord,
): Promise<string | null> {
  const startedAt = run.startedAt ?? new Date()

  try {
    const { error } = await client.from('cron_runs').insert({
      job:         run.job,
      status:      run.status,
      scanned:     run.scanned  ?? 0,
      eligible:    run.eligible ?? 0,
      written:     run.written  ?? 0,
      failed:      run.failed   ?? 0,
      // Postgres odmietne \u0000 v texte, a chybové hlášky z fetch vrstvy ho
      // občas nesú. Orežeme aj dĺžku — denník nemá byť skládka.
      first_error: run.firstError
        ? run.firstError.replace(/\u0000/g, '').slice(0, 2000)
        : null,
      detail:      run.detail ?? {},
      duration_ms: Math.max(0, Date.now() - startedAt.getTime()),
      started_at:  startedAt.toISOString(),
    })

    if (error) {
      console.error(`[cron_runs] zápis pre ${run.job} zlyhal:`, error.message)
      return error.message
    }
    return null
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[cron_runs] zápis pre ${run.job} vyhodil výnimku:`, message)
    return message
  }
}
