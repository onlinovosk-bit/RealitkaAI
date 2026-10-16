# Víkendové blokéry (16.–19. 10. 2026)

Zapísané 2026-10-16 ~16:55 UTC. Čísla sú označené.

## Stripe live kľúč

**Blokuje:** overenie live cien a akékoľvek založenie Price ID. **NEZMERANÉ** v tomto behu (`STRIPE_SECRET_KEY` v prostredí agenta nie je, Stripe MCP je needsAuth, verify skript sa nespúšťal).

Checklist pre foundera je v `docs/reports/STRIPE-GO.md` (PR #867). Agent ceny nezakladá a Vercel env nemení.

## #853 bez vety v diskusii

**ZMERANÉ:** PR #853 je CLOSED, `mergedAt` null, zavrel `onlinovosk-bit` 2026-10-16 05:41 UTC. Review komentáre 0, issue komentáre okrem Vercel bota 0. CI na ňom bolo zelené. Dôvod zavretia v diskusii nie je.

Menšia verzia bez zmeny HTTP a bez zápisu pri 401 je PR #868. Nie je to blokér ďalšej práce.

## #845 červené CI je zmena správania billingu

**ZMERANÉ** z logu run `38859549198`: `tests/integration/pricing-v2-e2e.test.ts` čaká `past_due`, dostane `active`, a ročná / office aktualizácia predplatného nesedí s očakávaným pásmom. Oprava by menila správanie webhooku. Víkendové pravidlo 7 to nenecháva na tichý merge. PR ostáva otvorený, agent ho neupravoval.

## PROD tabuľky

Migrácia v #866 **nie je aplikovaná**. Absencia `event_store` / `outreach_log` / `team_member_permissions` na PROD je v tomto behu **NEZMERANÉ** (`to_regclass` sa nespúšťal). Aplikáciu robí len founder.
