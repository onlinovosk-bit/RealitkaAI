import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';

/**
 * Competitor Watch — sledovanie cenových pohybov u konkurencie.
 *
 * STAV: zdroj dát NIE JE pripojený.
 *
 * Táto cesta doteraz posielala do Slacku alert „MARKET ALERT: Cenový skok!"
 * zostavený z natvrdo napísaného poľa v kóde (`Byt Centrum`, 155 000 → 149 000 €).
 * Žiadny dopyt, žiadny portál, žiadna história cien za tým nestáli. Founder teda
 * dostával vymyslené číslo, ktoré sa od skutočného alertu nedalo odlíšiť.
 *
 * Podľa `docs/architecture/master-data-sourcing-map.md` (ZHLUK 5 — realitné
 * portály) je zdroj pre pohyb cien označený ako 🟡 SIVÁ a ešte nie je získaný:
 * potrebuje partnerstvo/API s portálom, alebo scraping faktov inzerátu
 * s robots.txt, rate-limitom a zdokumentovaným balancing testom.
 *
 * CLAUDE.md §4 je v tomto bode jednoznačná: nepripojený zdroj → čestný stav
 * „computed from {source}", nikdy vymyslené číslo. Preto tu nie je žiadny alert.
 * Endpoint vracia svoj skutočný stav a mlčí, kým nebude na čom stavať.
 *
 * Až bude zdroj pripojený, alert ide cez `routeAlert` z `@/lib/alerts/router`
 * — nikdy priamo na webhook.
 */
export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Competitor Watch Agent', async () => {
    return NextResponse.json({
      success: true,
      state: 'not_connected',
      source: 'ZHLUK 5 — realitné portály (docs/architecture/master-data-sourcing-map.md)',
      alerts_sent: 0,
      reason:
        'Zdroj histórie cien nie je pripojený. Endpoint zámerne neposiela alert, ' +
        'aby sa k founderovi nedostalo číslo bez dátového podkladu.',
    });
  });
}
