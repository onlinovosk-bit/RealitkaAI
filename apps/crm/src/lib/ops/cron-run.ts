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
 * HTTP kód pre beh cronu.
 *
 * Kód je ZÁLOŽNÝ signál, nie hlavný — hlavný je riadok v `cron_runs`, ktorý
 * prežije aj po hodine, keď logy Vercelu zmiznú. Preto 500 len vtedy, keď beh
 * zlyhal A ZÁROVEŇ sa o tom nikam nezapísalo: vtedy je stavový kód jediné, čo
 * po behu zostane.
 *
 * Bezpodmienečné 500 tu bolo prvé a bolo nesprávne: porušovalo zmluvu, ktorú
 * drží dvanásť ďalších cronov a pinuje ju `tests/smoke.spec.ts` — „cron
 * s platným CRON_SECRET nevracia 500". V CI to spadlo na morning-brief, lebo
 * tam RESEND_API_KEY nie je nakonfigurovaný, takže doručenie legitímne zlyhá.
 */
export function cronHttpStatus(status: CronRunStatus, logError: string | null): number {
  return status === 'failed' && logError ? 500 : 200
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

// ================================================================
// CRON-ALIVE — odmietnutý cron nesmie byť neviditeľný
//
// Autorizácia je prvá vec v každej cron route, takže 401 nastane PRED akýmkoľvek
// zápisom. Runtime logy Vercelu tu prežijú asi hodinu. Dôsledok: keď je
// `cron_runs` ráno prázdna, nedá sa odlíšiť „Vercel cron nespustil" od „spustil
// a dostal 401, lebo CRON_SECRET nesedí". To sú dve úplne odlišné poruchy
// s dvoma odlišnými opravami — a presne na tomto sa 2026-10-01 zastavila
// diagnostika, keď desať tabuliek bolo prázdnych a nebolo čím rozhodnúť.
//
// Vercel posiela na každom cron requeste hlavičku `x-vercel-cron-schedule`
// (docs: vercel.com/docs/cron-jobs/manage-cron-jobs). 401 s touto hlavičkou
// preto nechá v `cron_runs` riadok. Bez hlavičky sa nezapisuje nič, takže
// náhodný skener tabuľku nemá ako zapĺňať; a keďže hlavička sa sfalšovať dá,
// zápis je zastropovaný na jeden riadok na job za hodinu.
// ================================================================

/** Hlavička, ktorou sa Vercel cron hlási. */
export const CRON_SCHEDULE_HEADER = 'x-vercel-cron-schedule'

/**
 * Hlavička s rozvrhom je ROZLIŠOVAČ, nie dôkaz: poslať ju vie ktokoľvek.
 * Riadok, ktorý z nej vznikne, je preto dôkazom len spolu s časom (padol do
 * okna svojho rozvrhu?) a s `user_agent` v `detail` (Vercel posiela
 * `vercel-cron/…`). Čítať ho inak znamená uveriť cudziemu vstupu.
 *
 * Tvar sa overuje PRED akýmkoľvek dotazom do DB: päť polí oddelených
 * mezerami, každé len z povolených znakov cronu. Náhodný reťazec tak
 * neautentifikovanému volajúcemu nekúpi ani jedno čítanie databázy.
 */
const CRON_FIELD = /^[-0-9*/,A-Za-z]{1,32}$/

/** Rozvrh z hlavičky, alebo null, keď to nie je platný cron výraz. */
export function vercelCronSchedule(headers: Headers): string | null {
  const raw = headers.get(CRON_SCHEDULE_HEADER)
  if (!raw) return null
  // Dlhý vstup zahodíme ešte pred delením — rozvrh je krátky výraz.
  if (raw.length > 120) return null
  const fields = raw.trim().split(/\s+/)
  if (fields.length !== 5) return null
  if (!fields.every((f) => CRON_FIELD.test(f))) return null
  return fields.join(' ')
}

/** User agent volajúceho, orezaný; do riadku patrí ako auditná stopa. */
export function callerUserAgent(headers: Headers): string | null {
  const ua = headers.get('user-agent')
  return ua ? ua.trim().slice(0, 200) : null
}

export const UNAUTHORIZED_CRON_ERROR = 'unauthorized: CRON_SECRET nesedí alebo chýba'

/**
 * Zapíše, že požiadavka s cron hlavičkou bola odmietnutá na autorizácii.
 * Vracia `true`, keď riadok vznikol, `false` keď sa preskočil.
 *
 * STROP JE NA (job, rozvrh), NIE NA JOB.
 * Prvá verzia mala jeden riadok na job za hodinu a to bola chyba, ktorú našiel
 * review pred mergom: cudzí volajúci s vymyslenou hlavičkou obsadil slot, a
 * skutočné odmietnutie od Vercelu sa v tej hodine už nezapísalo — pričom ten
 * falošný riadok vyzeral ako od Vercelu. Strop na ochranu pred zneužitím tak
 * vyrábal stratu práve toho dôkazu, pre ktorý tabuľka existuje.
 *
 * Kľúč (job, rozvrh) to odstraňuje: aby niekto preempoval riadok Vercelu, musel
 * by poslať presne ten rozvrh, ktorý beží, a aj tak zostane v riadku jeho
 * `user_agent`. Zneužitie je stále zastropované — jeden riadok na kombináciu
 * za hodinu.
 *
 * Fail-soft: chyba zápisu nesmie zmeniť 401 na 500, inak sa z observability
 * stane nová porucha.
 */
export async function recordUnauthorizedCronRun(
  client:    SupabaseClient,
  job:       string,
  schedule:  string | null,
  userAgent: string | null = null,
): Promise<boolean> {
  if (!schedule) return false

  try {
    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recent, error: lookupErr } = await client
      .from('cron_runs')
      .select('id')
      .eq('job', job)
      .eq('first_error', UNAUTHORIZED_CRON_ERROR)
      .eq('detail->>vercel_cron_schedule', schedule)
      .gte('started_at', sinceIso)
      .limit(1)
      .maybeSingle()

    // Nevedieť, či už riadok je, nie je dôvod zapísať druhý.
    if (lookupErr) {
      console.error(`[cron_runs] 401 lookup pre ${job} zlyhal:`, lookupErr.message)
      return false
    }
    if (recent) return false

    const error = await recordCronRun(client, {
      job,
      status:     'failed',
      firstError: UNAUTHORIZED_CRON_ERROR,
      detail:     {
        unauthorized: true,
        vercel_cron_schedule: schedule,
        // Vercel posiela `vercel-cron/…`. Nie je to autentifikácia — je to
        // stopa, podľa ktorej sa riadok dá pri čítaní posúdiť.
        user_agent: userAgent,
      },
    })
    return error === null
  } catch (err) {
    console.error(
      `[cron_runs] 401 zápis pre ${job} vyhodil výnimku:`,
      err instanceof Error ? err.message : String(err),
    )
    return false
  }
}
