// ================================================================
// Revolis.AI — zhrnutie jedného behu ranného briefu (BRIEF-CRON-OBSERVE-01)
//
// Cron o 06:00 vracal `{ sent: 0, failed: 0 }` rovnako pri „brief nemá nikto
// zapnutý" ako pri „všetkým zlyhalo doručenie". Prvé je stav, druhé je porucha,
// a z odpovede sa nedali rozlíšiť. To je ten istý vzor, ktorý BRI-CRON-OBSERVE-01
// (#757) zavrel na strane skóre.
//
// Naviac sa oplatí rozlíšiť ešte jednu vec, ktorú MORNING-BRIEF-DECIDE-01
// zmeral: `morning_brief_settings` má 0 riadkov a jediný komponent, ktorý ich
// vie vytvoriť (BriefSettings.tsx), sa nikde nevykresľuje. „Nikto to nemá
// zapnuté" preto môže znamenať dve úplne odlišné veci:
//
//   settingsRows = 0  → nikto si nastavenia ani nevytvoril (cesta je mŕtva)
//   settingsRows > 0, enabled = 0 → ľudia to majú, ale vypnuté (ich voľba)
//
// Denník musí uniesť oba, inak sa raz opäť bude hádať z prázdnej tabuľky.
// ================================================================

export interface BriefDeliveryResult {
  profileId: string
  delivered: boolean
  channels:  string[]
  error?:    string
}

export interface BriefRunSummary {
  written:    number
  failed:     number
  firstError: string | null
}

/**
 * Spočíta doručenia a podrží PRVÚ chybu doslovne.
 *
 * Bez nej zostane v denníku len počet, a „5 zlyhaní" bez dôvodu je rovnako
 * nepoužiteľné ako ticho.
 */
export function summariseBriefDeliveries(
  results: readonly BriefDeliveryResult[],
): BriefRunSummary {
  const summary: BriefRunSummary = { written: 0, failed: 0, firstError: null }

  for (const r of results) {
    if (r.delivered) {
      summary.written++
      continue
    }
    summary.failed++
    // Doručenie môže zlyhať aj bez chybovej hlášky (napr. profil bez e-mailu),
    // a to je stále zlyhanie — nesmie sa stratiť len preto, že nemá text.
    summary.firstError ??= r.error ?? `profil ${r.profileId}: doručenie zlyhalo bez chyby`
  }

  return summary
}

/**
 * Veta do denníka pre prípad, že brief nemá zapnutý nikto. Nesie rozdiel medzi
 * „nastavenia neexistujú" a „existujú, ale sú vypnuté".
 */
export function briefNobodyEnabledReason(settingsRows: number): string {
  return settingsRows === 0
    ? 'morning_brief_settings má 0 riadkov — brief si nikto nevytvoril. ' +
      'Komponent BriefSettings.tsx, ktorý ich jediný vie založiť, sa nikde ' +
      'nevykresľuje (MORNING-BRIEF-DECIDE-01), takže ho zapnúť ani nejde.'
    : `morning_brief_settings má ${settingsRows} riadkov, ale žiadny s enabled = true — ` +
      'brief je vypnutý voľbou, nie nedostupnosťou.'
}
