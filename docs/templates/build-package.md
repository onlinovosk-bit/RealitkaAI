# BUILD PACKAGE — štandard odovzdávania práce Cursoru (v1)

**Cieľová cesta:** `docs/templates/build-package.md`
**Pôvod:** Fable návrh 2026-07-26, upravený: 1 súbor namiesto 15, žiadne
nové agenty (cyklus mapovaný na existujúcich vlastníkov — viď
`product-roadmap-mapping-2026-07.md` + tabuľka v decisions).

## Kedy sa vyžaduje (tiering podľa klasifikácie v2)
- **Core Platform / Strategic Bet / čokoľvek s migráciou alebo novou
  capability → PLNÝ Build Package** (všetky sekcie nižšie).
- Workflow Capability → skrátený (Spec+Data+Acceptance+Premortem-mini).
- Cosmetic/malé PR → žiadny balík, stačí zadanie.
Pravidlo: balík píše Claude (VEOS compile), founder číta a dáva GO,
Cursor implementuje bez domýšľania. Chýbajúca sekcia = balík nie je hotový.

## Povinné sekcie (jeden .md súbor + MIGRATION.sql zvlášť)
1. **VISION & BUSINESS** — 3 vety: prečo, pre koho, väzba na North Star /
   zákazníka. User story.
2. **SPEC** — funkčné požiadavky (číslované, testovateľné) + nefunkčné
   (výkon, limity, tenant izolácia).
3. **ARCHITECTURE** — kde v systéme žije, integračné body (presné cesty
   z repo-first prieskumu), rozhodnutie o schedulери/vrstvе s dôvodom.
4. **DATA** — schéma (plné SQL v MIGRATION.sql), RLS, indexy, retencia.
5. **API/UI** — endpointy/kontrakty, UI zmeny, stavy.
6. **TESTING & ACCEPTANCE** — unit/integration/e2e zoznam + Definition of
   Done checklist (CI zelené, brain:check, registrácia v brain registry,
   dokumentácia aktualizovaná).
7. **PREMORTEM** — podľa `docs/templates/premortem.md`, kategórie rozšírené
   pre DB moduly o: MULTI-TENANT, ROLLBACK, MEMORY (kvalita zbieraných dát).
   Kópia do `docs/premortems/`.
8. **ROLLBACK** — presný postup späť: feature flag / revert poradie
   (kód pred DB!) / či je migrácia bezpečná ponechať (aditívna = áno).
9. **MONITORING** — ako sa dozvieme, že to v prode žije/zomrelo (heartbeat
   riadok, watchdog, metrika, log).
10. **MEMORY UPDATE** — čo po merge zapísať do brain/decisions (rozhodnutia
    s dôvodom) a aké review dátumy nastaviť.
11. **RELEASE CHECKLIST** — atomicity poradie (migrácia→schéma→deploy→smoke),
    founder brány, komu z zákazníkov čo oznámiť.

## Uzavretý cyklus (proces, nie softvér)
Constitution (brain/identity, rules) → Build Package (Claude/VEOS) →
Validácia (mapping tabuľka + brain:audit — duplicity/vlastníci) →
Premortem → founder GO → Cursor implementácia → Review + CI →
brain/decisions zápis → po čase outcome → prípadný lesson.
Každý krok má existujúceho vlastníka; žiadny nový agent sa nestavia
(brána 3 zákazníci platí).
