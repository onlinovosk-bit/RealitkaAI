// ================================================================
// Revolis.AI — má BRI z čoho počítať? (EVENTS-REVIVE-01)
//
// `compute_bri_score` sa šesťkrát odvoláva na `public.events`. Tá tabuľka má
// v produkcii 0 riadkov a merania 2026-09-30 ukázali, že náhrada za ňu
// neexistuje: z 19 tabuliek s `lead_id` má najlepšie pokrytie `decisions`
// (48 z 514 aktívnych leadov, posledný riadok jún) a `tasks` (41, z toho 11
// čerstvých). `activities` má lead_id len na 4 zo 191 riadkov.
//
// Dôsledok je aritmetický, nie názorový. Bez jediného eventu platí pre KAŽDÝ
// lead: recency 0, engagement 0, match 0, source spadne na COALESCE 40,
// decay 1.0 —
//
//   0·0,30 + 0·0,25 + 40·0,20 + 0·0,15 + 40·0,10 = 12
//
// Každý lead dostane 12/100. A aj pri najlepšom možnom zdroji (90) je strop
//
//   0·0,30 + 0·0,25 + 90·0,20 + 0·0,15 + 40·0,10 = 22
//
// pričom `getHotLeads` filtruje `bri_score >= 60`. Zoznam horúcich leadov je
// teda matematicky zaručene prázdny — nie „zatiaľ nikto nie je horúci".
//
// CLAUDE.md, smernica 4: nepripojený zdroj → čestný stav „computed from
// {source}", nikdy vymyslené číslo. 514 rovnakých dvanástok je vymyslené
// číslo. Kým nebude existovať signál, cron nezapíše nič a povie prečo.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'

/** Najvyššie skóre dosiahnuteľné bez jediného eventu (zdroj 90 + báza 40). */
export const BRI_CEILING_WITHOUT_EVENTS = 22

/** Prah, od ktorého `getHotLeads` považuje lead za horúci. */
export const BRI_HOT_THRESHOLD = 60

export interface EngagementSignal {
  present: boolean
  eventRows: number
  /** Chyba dotazu — odlišuje „signál chýba" od „nevieme, či chýba". */
  error: string | null
}

/**
 * Zistí, či `events` obsahuje čo i len jeden riadok.
 *
 * Pri chybe dotazu vracia `present: false` **a** chybu. Volajúci musí oboje
 * rozlíšiť: neschopnosť overiť signál nie je dôkaz, že signál chýba — to je
 * presne tá zámena, ktorá v tomto projekte stála štyri mesiace.
 */
export async function checkEngagementSignal(
  client: SupabaseClient,
): Promise<EngagementSignal> {
  const { count, error } = await client
    .from('events')
    .select('id', { count: 'exact', head: true })

  if (error) {
    return { present: false, eventRows: 0, error: error.message }
  }

  const rows = count ?? 0
  return { present: rows > 0, eventRows: rows, error: null }
}

/** Veta do denníka — musí sa dať prečítať o pol roka bez tohto kontextu. */
export function engagementMissingReason(): string {
  return (
    'public.events má 0 riadkov, takže BRI by každému leadu priradilo rovnakých ' +
    `12/100 (strop bez eventov je ${BRI_CEILING_WITHOUT_EVENTS}, prah pre horúci lead je ` +
    `${BRI_HOT_THRESHOLD}). Skóre sa nezapísalo zámerne — EVENTS-REVIVE-01.`
  )
}
