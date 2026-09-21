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

**Founder gate:** GO REQUIRED — závisí od rozhodnutia vo `FUNNEL-PRICING-01`
(ktorý model je kanonický). Nastavenie env premenných pred tým rozhodnutím by
zabetónovalo model, ktorý ešte nie je vybraný.

### FUNNEL-PRICING-01 — `/porovnanie-programov` vs. seat checkout pricing

`/porovnanie-programov` prezentuje programy 49 / 99 / 199 / 449 €/mes. a CTA
„Vybrať/Aktivovať", ale CTA vedie cez `/billing` k self-service seat checkoutu
79 / 71 / 63 € za makléra (`ProgramComparison.tsx:227,241,306`).

**Status:** OPEN — product/funnel decision required.

**Risk:** zákazník môže očakávať nákup zvoleného programu, ale dostane iný
pricing/product model.

**Nie je to len copy nekonzistencia.** Produkčná Stripe konfigurácia stojí na
program modeli (`STARTER`/`PRO`/`MARKET_VISION`/`PROTOCOL_AUTH` = presne tie
49/99/199/449 tiery), zatiaľ čo kód `program-tier-pricing.ts` stojí na seat
modeli. `CHECKOUT-ENV-01` a `FUNNEL-PRICING-01` majú spoločný koreň: dva
obchodné modely, produkcia na jednom, kód na druhom.

**Do not fix autonomously:** treba rozhodnúť, ktorý pricing model je kanonický.

**Founder gate:** GO REQUIRED pred zmenou pricingu alebo checkout funnelu.

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
