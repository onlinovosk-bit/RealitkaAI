# Open Tasks — Prioritized Queue

> Posledná aktualizácia: 2026-09-21 | Task-loop sync (/upgrade prod smoke FAIL → root cause)

## P0 — Billing /upgrade Stripe (revenue)

- [x] Merge #369 okResponse consumer fix → `30a1ba906`
- [x] Docs #586 prod smoke (deploy + anon gate) → `ed45d5188`
- [x] **HUMAN 30s smoke vykonaný 2026-09-21 — FAIL.** Prihlásený `/upgrade` zobrazuje
      „Checkout momentálne nedostupný" / „Stripe ceny pre seat alebo top-up balíčky nie sú
      nakonfigurované v tomto prostredí." Tlačidlo „Pokračovať do Stripe" sa nevykreslí.

### CHECKOUT-ENV-01 — seat/top-up Stripe price IDs chýbajú v produkcii

**Root cause (overený, nie hypotéza).** `/api/billing/checkout-config` vracia
`seatCheckoutAvailable=false`, lebo `areSeatCheckoutPricesConfigured()`
(`apps/crm/src/lib/program-tier-pricing.ts:314`) vyžaduje **všetky tri**
`STRIPE_PRICE_SOLO_SEAT` / `STRIPE_PRICE_TEAM_SEAT` / `STRIPE_PRICE_OFFICE_SEAT`.
Ani jedna z nich v projekte `realitka-ai` neexistuje (Vercel env dump 2026-09-21,
85 premenných, len názvy — hodnoty nedešifrované). To isté pre top-up:
`STRIPE_PRICE_CREDITS_{START,RAST,PRO,MEGA}` = MISSING.

Vercel produkcia má namiesto nich staré program-model price IDs:
`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MARKET_VISION`,
`STRIPE_PRICE_PROTOCOL_AUTH`, `STRIPE_PRICE_ONBOARDING`.

**Status:** OPEN — nie je to bug v kóde. `#369` opravil reálnu chybu (consumer
contract), ale symptóm v UI je identický pred aj po ňom, takže `#369` sa cez
produkčné UI nedá potvrdiť ani vyvrátiť, kým nie sú nastavené price IDs.

**Do not fix autonomously:** žiadny agent nesmie vytvárať ani hádať Stripe price
IDs. Musia existovať v Stripe účte a byť overené proti nemu.

**Founder gate:** GO REQUIRED na zápis env; rozhodnutie o modeli je uzavreté
(`DEC-20260921-001`, seat = kanonický).

**Poradie krokov (founder, 2026-09-21):**

- [ ] **A. Stripe VERIFY** — read-only. **Spusti:**
      `STRIPE_SECRET_KEY=sk_live_… bash scripts/ops/stripe-verify-prices.sh`
      (#622 — vypíše `N/9 resolved` a riadky `KĽÚČ=price_…` pripravené na env).
      **Ako čítať výsledok** a čo robiť pri každom výstupe:
      `docs/ops/2026-09-21-stripe-verify-kit.md` (#627 — rozhodovací strom,
      vyplňovacie tabuľky, pasca s founder cenou).
      Dva dokumenty vznikli paralelne v dvoch sessionoch a **nezávisle došli k
      tým istým deviatim objektom** — skript je nástroj, kit je sprievodca.
      **Objektov je 9, nie 3 a nie 5** (seat ×3 blokujú /upgrade; cockpit ×2
      neblokujú nič a preto sú nebezpečné; top-up ×4 sú samostatná brána).
      `_OWNER_COCKPIT_PRO` sa neoveruje — `enabled: false`.
- [ ] **B. Ak existujú** → env patch s reálnymi `price_…` ID (founder zapisuje)
- [ ] **C. Ak neexistujú** → STOP, samostatné GO na vytvorenie Stripe Products/Prices
- [ ] **D.** Vercel production env → deploy → prihlásený `/upgrade` smoke → Stripe Checkout
- [x] **E.** `/porovnanie-programov` cleanup — hotové 2026-09-23 (#647 → `fc381004`),
      viď `FUNNEL-PRICING-01` nižšie. Nemiešalo sa do D, ako bolo určené.

### FUNNEL-PRICING-01 — `/porovnanie-programov` vs. seat checkout pricing

`/porovnanie-programov` prezentuje programy 49 / 99 / 199 / 449 €/mes. a CTA
„Vybrať/Aktivovať", ale CTA vedie cez `/billing` k self-service seat checkoutu
79 / 71 / 63 € za makléra (`ProgramComparison.tsx:227,241,306`).

**Status: VYRIEŠENÉ 2026-09-23** (#647 → `fc381004`). Rozhodnutie padlo 2026-09-21
(`DEC-20260921-001`), vykonanie 2026-09-23. Popis nižšie je pôvodný nález; správanie,
ktoré opisuje, už neplatí.

**Risk:** zákazník môže očakávať nákup zvoleného programu, ale dostane iný
pricing/product model.

**Nie je to len copy nekonzistencia.** Produkčná Stripe konfigurácia stojí na
program modeli (`STARTER`/`PRO`/`MARKET_VISION`/`PROTOCOL_AUTH` = presne tie
49/99/199/449 tiery), zatiaľ čo kód `program-tier-pricing.ts` stojí na seat
modeli. `CHECKOUT-ENV-01` a `FUNNEL-PRICING-01` majú spoločný koreň: dva
obchodné modely, produkcia na jednom, kód na druhom.

**Rozhodnuté 2026-09-21 (`DEC-20260921-001`):** kanonický je **seat model**
(79 / 71 / 63 € na makléra). Programy typu Market Vision / Protocol Authority sú
**nadstavby**, nie alternatívny základný checkout. 49/99/199/449 € nesmie ostať
ako aktívny predajný funnel.

**Vykonané (`ProgramComparison.tsx`, #647):** zvolená bola druhá z dvoch schválených
ciest — informačná stránka, nie stiahnutie. Menej deštruktívne a cenník ostáva ako
informácia o roadmape.

- Štyri plan-CTA („Vybrať" / „★ Aktivovať") prestali byť odkazmi → statický badge
  **„Na roadmape"**, zhodný s vlastným bannerom stránky (`:167`). V kóde je komentár
  s dôvodom, aby to niekto nevrátil ako „chýbajúce CTA".
- Spodné CTA „Aktivovať program →" mierilo tiež na `/billing`. Teraz mieri na
  `/upgrade`: **„Kúpiť seaty — 79 / 71 / 63 € na makléra →"**.

**Overené na mergnutom `main`, nie na vetve:** `href="/billing"` má v súbore **nula**
výskytov; „Na roadmape" je `:237` (vnútri mapy cez všetky štyri plány); `/upgrade`
CTA je `:302-306`; `git diff d57eac1c origin/main` na tomto súbore je prázdny.

**Nedotknuté zámerne:** cenník 49/99/199/449 € ako roadmapa, banner `:167`, veta
o garancii a onboardingu (copy/legal rozhodnutie).

**Founder gate:** splnený — GO udelené 2026-09-22, merge foundera 2026-09-23.

### CHECKOUT-ENV-02 — Owner Cockpit sa zaplatí v UI, ale nie v Stripe

**Status: VYRIEŠENÉ kódom v #627 (`2936c56`).** Zostáva len env časť, ktorá je
súčasťou kroku A/B vyššie — cockpit ceny treba overiť a zapísať, ak ho chceš
predávať. Popis nižšie je pôvodný nález; správanie, ktoré opisuje, už neplatí.

**Čo sa zmenilo:** žiadny fallback medzi founder a štandardnou cenou (predtým
zákazník videl 249 € a zaplatil 349 €); `cockpit.ownerPurchasable` z
`/api/billing/checkout-config` gejtuje checkbox v `/upgrade`; fail-closed throw
v `buildSeatCheckoutSessionParams`; `metadata.founderCockpit` odráža účtovanie,
nie eligibility. Dôkaz: tri mutácie, každá zhasne svoj test.

**Pôvodný nález (historický):** `upgrade/page.tsx:225-234`
ponúka checkbox „Owner Cockpit (+X €/mes)" a pripočíta ho do zobrazenej sumy
(`:80`). Ale `buildSeatCheckoutSessionParams` (`credits-billing.ts:77-82`) pridá
cockpit line item **len ak** `getOwnerCockpitStripePriceId()` vráti neprázdnu
hodnotu — inak ho ticho vynechá, bez chyby.

`STRIPE_PRICE_OWNER_COCKPIT` aj `STRIPE_PRICE_OWNER_COCKPIT_PRO` sú v produkcii
**MISSING** (rovnaký env dump ako `CHECKOUT-ENV-01`).

**Prečo teraz:** dnes je to neviditeľné, lebo sa nikto nedostane ani k seat
checkoutu. Vo chvíli, keď sa nastavia **len** tri seat premenné a cockpit nie,
zákazník zaškrtne Owner Cockpit, uvidí vyššiu sumu a zaplatí **iba seaty**.
Tichý výpadok tržby plus rozpor ceny v momente platby.

**Founder gate:** GO REQUIRED na env zápis (spolu s krokom B). Code fix je
hotový.

**Upresnené 2026-09-21 (VERIFY kit §3) — horší variant než tichý výpadok.**
`isFounderKancelariaEligible()` je dnes `true` (7/20 voľných), takže UI zobrazí
founder cenu **249 €**, ale `getOwnerCockpitStripePriceId` spadne pri chýbajúcom
`STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` späť na `STRIPE_PRICE_OWNER_COCKPIT`
(349 €). Nastaviť **len** non-founder cenu znamená, že zákazník uvidí 249 € a
zaplatí 349 €. Navyše `metadata.founderCockpit` sa zapíše `"true"`, takže audit
stopa klame. Nie je to výpadok našej tržby, je to **preplatok zákazníka** —
prísnejší problém. `_OWNER_COCKPIT_PRO` sa neoveruje (`enabled: false`).

### RATCHET-API-CONTRACT-01 — 9 nových porušení zmluvy API routes je na `main`

**Status: OPEN.** Nájdené 2026-09-23 pri #647. Nie je to chyba #647 — je to dlh,
ktorý pristál cez #581 (concierge) a #579 (onboarding) a teraz sedí na `main`.

```
Porušení spolu:             540
V baseline (tolerované):    531
NOVÉ porušenia:             9
```

**Štrukturálna príčina, nie zábudlivosť.** `code-contract-guard.yml:14-18` beží
**iba na `pull_request`** s path filtrom `apps/crm/src/**`. Na push do `main`
nebeží vôbec. Dlh teda **neplatí ten, kto ho vyrobil** — zaplatí ho prvý ďalší
CRM PR. To bude pravdepodobne práve ten Stripe/`upgrade` PR po `CHECKOUT-ENV-01`.

Deväť porušení sú **tri rôzne triedy rizika**, nie jeden balík:

| # | trieda | routy | riziko |
|---|---|---|---|
| 5 | `@/lib/api-response` | concierge `callback`, `freebusy`, `properties` | mechanické, bez zmeny wire formátu |
| 4 | `@/lib/usage-metrics` | všetky štyri | **blokované rozhodnutím o billingu** |
| 2 | `@/lib/api-validate` | concierge `callback`, `onboarding/session` | reálna práca, vlastný PR |

**Tranža 1 je dokázateľne bezpečná.** `errorResponse(msg, status)` emituje presne
`{ ok: false, error: msg }` (`api-response.ts:13-22`); `okResponse(data)` emituje
`{ ok: true, ...data }` — spread, nie nesting (`:3-11`). Všetkých 17 call site-ov
v tých troch routách má presne tento tvar, takže náhrada je byte-identická na
drôte. Dôležité, lebo `concierge/*` konzumuje **widget na cudzom webe**.

**Tranža 2 je skutočný blocker.** `UsageMetricName` je uzavretý union šiestich
hodnôt (`usage-metrics.ts:31-38`) — `ai_openai_tokens`, `embedding_tokens`, tri
crony, `outreach_send`. Ani jedna nesedí na „prišiel concierge callback". Splniť
ratchet tam znamená **rozšíriť union**, čiže pridať nové názvy metrík do
`increment_usage_metric` RPC — tabuľky, z ktorej sa odvodzuje spotreba a reporting.
To je zmena billing modelu, nie refaktor.

Otázka *ktorá agentúra* má naopak odpoveď: `SYSTEM_USAGE_AGENCY_ID` (`:15-16`)
existuje presne pre spotrebu bez tenant kontextu a `RESERVED_CUSTOMER_AGENCY_IDS`
(`:19-21`) aktívne odmieta, aby ukazoval na platiaceho zákazníka.

Na `onboarding/session` je to navyše **GDPR otázka**: je to zámerne anonymná
capability-URL routa hardened pod `DEC-20260917-005` (`Referrer-Policy: no-referrer`).
Priradiť jej agency-keyed telemetriu znamená rozhodnúť, či sa anonymný prístup má
dať spätne spojiť s tenantom.

- [ ] **GO RATCHET-TRANCHE-1** — 3 súbory `concierge/*`, 17× `NextResponse.json`
      → `okResponse`/`errorResponse`. Ratchet 9 → 4. Neudelené.
- [ ] **Founder rozhodnutie** — rozšíriť `UsageMetricName` o metriky pre concierge
      a onboarding? Bez toho tranža 2 nejde.
- [ ] **GDPR gate** pre `onboarding/session` telemetriu (`gdpr-advisor`).

**STOP: nikdy nespúšťať `--write-baseline`.** Vyzerá to ako oprava, ale tých 9
porušení iba pohltí do tolerovaného dlhu — vrátane tých dvoch, ktoré sa medzitým
opravili (`Opravené od baseline: 2`). Stratili by sme jediný dôkaz, že ratchet funguje.

## P0 — Critical AUTH / tenant (2026-08-25 auth hunt)

- [ ] **GO FIX-HUBSPOT-ANALYZE-TENANT-GATE** — require non-null caller `agency_id` + matching lead agency before admin HubSpot sync / call-analyze persist (`docs/reports/2026-08-25-critical-auth-bug-hunt.md` #1–2)
- [ ] **GO FIX-CRON-SECRET-FAIL-CLOSED** — reject unset `CRON_SECRET` (`Bearer undefined`) on onboarding-dispatch / agency-scraping / related fail-open routes (#3); separate PR

## P0 — Critical correctness (2026-08-25 hunt)

- [ ] **GO FIX-CHECKOUT-AGENCY-ID** — refuse seat/top-up Stripe session when `profiles.agency_id` is null (`docs/reports/2026-08-25-critical-bug-hunt.md` #1)
- [ ] **GO FIX-GRANT-LEDGER-ORPHAN** — roll back ledger + fail webhook/cycle when agency balance update fails after grant insert (#2); separate PR
- [ ] **GO FIX-GMAIL-PULL-PAGING** — pageToken / persist seen ids; maxResults=25 loses older labeled mail (#3)
- [ ] **GO FIX-MATCHING-LIST-CAP** — recalculate must not DELETE-all then rebuild from silent 500 cap (#4; beyond #444)
## P0 — Onlinovo MCP (docs done, code STOP)

- [x] **ONL-MCP-001** feasibility tonight — `docs/onlinovo/ONL-MCP-FEASIBILITY.md`
- [ ] Founder: potvrdiť Shoptet tarif (Premium áno/nie)
- [ ] `GO ONL-MCP-002` — neudelené; žiadny gateway kód bez tejto frázy
- [ ] ONL-MCP-003/004 — neotvárať
## P0 — Onlinovo MCP (tonight wave, merge founder)

- [x] ONL-MCP-001 feasibility — #476
- [x] ONL-MCP-002 impl plan — #477
- [x] ONL-MCP-003 MVP `packages/mcp-onlinovo` — #478
- [x] ONL-MCP-004 Ruflo/Cursor stdio config + smoke
- [ ] Founder merge 476–478 + 004
- [ ] Live Shoptet mapping — až tarif + token mimo git (`GO ONL-MCP-SHOP-LIVE`)


## P0 — Search / workdesk (post #461)

- [x] Merge #461 topbar Hľadať (`47ec4852`)
- [x] **GO FÁZA A** + audit — merged #463 (`1cf82d32`)
- [ ] **GO SEARCH-PAGING** — (1) client filter vidí len načítanú stránku (`LEADS_PAGE_SIZE=50`); (2) globálna lišta pomenovaná ako lokálny filter (`SEARCH-TOPBAR-GLOBAL-VS-LOCAL`). Neštartovať bez tejto frázy. Preferencia: lišta = DB search, filter ostane na `/leads`.

## P0 — Action Center / Pricing (spec only)

- [ ] Merge spec PR (BO-A + BO-B docs) — **žiadny runtime**
- [ ] `GO IMPLEMENT PRICING V2` — neudelené; pred ním Stripe `tax_behavior` + volume discount zámer
- [ ] `GO IMPLEMENT ACTION CENTER V0` — neudelené; nezávislé od pricing

## P0 — Agent OS V0 blocked (baseline)

- [ ] **Push `feat/bridge-harness`** — 9 staged Phase 0 blobs from
      `docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`; then re-issue
      `GO IMPLEMENT V0`. Evidence:
      `docs/reports/2026-08-22-agent-os-v0-implementation-stop.md`

## P0 — Smolko (zákazník)

- [ ] **Voiceflow sprievodca na webe Reality Smolko** — získať prístup vlastníka do existujúceho Voiceflow projektu, vložiť canvas `docs/voiceflow/reality-smolko-property-guide-v1.md`, manuálne prejsť tri vetvy a publikovať. Nezakladať nový projekt ani CRM chatbot.
- [ ] **Gmail inbound dual-run** — #422 na main; Preview secrets + curl smoke (`docs/runbooks/gmail-pull-setup.md`); draft email v `docs/reports/2026-08-21-smolko-gmail-dual-run-next.md` — GO odoslať?
- [ ] 24–48 h dual-run; forward nevypínať bez GO

## P0 — Branch cleanup (NEEDS-EVIDENCE)

- [ ] **TASK-0003 evidence pack** — full clone, tip SHA N=N, backup refs, full cherry, edge policy
- [ ] Žiadny mass delete bez samostatného founder GO na pack

## P0 — Billing (done on main)

- [x] Merge #451 legacy unknown≠free
- [x] Merge #452 credits expire guard
- [ ] Close superseded #371 / #374 (ak ešte open)
- [ ] A1 remediation — only if `11111111-…` is real customer

## P0 — Dokončiť rozbehnuté (vykonávacie)

- [x] Brief 15 merge (#222 B1 reconcile, #227 K3b/c) — v `main`, CI zelené
- [x] PROD reconcile `?reconcile_processed=1` — updated=5, scanned=13, skipped=8 (párovanie OK)
- [x] **Push `memory/decisions.md`** + task-loop commits — pushnuté `35224b355`
- [x] **PROD cleanup** — audit `784691` smoke probe deleted (SELECT: verify=audit-fix-probe, 0 properties)
- [ ] **Externý cron** — agent: lokálny CRON_SECRET → PROD 401; overiť cron-job.org + Vercel Production secret (každých 5 min)

## P1 — Smolko / hodnota pre klienta

- [ ] **L99 Lead Factory** — founder GO na definíciu C0/C1/C2 (`docs/briefs/l99-lead-factory-initiative.md` §2); merací BO až potom
- [ ] **Smolko SLA otázka** — koľko nových dopytov na ocenenie stíha zavolať do 4 h (draft v premorteme 2026-08-14)

- [ ] **Guardian PROD smoke 5/5** — agent: login blocked (TEST_USER ≠ Smolko); skript `apps/crm/scripts/prod-guardian-smoke-once.mjs` pripravený
- [x] **PR #241** — merged (fixture-only disabled edit CTA)
- [ ] **Lemon Squeezy Share** — fungoval / nefungoval / pending
- [ ] **Tomáš** — dual export Realvia + Revolis? (Smolko live čaká)
- [x] **VALIDATE CLOSED:** Smolko Klienti CSV = duplikát 439 leadov + maklér; Dopyty neexportovateľné — **import nerobiť** (`memory/decisions.md` 2026-06-21)
- [ ] **K3 UI route** — banner/deck pre property (lib hotová, chýba `/app` route) — VALIDATE pred BUILD
- [ ] Realvia re-test od Bereczovej — delete + create/update export

## P2 — Realvia / ops

- [ ] Preskúmať ~8 `realvia_webhook_logs processed=false` (skipped bez property match — delete/unknown?)
- [ ] **Schema Guard** — agent: workflow_dispatch FAIL (secrets chýbajú v GitHub Actions)

## P3 — Product / tech debt (nie teraz ak nie P0/P1)

- [ ] Demo funnel v5 HTML schválenie
- [ ] Dead routes cleanup (po potvrdení)
- [ ] Staršie otvorené PR (#189, #191, #186…) — triage

## BRI — uzavreté rozhodnutie (2026-06-19)

- **Honest pending** pre 439 leadov — žiadny backfill, žiadny enrichment engine na prázdnych poliach
- Detail: `memory/decisions.md`, `docs/audit/bri-diagnostic.md`
