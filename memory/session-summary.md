## Session 2026-08-18

### Dokončené
- ZISTI: GPT Sol ↔ Opus 5 autonomous communication searched in repo + Cursor Cloud scope.
- Report: `docs/reports/2026-08-18-gpt-sol-opus5-comms-zisti.md`
- Verdict: not found in repo SSOT; likely external Notebook/chat unless founder supplies artifact.

### Rozpracované / Pending
- If founder wants to continue: draft canonical contract `docs/architecture/gpt-sol-opus5-autonomous-communication.md`.
- Do not implement autonomous model-to-model automation before contract + GO.

### Kľúčové súbory zmenené
- `docs/reports/2026-08-18-gpt-sol-opus5-comms-zisti.md`: evidence + next safe gate.
- `memory/session-summary.md`: current handoff.

### Ďalší krok
Founder GO: create contract draft for GPT Sol ↔ Opus 5 roles, transport, state machine, safety, and audit trail.
## Session 2026-09-21/22 (BUS runner 2D + bus do CI + cockpit price integrity)

### Dokončené
- **KROK 2D** (#617, merged `e6a2ddc`): always-on runner, 60 s poll loop s backoffom do 10 min,
  graceful shutdown, denný strop 100 vykonaní / 24 h rolling window
  (`packages/bus-core/src/execution-cap.ts`), blocker dedup bez zatvárania tasku.
  `handledTaskIds()` už nezapočítava blockery — raz odmietnutý task dostane druhú šancu.
- **Bus do CI**: `bus:typecheck` ako kroky v BUS jobe (#620, cudzia session),
  `bus:validate` ako krok (#622, `0cd66f3`). BUS job má teraz tri nezávislé stráže:
  runtime (testy), dáta (envelopes), typy. Každá overená zavedenou chybou, nie argumentom.
- `packages/bus-core/tsconfig.json` + `npm run bus:typecheck` (#617/#622).
- **Oprava rozsahu Stripe VERIFY** (#622): tri → **deväť** price objektov.
- `scripts/ops/stripe-verify-prices.sh` — kľúč z `STRIPE_SECRET_KEY`, nie z argumentu.
- Cockpit price integrity (#627, cudzia session) + zjednotenie stráže a gate na
  `isOwnerCockpitPurchasable` (#630, otvorené).

### Opravy predchádzajúcich záznamov v tomto súbore
- **„overit pät price objektov (seat x3 + cockpit x2)"** (blok 2026-09-21 revenue blocker)
  je **nesprávne v oboch smeroch**. Správne je **deväť**: seat ×3 + cockpit ×2
  (`OWNER_COCKPIT` + `OWNER_COCKPIT_FOUNDER`, **nie** `_PRO` — ten má `enabled: false`)
  + top-up ×4 (`areTopupCheckoutPricesConfigured` je samostatná brána).
  Dôvod, prečo na tom záleží: `checkoutAvailable` je **OR**, nie AND — po nastavení len
  troch seat cien banner zmizne, ale sekcia top-upov sa ticho nevykreslí.
- **„D2 (`bus:validate` ako CI krok) … stále otvorené"** už neplatí — zmergované v #622.

### Rozpracované / Pending
- **Stripe VERIFY ostáva na founderovi** — `bash scripts/ops/stripe-verify-prices.sh`
  s `STRIPE_SECRET_KEY`. 9/9 → krok B (env patch), akýkoľvek MISSING → krok C (STOP + GO).
- Produkčný env prečítaný znova 2026-09-21 večer: 85 premenných, päť `STRIPE_PRICE_*`,
  všetky zo starého program modelu. Seat/cockpit/top-up kľúče: **nula**. Bez zmeny.
- **Dve rozhodnutia z 2D** (`DEC-20260921-002`) čakajú: (a) blocker už task neumlčí natrvalo —
  zmena správania, nie prídavok; (b) task zaparkovaný stropom ostáva `NEEDS_FOUNDER`
  aj po uvoľnení 24 h okna, odparkuje ho founder.
- PR #630 otvorený, CI celá zelená vrátane Vercel preview.
- `bus:typecheck` v CI **nekontroluje** `.ai/bus` envelopes a `bus:validate` **nekontroluje** typy —
  sú to tri oddelené stráže, nie jedna.
- `typecheck-baseline` hlási 48 chýb oproti stropu 69; CI samo pýta zníženie stropu.
- 2E (read-only capabilities pod Policy B) nezačaté — vlastná GO brána.
- `TASK-BUS-RUNNER-2D` (#621) je adversariálny audit runnera, owner **cursor**, nie ja.

### Kľúčové súbory zmenené
- `packages/bus-core/src/execution-cap.ts`: nová policy vrstva denného stropu (bez fs/siete)
- `packages/bus-core/src/consumer.ts`: `handledTaskIds` ignoruje blockery, `reportedRefusals`
- `scripts/bus/consume.ts`: `runWatch`, `FileExecutionCounter`, SIGINT/SIGTERM
- `.github/workflows/saas-grade-pipeline.yml`: BUS job = Test + Validate envelopes + Typecheck
- `docs/reports/2026-09-21-upgrade-checkout-config-root-cause.md`: §VERIFY opravená na deväť
- `apps/crm/src/lib/credits-billing.ts`: cockpit stráž = rovnaký predikát ako UI gate

### Ďalší krok
Founder: Stripe VERIFY (deväť cien, nie päť). Bez toho sa `/upgrade` nepohne.

## Session 2026-09-21 (revenue blocker /upgrade — root cause + DEC seat model)
### Dokoncene
- Prod smoke `/upgrade` na prihlasenej session: **FAIL** — "Checkout momentalne nedostupny"
- Root cause overeny read-only: `STRIPE_PRICE_{SOLO,TEAM,OFFICE}_SEAT` a
  `STRIPE_PRICE_CREDITS_*` **neexistuju** vo Vercel `realitka-ai` (85 env, citane bez decrypt).
  Pritomne su STARTER/PRO/MARKET_VISION/PROTOCOL_AUTH = stary program model.
- Zistene, ze prod Stripe stoji na program modeli a kod na seat modeli — `CHECKOUT-ENV-01`
  a `FUNNEL-PRICING-01` su dva symptomy tej istej nedokoncenej migracie
- Novy nalez `CHECKOUT-ENV-02`: Owner Cockpit checkbox pripocitava cenu v UI
  (`upgrade/page.tsx:225-234`), ale line item sa ticho vynecha ak price ID chyba
  (`credits-billing.ts:77-82`) — vybuchlo by hned po nastaveni len troch seat premennych
- Founder GO: `DEC-20260921-001` — kanonicky je **seat model** 79/71/63 EUR na maklera
- PR #606 **MERGED** (`46a5769`), CI zelene
### Rozpracovane / Pending
- **Krok A (founder): Stripe VERIFY** — read-only curl pripraveny v reporte §VERIFY;
  overit **pat** price objektov (seat x3 + cockpit x2) proti akceptacnym kriteriam
  (7900/7100/6300 eur, recurring month, per-seat, active, live mode)
- Krok B env patch / krok C STOP+GO na vytvorenie cien — podla vysledku A
- Krok D deploy + prihlaseny smoke; krok E `/porovnanie-programov` cleanup (samostatne)
- `#369` nie je prod-verified ani v jednom smere (symptom identicky pred aj po)
- Cursor zamerne bez ulohy; `#537` (notification digest cross-tenant) drzany do zavretia revenue blockera
### Kluc subory zmenene
- `docs/reports/2026-09-21-upgrade-checkout-config-root-cause.md`: root cause + VERIFY kriteria + CHECKOUT-ENV-02
- `docs/reports/2026-09-18-upgrade-prod-smoke.md`: doplneny skutocny vysledok founder checku (FAIL)
- `memory/open-tasks.md`: CHECKOUT-ENV-01, CHECKOUT-ENV-02, FUNNEL-PRICING-01 + kroky A-E
- `memory/decisions.md`: DEC-20260921-001 (seat model kanonicky, VERIFY pred CREATE)
### Dalsi krok
Founder: spustit VERIFY curl s live Stripe klucom, poslat vystup. Podla neho krok B alebo C.
Ziadny agent nevytvara Stripe Products/Prices.

## Session 2026-09-21 (UPTM governance chain + BUS fix)
### Dokončené
- `uptm-runner` main `c9ae2aa`, 134 testov: PR #3 ústava CP+CC (P1–P14), #4 preregistrácia
  fabrication kritérií, #5 canonical `PASS/FAIL/UNKNOWN` resolver, #6 detektor (13 kontrol,
  34 acceptance cases), #7 zapojenie detektora do gate cesty
- `fabricated_market_data` / `fabricated_pnl`: `DECLARATIVE` → `PARTIAL` s dvoma zapísanými
  limitmi (`omission_bypass`, `local_consistency_only`); strop `PARTIAL`, nikdy `ENFORCED`
- Dve vlastné nadsadenia znížené po čítaní kódu: P5 a P11 `ENFORCED` → `PARTIAL`
- BUS: id/`created_at` integrity bug opravený, authority boundary ako executable invariant,
  107/107 testov (`cb1e7d8`, `47b243d`) — **nepushnuté, 403**
- Audit evidence #1: `SyntaxError` v `onlinovosk-bit-uptm` `uptm/risk.py:77` — 4 test moduly
  sa nenazbierali, teda `UNKNOWN`, nie `FAIL`
### Rozpracované / Pending
- **HUMAN:** doinštalovať Claude GitHub App pre `onlinovosk-bit/RealitkaAI` → push + PR
- **HUMAN:** BUS deploy podľa `docs/ops/bus-handshake-runbook.md` → synthetic handshake
- **HUMAN 30s:** Revolis P0 — prihlásený `/upgrade` → `checkout.stripe.com`
- Bez GO: `UPTM-002d` (omission bypass), `UPTM-002b` (CP failure reclassification), `UPTM-AUDIT`
### Kľúčové súbory zmenené
- `packages/bus-core/src/envelope.ts`: `idDateFor()` — id dátum z `created_at`, nie z hodín
- `packages/bus-core/src/http.ts`, `scripts/bus/cli.ts`: obe cesty používajú `idDateFor`
- `packages/bus-core/tests/authority-boundary.test.ts`: nový — invariant „správa je len súbor"
- `packages/bus-core/tests/envelope.test.ts`: dátumovo nezávislé guardy
### Ďalší krok
Founder: GitHub App pre RealitkaAI → push 2 commitov → PR → merge → až potom deploy BUS.
## Session 2026-09-21 (hranica autonómie zmeraná)
### Dokončené
- Overené proti GitHub API: #593 merged (`ab67567`, 2026-09-18 20:35:43Z), #594 merged (`afc6145`, 20:45:32Z) — krok „stabilizovať a mergnúť Consumer V1" je hotový
- Správa na BUS o merge #594: `bus/main` `0a2cbb6` → `17f30d4`, `.ai/bus/outbox/MSG-20260919-001-pr-594-merged.md`
- Zmeraná a zapísaná hranica autonómie (`memory/decisions.md`): obe strany vedia písať aj čítať, ani jedna sa nezobudí sama
- Rozhodnutie: hodinový monitor **nezapínať** — workaround, nie architektúra
### Rozpracované / Pending
- D1 (review #593) na SOL — post-merge review; nálezy patria do follow-up PR, nič neblokuje
- `TASK-20260918-001` visí v `.ai/bus/inbox` ako `open`, hoci consumer to vlákno už zodpovedal (`already_handled`) — neodpovedať znova, len hygiena fronty
- Pozorovanie bez overenia: `evidence.urls: "[object Object]"` v `MSG-20260918-001-d1-znovu-otvorene-...` — niekde `String(obj)` namiesto URL; zdroj nezistený
- Krok 2 (persistentný runner / poll loop) a krok 3 (SOL agent mimo ChatGPT) — obidva GO REQUIRED, neotvárať naraz
### Kľúčové súbory zmenené
- `memory/decisions.md`: zápis hranice autonómie + poradie ďalších krokov
### Ďalší krok
Bez GO nič. Krok 2 je ďalší v poradí, ale vyžaduje samostatné founder GO.

## Session 2026-09-19 → 2026-09-21 (Control Plane — CP-P0-4 merged, migrácia 20260817220000 overená)

### Dokončené
- **`GO CP-P0-4` — Control Contract. PR [#598](https://github.com/onlinovosk-bit/RealitkaAI/pull/598) zmergovaný** foundrom 2026-09-20 14:08 UTC (`09bdb74`, 28 súborov, +3 205 / −1). Prvá **implementačná** brána Control Plane; predtým boli všetky brány read-only alebo spec-only.
- **`packages/control-contract`** — nový balík, 19 sledovaných súborov (11 src modulov + 4 testovacie), **0 dependencies**, vynútené CI guardom. Mimo `apps/crm` zámerne: cron, `.ai/bus` a budúce služby musia vedieť importovať kontrakt bez CRM.
- **`ActionMetadata` registry — U-L uzavreté ako zdroj `reversible`.** 9 akcií. Dve pravidlá z neho robia nosný prvok, nie dokumentáciu: (1) akcia bez záznamu sa **nedá** autorizovať (fail-closed → `FORBIDDEN`), (2) **registry, nie volajúci, je pravda** pre `capability/reversible/externallyVisible/risk`. U-J je v ňom zapísané ako vynútiteľné pole: Resend `probable` + `retentionHours: 24`, Twilio Messages `unknown` ⇒ `deliveryGuarantee = at_least_once`.
- **`resolveAuthority` s OD-9 authority floor.** Čistá funkcia, policy ako dáta. `irreversible` → `APPROVAL_REQUIRED`, **nikdy** `FORBIDDEN`; test dokazuje, že founder approval nezvratný e-mail odomkne, a že policy podlahu nevie znížiť. OD-10 zostáva CONDITIONAL — `externallyVisibleOverride` existuje ako typ, cesta nie je implementovaná.
- **Runner so 6 fázami** (`OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT OUTCOME → LEARN`). Päť terminálnych stavov; každý okrem `no_observations`/`no_decision` vyrobí `OutcomeRecord` — I-006 vynútené štrukturálne. I-007 vynútené dvakrát: `applyApproval` nezmení `FORBIDDEN`, a runner **znovu vyhodnotí autoritu tesne pred ACT**.
- **Migrovaný `followup` agent** — `apps/crm/src/lib/agents/followup/controlled.ts`, `RECOMMEND`, jediná akcia `followup.draft`, nikdy neposiela. `POST /api/followup` **nedotknuté**. Record ids sa odvodzujú z `correlationId`, nie z `runId` ⇒ retry prepočíta rovnaký idempotency key.
- **Nová CI job `Control Contract (authority + closed loop)`** — Node 22, bez ephemeral DB, s guardom na nulové dependencies. Autoritný engine je zelený nezávisle od toho, či CRM job vie naštartovať Supabase. Testy: 56 v balíku (`node --test`, bez inštalácie) + 11 vitest.
- **Suitability report (OD-8)** — `docs/reports/2026-09-19-CP-P0-4-followup-suitability.md`. Verdikt **SUITABLE so štyrmi podmienkami**.
- **`GO MIGRATION-VERIFY`** (2026-09-19) — read-only kontrola migrácie `20260817220000`. Zistené: **aplikovaná len spolovice** — `profiles.is_platform_admin` + index áno, `leads.last_contact_at` / `bri_score` / `dossier` nie, riadok v histórii chýbal, `schema_migrations` = 49.
- **`GO MIGRATION-VERIFY-2`** (2026-09-21) — po ručnom dobehnutí cez Dashboard. Výsledok nižšie.

### Opravené / korigované
1. **„Registry je pravda, nie volajúci."** §3.4 CP-SPEC bral `reversible` z `AuthorityContext`, teda **od volajúceho**. Agent, ktorý by svoj nezvratný send vyhlásil za zvratný, by prešiel popod OD-9 podlahu — celý authority engine by bol dekorácia. Oprava: `resolveAuthority` znovu prečíta registry a pri nezhode vráti `FORBIDDEN` (`context_registry_mismatch`). Pokryté testami.
2. **Root cause 240 decisions / 0 outcomes.** Doterajší zápis viedol I-006 ako porušený invariant bez príčiny. Jeden read-only SELECT na PROD ju dokázal: **240 decisions cez 48 distinct leadov = presne 5 na lead**, a **0** z tých 48 leadov nikdy nedosiahlo terminálny status. `resolveOpenDecisionsForLead` sa volá jedine z `PATCH /api/leads/[id]:150` a jedine pri terminálnom statuse. **Outcome writer nie je pokazený — nikdy nebol dosiahnuteľný.** Dva štrukturálne nálezy: agent nemá vlastný terminálny stav (F-1) a nemá idempotenciu (F-2).

### MIGRATION-VERIFY-2 — výsledok (read-only, PROD `ypgajkhqtbriqqmyawyv`)
- Migrácia **`20260817220000` je na PROD kompletná**: všetky 3 stĺpce `leads` + `profiles.is_platform_admin` + oba indexy, definície sedia. `leads.last_contact` (text, NOT NULL) nedotknuté.
- **`schema_migrations` = 50**, riadok `20260817220000` prítomný s menom `p0_schema_alters_leads_profiles`. **Táto migrácia je overená.**
- **Drift sa tým NEZATVÁRA: 50 migration rows vs 103 migration files v repe.** Táto migrácia pokryla jednu položku, nie ten rozdiel.
- 509 leadov: `last_contact_at` populated = **0**, `bri_score != 0` = **0**, `dossier` populated = **0**. Stĺpce existujú, dáta v nich nie sú.
- **Riziko `42703` je odstránené** — `lib/operator/gather.ts` už nemá na čom spadnúť.
- **Význam NULL výsledku v Operator konzumentovi je stále UNKNOWN.** `gather.ts:116` robí `.gte("last_contact_at", cutoff14d)`, čo na samých NULL vráti prázdno. Či sa to prejaví ako poctivé „unavailable" alebo ako číslo `0` (teda tvrdenie „žiadny kontakt" namiesto „nevieme"), **nebolo overené**. Nesmie byť prezentované ako potvrdený bug.
- Vedľajší efekt: týmto je zodpovedaná brána **G4** zo session wrap-upu 2026-09-20 (#600), ktorá žiadala presne toto read-only overenie.

### Rozpracované / Pending
- **CP-P0-4 acceptance #4 a #5 — persistence.** Uzavretá slučka je dokázaná v procese a v testoch (9 eventov, jeden `correlation_id`), **nie je perzistovaná**. Spine v2 stĺpce na PROD neexistujú. Zápis control eventov do dnešného `platform_events` bez v2 stĺpcov by vyrobil ten tichý-v1 stav, na ktorý existuje I-014.
- **U-J — Twilio idempotency.** Otvorené. `Idempotency-Key` je doložená pre Conversations Orchestrator a Monitor Alarms, **nie pre Messages create**, ktoré Revolis reálne volá. Dovtedy SMS/WhatsApp = at-least-once. *(U-K je RESOLVED produkčným precedensom `public.spend_credits`. U-L je RESOLVED a vedené ako **P1**, nie otvorený P0.)*
- **U-M** — prečo follow-up cron spravil presne 5 behov a 25. 6. prestal. Vyžaduje Vercel cron históriu, nedostupnú z agentskej session.
- **U-N** — či tých 48 leadov malo dosiahnuť terminálny status. Interpretácia klientskych dát, mimo architektonickej kontroly.
- **Migration drift 50 / 103.** Schéma sa mení mimo histórie, takže `schema_migrations` nie je spoľahlivý zdroj pravdy o PROD schéme.
- **F-3 až F-6 zo suitability reportu.** F-3 `estimatePrediction` vracia literály (0.22/0.18, 420/310, 0.62/0.55) — prenesené nezmenené s provenance, nie vylepšené. F-4 `POST /api/followup` je jednotenantný konštantou (`FOLLOWUP_AGENCY_ID = DEMO_AGENCY_ID`). F-5 `buildDraftBody` má meno referenčného klienta natvrdo v každom drafte pre každého tenanta (multi-tenancy bug + Stealth Mode). F-6 `capabilities/_shared/audit-log.ts` je druhá in-memory diera po I-008.
- **`last_contact_at` zostáva prázdny** (0 / 509).
- **Interpretácia prázdneho `last_contact_at` v Operatore = UNKNOWN**, viď vyššie.

### Kľúčové súbory zmenené
- `packages/control-contract/**`: nový balík — kontrakt, registry, authority engine, runner, 4 testovacie súbory
- `apps/crm/src/lib/agents/followup/controlled.ts`: migrovaný agent (RECOMMEND, `followup.draft`)
- `apps/crm/src/lib/control-plane/run-context.ts`: platformová továreň na `RunContext` (agent si ju nesmie vyrobiť sám)
- `apps/crm/src/lib/agents/followup/__tests__/controlled.test.ts`: dôkaz uzavretej slučky, I-011/I-012/I-009
- `.github/workflows/saas-grade-pipeline.yml`: nová job `Control Contract (authority + closed loop)`
- `apps/crm/tsconfig.json`, `apps/crm/vitest.config.js`: alias `@revolis/control-contract`
- `docs/reports/2026-09-19-CP-P0-4-followup-suitability.md`: read-only suitability check + root cause 240/0
- `memory/decisions.md`: záznam CP-P0-4

### Ďalší krok
**`GO CP-P0-1A`** (Safe Spine Foundation) — primárna ďalšia brána. Bez nej sa acceptance #4/#5 nedajú dokončiť. Pred implementáciou treba presne vyriešiť, čo durable persistence znamená, lebo práve to blokuje event-spine A. Rozsah: A1 kanonická v2 schéma · A2 `scope` diskriminátor · A3 tenant isolation · A4 correlation/causation/run sémantika · A5 idempotency · A6 versioning · A7 invariant enforcement · A8 migration ownership. **Žiadny produkčný PII backfill** — to je CP-P0-1C.
`CP-P0-2` (durable approvals) zostáva ako **alternatívny následný** gate — nie je vykonaný ani aktuálny a neotvára sa súbežne, aby nevznikli dve meniace sa P0 osi naraz.

## Session 2026-08-25
### Dokončené
- Critical bug hunt (correctness): 4 HIGH/CRITICAL — `docs/reports/2026-08-25-critical-bug-hunt.md`
- Critical AUTH hunt: 3 HIGH — HubSpot/analyze null-agency admin IDOR; cron `Bearer undefined` fail-open — `docs/reports/2026-08-25-critical-auth-bug-hunt.md`
### Rozpracované / Pending
- `GO FIX-HUBSPOT-ANALYZE-TENANT-GATE` — require caller agency before admin sync/persist
- `GO FIX-CRON-SECRET-FAIL-CLOSED` — `if (!cronSecret)` on fail-open cron/admin routes
- `GO FIX-CHECKOUT-AGENCY-ID` — refuse seat/top-up when `agency_id` null
- Grant ledger orphan / gmail 25-cap / matching 500-cap (sibling report)
### Kľúčové súbory zmenené
- `docs/reports/2026-08-25-critical-auth-bug-hunt.md`: auth/tenant hunt
- `docs/reports/2026-08-25-critical-bug-hunt.md`: correctness hunt (prior commit)
### Ďalší krok
Founder `GO FIX-HUBSPOT-ANALYZE-TENANT-GATE` (1 PR); do not bundle cron fail-closed.

## Session 2026-08-24
## Session 2026-09-16 (critical bug hunt — sales-funnel admin gate)
### Dokončené
- HIGH: sales-funnel update-status + page lacked platform-admin gate → fix + tests + report
- MEMORIES: removed merged #559; remaining open tracked PRs unchanged
### Rozpracované / Pending
- Founder merge sales-funnel platform-admin PR
- Residual: saas_leads RLS still open at DB layer
- Noted (not fixed): team/users INSERT RLS hole; management SSR unscoped lists
### Kľúčové súbory zmenené
- `apps/crm/src/app/api/sales-funnel/update-status/route.ts`: requirePlatformAdmin
- `apps/crm/src/app/(dashboard)/sales-funnel/page.tsx`: notFound for non-admins
- `apps/crm/src/lib/sales-funnel-store.ts`: scoped listSaasLeads/getSalesFunnelData
### Ďalší krok
Founder: review/merge sales-funnel admin gate; next candidate team/users INSERT or saas_leads RLS (GO).
## Session 2026-09-18 (/upgrade Stripe revenue-blocker)

### Dokončené
- #369 rebasnuté na main + squash merge → `30a1ba906` (`data.result?.url` + `d.seatCheckoutAvailable`)
- #586 docs prod-smoke evidence → `ed45d5188` na main
- Vercel `realitka-ai` Ready pre merge SHA; anon `GET /upgrade` → 307 `/login` (očakávané)

### Rozpracované / Pending
- **Jediné otvorené:** human 30s — prihlásený klik `/upgrade` → `checkout.stripe.com` (agent nemá prod session)
- Ak PASS → uzavrieť `docs/reports/2026-09-18-upgrade-prod-smoke.md` ako PASS; ak FAIL → druhý nález pod tým istým CTA

### Kľúčové súbory
- `apps/crm/src/app/(dashboard)/upgrade/page.tsx` — okResponse consumer fix
- `apps/crm/tests/verification/billing-credits.verification.test.ts` — flattened contract lock
- `docs/reports/2026-09-18-upgrade-checkout-okresponse-fix.md`
- `docs/reports/2026-09-18-upgrade-prod-smoke.md`

### Ďalší krok
Founder: prihlás sa na app.revolis.ai → `/upgrade` → „Pokračovať do Stripe“.
## Session 2026-09-18c (critical bug hunt — assign-lead agency)
### Dokončené
- HIGH: assignLeadToProfile cross-tenant profileId stamp → fix + tests + PR #596
- MEMORIES cleanup: deleted merged #369 #537; recorded #596
- Report: `docs/reports/2026-09-18-assign-lead-cross-tenant.md`
### Rozpracované / Pending
- Review/merge #596; open stack still awaiting: #370 #443 #444 #447 #462 #486 #490 #495 #545 #563 #582
### Kľúčové súbory zmenené
- `apps/crm/src/lib/team-store.ts`: same-agency gate on assignLeadToProfile
- `apps/crm/src/lib/__tests__/assign-lead-same-agency.test.ts`: unit coverage
- `apps/crm/tests/verification/assign-lead-same-agency.verification.test.ts`: live-spec
### Ďalší krok
Founder: review/merge #596; next candidate matching recalculate wipe (#444) or HubSpot fail-open (#486).
## Session 2026-09-18c (Founder Control Plane — päť read-only brán, PR #585 merged)

### Dokončené
- **Brána 1 — konfrontácia tézy s repom.** `docs/architecture/founder-control-plane-v1-repo-confrontation.md`. Ústava dala **dva verdikty, nie jeden**: Control Plane ako produktová plocha = 4/12 + veto Q8 (príliš skoro) + veto Q1 (klient nezaplatí) → **STRATEGIC BACKLOG** (ADR-004 prah „Center: 5 platiacich"; dnes 1). Control Plane substrát → **BUILD**, rezaný na 4 kusy.
- **Brána 2 — `GO CP-EVIDENCE`.** `docs/reports/2026-09-18-CP-EVIDENCE-REPORT.md`. Read-only PROD audit (`ypgajkhqtbriqqmyawyv`, 08:58–09:05 UTC). Uzavrel P0 otvorené od 17. 8.: **`leads.last_contact_at` na PROD NEEXISTUJE** (len `last_contact` text) → `lib/operator/gather.ts` dá 42703. Ďalej: `lead_events` = 0 riadkov · `decisions` 240 / `exclusivity_outcomes` 0 · migrácia `20260728140000` nie je v `schema_migrations` (49 history riadkov vs 102 súborov v repe).
- **Brána 3 — `GO U1`.** `docs/reports/2026-09-18-U1-lead-events-write-path-report.md`. Root cause **PROVEN** (nižšie).
- **Brána 4 — `GO CP-SPEC` + `GO CP-SPEC-HARDEN`.** `docs/architecture/founder-control-plane-cp-spec-v1.md`, v1.1, `status: hardened-draft`, 1 299 riadkov. Desať rozhodnutí D-01..D-10, FINAL INVARIANT REGISTER I-001..I-015, 27 adversariálnych testov, dvojosová GO matica.
- **Brána 5 — `GO PROVIDER-IDEMPOTENCY-EVIDENCE` + `RPC-TRANSACTION-EVIDENCE` + `REVERSIBILITY-EVIDENCE`.** `docs/reports/2026-09-18-U-JKL-evidence-report.md`.
- **PR [#585](https://github.com/onlinovosk-bit/RealitkaAI/pull/585) zmergovaný** foundrom. Po ceste: merge konflikt v `memory/decisions.md` (append-only log, zachované obe strany), jeden CI beh spadol na externý GitHub API rate limit pri `supabase/setup-cli@v1` `version: latest` (re-run na tom istom commite prešiel), jeden push nedostal `pull_request` event a CI sa spustilo ručne cez `workflow_dispatch`.

### Tri vyvrátené / korigované tvrdenia (CP-EVIDENCE vs konfrontácia)
1. **`ai_action_audit` nemá cost stĺpce.** Tvrdenie pochádzalo z kódu (`lib/ai-action-audit.ts:83`), nie zo schémy. Na PROD `cost_eur`, `credits_spent`, `model`, `latency_ms` neexistujú.
2. **cost → outcome nie je „jeden view".** 0/146 riadkov má cost (ani v stĺpci, ani v `meta`), 0/146 má `lead_id` (`lib/ai/persist-cost-telemetry.ts:66` píše `null` natvrdo), `lead_conversions` na PROD neexistuje, `deal_outcomes` = 1 riadok.
3. **`public.events` = 0 riadkov.** Reálny produkčný spine je `platform_events` — 1 417 riadkov, 2026-04-12 → 2026-09-15, **100 % vyplnené `agency_id`**.

*(Štvrtá korekcia prišla až v U1 a týka sa CP-EVIDENCE: `platform_events.payload` **obsahuje osobné údaje** — trigger zapisuje `'name', new.name`. Predchádzajúci záver „PII neobsahuje" bol nesprávny.)*

### PROVEN root cause — `lead_events` = 0
`lead_events` sa v produkcii nezapisuje, pretože v `apps/crm/src` **neexistuje produkčný caller/writer** pre `POST /api/ai/lead-events` a endpoint je navyše **Enterprise-gated** (`isEnterpriseSalesIntelligenceEnabled()` → 403; žiadna zo 6 agentúr na PROD nemá plán `enterprise`). Produkčné eventy namiesto toho vznikajú **cez DB trigger** `trg_leads_platform_events` → `emit_platform_event()` → `platform_events`.

Vylúčené samostatným meraním: RLS (`with_check` insert povoľuje) · schema (PROD == migrácia `20260418`, žiadny drift) · tiché zlyhanie (route vracia 400/403) · zápis inam. Nezávislé potvrdenie: celý Enterprise klaster prázdny (`lead_events`, `lead_scores`, `client_dna`, `deal_moments`, `ai_recommendations` = 0 riadkov každá).

Vedľajší nález: trigger ani `emit_platform_event` **nie sú v žiadnej repo migrácii** — repo to priznáva v `20260509000000_rls_lead_scores.sql:9`.

### Dve opravené chyby v CP-SPEC (hardening v1.0 → v1.1)
1. **Nezvratnosť ≠ `FORBIDDEN`.** v1.0 mapovalo `risk = irreversible` na `FORBIDDEN`, čo podľa I-007 znamená „ani s ľudským schválením" — agent by teda nikdy nesmel odoslať e-mail. Oprava: nezvratnosť je **minimálna podlaha autority = `APPROVAL_REQUIRED`**, ktorú policy nesmie znížiť; `FORBIDDEN` je výhradne explicitný DENY_LIST. Zapísané ako **OD-9**.
2. **Kanonický počet stĺpcov.** v1.0 uvádzalo „ADD COLUMN × 8" proti 11 stĺpcom v cieľovej schéme. Opravené novou kanonickou tabuľkou §4.2.1: **v1 = 5 + v2 = 12 → spolu 17**.

### Tri neznáme otvorené hardeningom a ich stav po evidence reporte
Prevzaté presne z `docs/reports/2026-09-18-U-JKL-evidence-report.md`.

| Neznáma | Priorita pri otvorení (CP-SPEC §14) | Stav po evidence reporte |
|---|---|---|
| **U-J** Resend idempotency | P0 | **PROBABLE — nie RESOLVED** (primárny zdroj nedostupný) |
| **U-J** Twilio idempotency | P0 | **UNKNOWN — REQUIRES VERIFICATION** |
| **U-K** RPC transakčná atomicita | P0 | **RESOLVED** — dokázané produkčným precedensom |
| **U-L** zdroj `reversible` | **P1** (nie P0) | **RESOLVED ako neexistujúci** — registry treba vytvoriť |

- **U-J:** egress proxy blokovala `resend.com`, `www.twilio.com`, `cdn.jsdelivr.net` aj `docs.postgrest.org`; `node_modules` nebolo nainštalované. Podľa AP-005 preto nevyhlásené RESOLVED. Twilio `Idempotency-Key` je doložená pre Conversations Orchestrator a Monitor Alarms, **nie pre Messages create**, ktoré repo reálne volá → SMS/WhatsApp = **at-least-once**. Resend drží kľúč **24 h**, čo je kratšie než životnosť nášho deterministického `idempotencyKey`.
- **U-K:** `public.spend_credits` (plpgsql, SECURITY DEFINER, cez `supabase.rpc()`) robí v jednom volaní idempotency check → `SELECT ... FOR UPDATE` → 2× INSERT do `credit_ledger` → UPDATE `agencies`. Spravuje peniaze; navrhované `T1` teda nie je nový vzor.
- **U-L:** grep na `reversible|irreversible|nezvratn|undoable|can_undo` naprieč `apps/crm/src` = **0 zásahov v kóde**. Návrh: `ActionMetadata` registry v `packages/control-contract`.

### Rozpracované / Pending
- **`CP-P0-4` Control Contract** — GO možné, čaká na explicitný founder GO. Súčasťou je `ActionMetadata` registry (U-L).
- **`CP-P0-2` Durable Approvals** — GO možné; rieši dnes porušený I-008.
- **`CP-P0-1` rozdelené na A/B/C** (OD-4 + founder rozhodnutie): **A** Safe Spine Foundation (GO možné) · **B** Event Production (blokované U-A/U-B/U-C/U-D) · **C** Historical/Legacy Migration vrátane `PII-SCRUB-BACKFILL` (nezvratné, NO-GO).
- **OD-10 CONDITIONAL** na U-J/U-K/U-L — blokuje len override cestu, nie default `APPROVAL_REQUIRED`.
- **Tri invarianty sú dnes porušené:** I-006 (240 decisions / 0 outcomes) · I-008 (approvals v `new Map()`) · I-011 (1 417 riadkov s menami v payloade).
- **Migrácia `20260817220000`** (#437, PREP ONLY) pridáva `leads.last_contact_at`, `bri_score`, `dossier`, `profiles.is_platform_admin`. Merané 20:51 UTC: **na PROD stále neaplikovaná**, history row chýba, `schema_migrations` = 49. Founder ju aplikuje cez Dashboard SQL Editor.
- **Vercel deployment rate limit** (`api-deployments-free-per-day`, >100/deň) — preview deploymenty nefungujú ~24 h od 18. 9. 20:11 UTC. Nesúvisí s kódom.
- **`GO CI-PIN-SUPABASE`** — patch na pripnutie verzie `supabase/setup-cli` navrhnutý, nepushnutý; samostatný PR.

### Kľúčové súbory zmenené
- `docs/architecture/founder-control-plane-v1-repo-confrontation.md`: nový — konfrontácia tézy s repom, [EXISTING]/[DESIGNED]/[TARGET]
- `docs/reports/2026-09-18-CP-EVIDENCE-REPORT.md`: nový — read-only PROD audit, tri opravy konfrontácie
- `docs/reports/2026-09-18-U1-lead-events-write-path-report.md`: nový — PROVEN root cause `lead_events` = 0
- `docs/architecture/founder-control-plane-cp-spec-v1.md`: nový — CP-SPEC v1.1 hardened-draft
- `docs/reports/2026-09-18-U-JKL-evidence-report.md`: nový — U-J/U-K/U-L evidence
- `memory/decisions.md`: +6 záznamov vrátane OD-1..OD-10 a rozdelenia CP-P0-1 na A/B/C

### Ďalší krok
**`GO CP-P0-4`** — Control Contract. Poradie v rámci brány: `ActionMetadata` registry → `resolveAuthority` + testy → typy kontraktu → read-only suitability check na `lib/agents/followup` → migrovaný agent ako dôkaz uzavretej slučky (Definition of Done, OD-8).

## Session 2026-09-18b (D1 = GO — dogfood transport rozhodnutý)
### Dokončené
- #589 merged: bus-core (v1 envelope, digest, file + GitHub store, HTTP handler) + CLI + `serve.ts` + OpenAPI
- #590 merged: `scripts/bus/handshake.ts` (BUS-001 transport / BUS-002 return path / BUS-003 founder gate) + `docs/ops/bus-handshake-runbook.md`
- Founder D1 = **GO**: Cloudflare Tunnel ako dogfood/validation transport, **nie** produkčná infra; A/B/C (tunel → stabilný host → robustnejšia infra) — C sa dnes nerozhoduje
- BUS-003 adversariálne: `GO REQUIRED` prežije `ack` (vrátane pokusu prepašovať `gate: AUTO-SAFE` v ack tele); žiadna approve/execute/merge route neexistuje
### Rozpracované / Pending
- **Founder-side runbook (kroky 1–7)** — token, PAT, `bus/main`, `bus:serve` (over `store: github`), `cloudflared`, `bus:handshake --url`
- `GitHubBusStore` neoverený proti reálnemu GitHub API — 401 z cloud kontajnera nie je dôkaz ani jedným smerom
- Custom GPT Action až po tom, ako prejde `BUS → GitHub`
- D2 (`bus:validate` ako CI krok) a D3 (migrácia pre-v1 správ, odporúčanie: nie) stále otvorené
### Kľúčové súbory zmenené
- `memory/decisions.md`: zápis D1 = GO + otvorený risk GitHubBusStore + token pravidlá
### Ďalší krok
Founder spustí runbook na svojom stroji. Ak `GitHub write failed` → konkrétny technický problém na opravu. Ak prejde → Custom GPT Action. Founder-free komunikácia zatiaľ **nedokázaná**.

## Session 2026-09-18 (Inter-Agent Bus — transportná vrstva v1)
### Dokončené
- `packages/bus-core/` — v1 envelope + YAML podmnožina + validácia (vrátane detekcie credentials), digest, FileBusStore, GitHubBusStore, HTTP handler. 0 runtime závislostí, beží na natívnom Node type-strippingu.
- `scripts/bus/cli.ts` — `npm run bus -- send|pull|read|digest|ack|validate`; dogfood: výsledok tejto session je v `.ai/bus/outbox/MSG-20260918-001-bus-transport-v1.md`
- `scripts/bus/serve.ts` — standalone HTTP server (node:http), fail-closed bez `REVOLIS_BUS_TOKEN`
- `docs/prompts/revolis-bus-openapi.yaml` — schéma pre ChatGPT Custom GPT Action
- ADR + decisions.md zápis; `.ai/bus/README.md` a `message.schema.md` povýšené na v1
- Testy: `npm run bus:test` 61/61 (vrátane regresie nad reálnymi `.ai/bus` súbormi a reálneho HTTP round-tripu); `npm run bus:validate` 0 errors
### Rozpracované / Pending
- **D1 (blokuje odstránenie copy-paste):** kde beží HTTP transport — tunel / samostatný host / mount v `apps/crm`; + vydať `REVOLIS_BUS_TOKEN`
- D2: `bus:validate` ako povinný CI krok na PR
- D3: migrácia 35 pre-v1 správ (odporúčanie: nie)
### Kľúčové súbory zmenené
- `packages/bus-core/src/{types,yaml,envelope,digest,store,github-store,http}.ts`: nový transport
- `scripts/bus/{cli,serve}.ts`: CLI + HTTP entrypoint
- `docs/architecture/adr-2026-09-18-inter-agent-bus-transport-v1.md`: rozhodnutie, scope, bezpečnostný model, meranie
- `package.json`: `bus`, `bus:serve`, `bus:validate`, `bus:test`
### Ďalší krok
Founder rozhodne D1 a vydá `REVOLIS_BUS_TOKEN` — dovtedy bus funguje len lokálne (CLI) a ChatGPT sa naň nedostane.

## Session 2026-09-14 (ADR Soft Factory V1 Minimum)
### Dokončené
- Ingest founder ADR z Downloads → `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`
- Kontrolór check vs `origin/main` @ `97655763b`: TASK-0008 schema gap overený; expectedFileHash/BUS-004 hash dôkaz na tip main neoverený
- Report: `docs/reports/2026-09-14-adr-software-factory-v1-minimum.md`
### Rozpracované / Pending
- Founder GO na rozhodnutia #1 (V1 Minimum) a #4 (Judge = spúšťač kontrol); potom schema `acceptance`+`budget` + runner + ledger
- Dohľadať artefakt BUS-004 / expectedFileHash hardening (nie na tip main)
### Kľúčové súbory zmenené
- `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`: NÁVRH V1 Minimum
- `docs/reports/2026-09-14-adr-software-factory-v1-minimum.md`: ingest + verification
### Ďalší krok
Founder merge spec PR; paging len po `GO SEARCH-PAGING`; AC/pricing runtime až po vlastných GO frázach.
Founder: rozhodni #1 a #4 (V1 Minimum + Judge-as-runner). Bez GO neimplementovať.
## Session 2026-08-18

### Dokončené
- Kontrolor review PR #439: found remaining unknown-commit retry duplicate risk.
- Follow-up branch `cursor/acquire-email-idempotency-dabc`: deterministic `leads.id` from acquire dedup key.
- Report: `docs/reports/2026-08-18-acquire-email-idempotency-followup.md`

### Rozpracované / Pending
- Verify/push/open PR for `cursor/acquire-email-idempotency-dabc`.
- Open critical-bug PRs awaiting review: #369, #370, #371, #374, #392, #401, #427, #438, #439
- Stage 1 acquisition — only on explicit founder GO

### Kľúčové súbory zmenené
- `apps/crm/src/app/api/acquire/email/route.ts`: deterministic lead id + existing-lead response on primary-key retry.
- `apps/crm/src/app/api/acquire/email/__tests__/route.test.ts`: unknown commit retry test.
- `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`: live-spec for deterministic idempotency.

### Ďalší krok
Run targeted tests, push branch, open draft PR. Do not merge #439 without idempotency follow-up.
## Session 2026-09-15 (critical bug hunt — match status scoped)
### Dokončené
- #510 / #511 merged (roadmap overlay + Launch Pack V0 docs)
- Mapper-depth amendment: `mapTransaction` P0, zlé 13/14, PREDANÉ v title, governance riadky≠správnosť
### Rozpracované / Pending
- Founder: vyžiadať Realvia číselník (category + transaction)
- Mapper P0 + backfill — samostatné GO (nie teraz)
- Launch Pack implement — až po mapper P0 + `GO IMPLEMENT…`
### Kľúčové súbory zmenené
- `docs/reports/2026-09-03-realvia-mapper-depth-amendment.md`
- `docs/reports/2026-09-03-property-launch-pack-integration.md` (doplnené)
### Ďalší krok
Oficiálny číselník od Realvie; žiadny GO IMPLEMENT Launch Pack.
- HIGH: match status PATCH cookie-less write drop → fix + tests + PR
- Report: `docs/reports/2026-09-15-match-status-scoped-client.md`
### Rozpracované / Pending
- Founder merge fix/match-status-scoped-client
- Noted (not fixed): team/users INSERT RLS hole; /management SSR unscoped lists
- Tracked open bug PRs still awaiting review (#369 #370 #443 #444 #447 #462 #486 #490 #495 #537 #545 #548)
### Kľúčové súbory
- `apps/crm/src/lib/matching-store.ts`: scoped arg on updateLeadPropertyMatchStatus
- `apps/crm/src/app/api/leads/[id]/matches/[matchId]/route.ts`: thread client + fail-closed agency
- `apps/crm/src/lib/leads-store.ts`: addLeadActivity scoped forward
### Ďalší krok
Founder: review/merge match-status PR; next candidate team/users INSERT path (GO).

﻿## Session 2026-09-15 (north-star W2 measurement amendments)
### Dokončené
- Founder GO `north-star-backfill-nalezy.md` → `docs/reports/2026-09-15-north-star-backfill-nalezy.md`
- SQL: `leads_new_real` / `leads_new_seed` v `scripts/sql/north-star-day.sql` + founder_batch `queries-to-run.sql`
- `docs/ops/config-changelog.md` (FOUNDER_EMAILS ~2026-09-10); schéma + atribúcia v START-HERE
- Metrics jsonl: `config_changes_that_day` na 2026-09-10; `lead_split=pending_founder_batch_re_run` (bez vymyslených per-day real/seed)
- Push na otvorené PR #558
### Rozpracované / Pending
- Founder re-batch `queries-to-run.sql` → nový `results.json` → jsonl s `lead.new_real` / `new_seed`
- Founder merge #558 (NEMERGE agentom)
### Kľúčové súbory
- `docs/reports/2026-09-15-north-star-backfill-nalezy.md`
- `docs/ops/config-changelog.md`
- `scripts/sql/north-star-day.sql`
- `.ai/bus/metrics/north-star-2026-0{8,9}.jsonl`
### Ďalší krok
Founder: spustiť aktualizovaný founder_batch SQL (SELECT) a uložiť results; potom GO na rebuild jsonl.
## Session 2026-09-15 (north-star W2 COMPLETE)
### Dokončené
- LOOP+W2: 31 dní metrics (2026-08-17..09-16), founder_batch results
- Judge ACCEPT TASK-NS-001 `RUN-20260915185203-TASK-NS-001`
- PR #558 docs/metrics north-star backfill (NEMERGE bez founder GO)
- QUALIFICATION/INTENT/OUTREACH/VIEWINGS/CLOSED_WON = nula každý deň (dôkaz v report)
### Rozpracované / Pending
- Founder merge #558
- Typecheck paydown loop stále NOT_LAUNCHED (oddelený balík)
### Kľúčové súbory
- `.ai/bus/metrics/north-star-2026-0{8,9}.jsonl`
- `docs/reports/2026-09-15-north-star-backfill.md`
### Ďalší krok
Founder: merge #558; potom rozhodnúť o typecheck paydown launch.
## Session 2026-09-15 (typecheck paydown package PREPARED)
### Dokončené
- Balík `docs/overnight/2026-09-16-typecheck-paydown-loop/` nainštalovaný; PR #556
- Hard gate: #554+#555 merged on main; launch-record NOT_LAUNCHED
### Rozpracované / Pending
- Founder podpis launch-record → LAUNCH_AUTHORIZED → W0
### Ďalší krok
Founder: vyplň start_at/deadline_at/runner + podpis; potom GO na W0.
## Session 2026-09-14 (CI billing local evidence)
### DokonÄŤenĂ©
- LokĂˇlny nĂˇhradnĂ˝ dĂ´kaz za zablokovanĂ© GitHub Actions (billing lock) pre #548/#549/#550
- Report: `docs/reports/2026-09-14-ci-billing-local-evidence.md`
- Code Contract + Memory Engine PASS lokĂˇlne; Lint/test/build ÄŤiastoÄŤne (RLS/build neoverenĂ© v sandboxe)
### RozpracovanĂ© / Pending
- Org owner: odomknĂşĹĄ GitHub billing, potom re-run CI
- Merge #548/#549/#550 aĹľ po zelenom CI alebo explicitnom GO s tĂ˝mto dĂ´kazom
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-14-ci-billing-local-evidence.md`: nĂˇhradnĂ˝ dĂ´kaz
### ÄŽalĹˇĂ­ krok
Founder: fix GitHub billing â†’ re-run CI â†’ merge HIGH fix PR.

---

## Session 2026-09-05 (Ruflo overnight â€” branch docs/ruflo-overnight-prepared)
### DokonÄŤenĂ©
- Overnight package + research run on this branch: PREPARED â†’ run 20260905T2304 â†’ **VALIDATE_FIRST / NO_GO_IMPLEMENTATION**
- Package: docs/overnight/2026-09-05-ruflo-swarm/
- Reports under docs/reports/ and output/overnight/ artifacts on this branch
### RozpracovanĂ© / Pending
- Founder review of overnight handoff / PR #536 after rebase onto current main
- No implementation from overnight recommendations without separate GO
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- docs/overnight/2026-09-05-ruflo-swarm/*
- overnight reports / amendments on this docs branch
### ÄŽalĹˇĂ­ krok
Founder review PR #536; do not treat research as implementation authorization.

---

## Session 2026-09-06 (Inter-Agent Bus v1.0)
### DokonÄŤenĂ©
- REVOLIS Inter-Agent Bus v1.0 vytvorenĂ˝ ako Phase 1 copy-paste protocol pre GPT/SOL â†” Claude Code.
- Scope zĂˇmerne docs-only: STACK 0/2/3/4/7 + Execution Result + Decision Artifact; bez message store/MCP/orchestratora.
- Founder review GO 9/10 zapracovanĂ˝: role boundary Founder â†’ SOL/GPT â†’ Bus â†’ Claude Code â†’ Result/Evidence â†’ SOL â†’ Founder, Evolution Rule a friction log.
- Report: `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`
### RozpracovanĂ© / Pending
- Real Handoff #1 ÄŤakĂˇ na konkrĂ©tnu engineering Ăşlohu; Phase 2 automatizĂˇcia ostĂˇva blokovanĂˇ pred 3 reĂˇlnymi pouĹľitiami.
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/prompts/revolis-inter-agent-bus-v1.md`: copy-paste-ready master prompt pre SOL/GPT a Claude Code + ĹˇablĂłny.
- `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`: rozhodnutie, scope, overenie, rizikĂˇ.
- `memory/decisions.md`: decision memory + Engineering justification pre novĂ˝ governance prompt.
### ÄŽalĹˇĂ­ krok
PouĹľiĹĄ `docs/prompts/revolis-inter-agent-bus-v1.md` ako povinnĂ˝ formĂˇt pri najbliĹľĹˇom konkrĂ©tnom engineering handoffe a vyplniĹĄ friction log; neautomatizovaĹĄ Phase 2 pred 3 reĂˇlnymi pouĹľitiami.

---

## Session 2026-09-06 (PR #473 CI)
### DokonÄŤenĂ©
- #471 MERGED. RovnakĂ˝ 42501 fail na #473 (docs operator audit, stale main)
- Merge `origin/main` (`a8929c9a`) do `cursor/operator-dashboard-audit-db1f`
- Report: `docs/reports/2026-09-06-pr473-ci-fix.md`
### RozpracovanĂ© / Pending
- Founder merge #473 â€” agent nemerguje
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-06-pr473-ci-fix.md`: 42501 + merge main + CI PASS
### ÄŽalĹˇĂ­ krok
Founder merge #473.

---

## Session 2026-09-06 (PR #471 CI)
### DokonÄŤenĂ©
- CI `Lint, test, build` na #471: FAIL v `valuation-tenants-rls.test.ts` (42501 vs null) â€” docs PR, oprava uĹľ na main `#489`/`a4f58ff1`
- Merge `origin/main` do vetvy; neskĂ´r **MERGED** ako #471
- Report: `docs/reports/2026-09-06-pr471-ci-fix.md`
### RozpracovanĂ© / Pending
- niÄŤ
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `docs/reports/2026-09-06-pr471-ci-fix.md`: koreĹ 42501 + merge main + CI PASS
### ÄŽalĹˇĂ­ krok
#473 CI.

---

## Session 2026-09-06
### DokonÄŤenĂ©
- InternĂ˝ Smolko CRM chatbot MVP pridanĂ˝ do `/revolis-ai`: tenant-scoped otĂˇzky
  "komu volaĹĄ", "ÄŤo zachrĂˇniĹĄ", "ÄŤo vybaviĹĄ" bez externĂ©ho LLM.
- API: `POST /api/ai/smolko-chat` pouĹľĂ­va existujĂşce `listLeads` + `listTasks`,
  `validateBody` a telemetry `ai_chatbot_queries`.
- CI fix: API contract ratchet NOVĂ‰=0; `/api/ai/smolko-chat` doplnenĂ˝ do
  `REVOLIS_AI_FEATURE_REGISTRY`.
- OverenĂ©: targeted chatbot/registry tests 18/18, chatbot unit + verification
  6/6, `npm run lint`, `npm run build`.
- Report: `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`
- ZodpovedanĂ˝ stav poĹľiadavky p. Smolka na chatbota: verejnĂ˝ chatbot / Website Concierge je zachytenĂ˝, ale blokovanĂ˝ cez SMO-B04 aĹľ SMO-B09.
- OverenĂ© `npx vitest run tests/verification/property-launch-pack-v0.verification.test.ts` â€” 5/5 PASS pre najbliĹľĹˇĂ­ Smolko Launch Pack povrch.
- Report: `docs/reports/2026-09-06-smolko-chatbot-status.md`
### RozpracovanĂ© / Pending
- VerejnĂ˝ Website Concierge stĂˇle nie je povolenĂ˝: SMO-B04â€“B09 ostĂˇvajĂş brĂˇny.
- `SMO-B04`: PROD cross-tenant negative test + active/freshness contract pred Concierge preview.
- `SMO-B05`: AI disclosure, privacy/retention text, schvĂˇlenĂ© FAQ a human fallback.
- `SMO-B06`: routing matrix + 10 E2E callbackov.
- `SMO-B07`â€“`SMO-B09`: booking storage drift RCA, Google Calendar OAuth/free-busy, idempotency/notifikĂˇcie.
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/lib/smolko-chatbot.ts`: deterministic CRM assistant engine.
- `apps/crm/src/app/api/ai/smolko-chat/route.ts`: authenticated tenant-scoped chat endpoint.
- `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx`: dashboard chat UI.
- `apps/crm/src/app/(dashboard)/revolis-ai/RevolisAIClient.tsx`: embeds chat panel.
- `apps/crm/src/lib/usage-metrics.ts`: adds `ai_chatbot_queries` usage metric type.
- `apps/crm/src/lib/__tests__/revolis-ai-features.test.ts`: registers `/api/ai/smolko-chat`.
- `apps/crm/src/lib/__tests__/smolko-chatbot.test.ts`: unit coverage.
- `apps/crm/tests/verification/smolko-chatbot.verification.test.ts`: live spec guard.
- `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`: implementation report.
- `docs/reports/2026-09-06-smolko-chatbot-status.md`: stav chatbot poĹľiadavky a blokĂˇtorov.
- `memory/session-summary.md`: aktuĂˇlny handoff.
### ÄŽalĹˇĂ­ krok
Founder/Product GO na `SMO-B04` PROD negative test pre verejnĂ˝ Website Concierge;
bez DB/OAuth/booking mutĂˇciĂ­.

---

## Session 2026-09-05 (PR #535 fix-merge-conflicts â€” CI CLEAN)
### DokonÄŤenĂ©
- origin/main merge (clean; 0 textual conflicts)
- onboarding/session api-validate + usage-metrics imports â†’ ratchet NOVĂ‰=0
- CI green + mergeStateStatus CLEAN on tip `f74ada73` (agent did not merge)
- Report: `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### RozpracovanĂ© / Pending
- Founder merge #535
- PROD smoke notification-digest
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/app/api/onboarding/session/route.ts`: contract imports only
- `docs/reports/2026-09-05-pr535-fix-merge-conflicts.md`
### ÄŽalĹˇĂ­ krok
Founder GO: merge #535; then PROD digest smoke.

---

## Session 2026-09-13 (critical-bug automation)
### DokonÄŤenĂ©
- Found + fixed silent demo CRM task drop (`createDemoBookingTask` / sales-funnel demo-request)
- PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/546
- Report: `docs/reports/2026-09-13-demo-booking-task-service-role.md`
### RozpracovanĂ© / Pending
- Prior open critical fixes still awaiting review: #369 #370 #443 #444 #447 #462 #486 #490 #495 #537 #545 #546
### KÄľĂşÄŤovĂ© sĂşbory zmenenĂ©
- `apps/crm/src/lib/demo-booking-store.ts`: service-role for orphan task insert
- `apps/crm/src/app/api/sales-funnel/demo-request/route.ts`: pass service + fail if task fails
- `apps/crm/src/lib/sales-funnel-store.ts`: throw on saas_leads insert error
### ÄŽalĹˇĂ­ krok
Founder review/merge #546 (and backlog of open critical fix PRs).



## Session 2026-09-17 (operating mode B — prvy task, A3 onboarding 401)
### Dokoncene
- Setup rezimu B: push overeny (dry-run OK), patch uz bol na `origin/audit/2026-09-16` (`56e2359`, `git am --3way` -> "already applied"), vetva `docs/operating-mode-b` pushnuta
- PR audit/2026-09-16 -> main uz existoval: #565 — founder ho mergol 2026-09-17 (main -> 1291ae5); protokol 00-06 a DEC-* su teraz na main
- Prvy task v rezime B: handoff (01) + 2 nezavisli reviewri v izolovanych worktrees z origin/main, kluc dokazy re-overene executorom
- FINDING + PROPOSAL k A3 -> PR #566 (draft)
- Founder GO na V1 -> DEC-20260917-003; implementovane: novy proxy-level test drzi 401 ako zamer (mutacne overeny), opravene nepravdive tvrdenia v reporte 2026-09-04 a v rollback runbooku, A3 vyhodnotene fail + deviation accepted_by_founder (desc/verdict nedotknute)
### Rozpracovane / Pending
- Founder: read-only SELECT stavu RLS `onboarding_sessions` v prode (runbook :38-41) — A1/A2 zostavaju unknown
- Founder: Supabase Auth "Confirm email" v prod projekte — rozhoduje, ci 401 zasiahne aj registracnu cestu
### Kluc subory zmenene
- `.ai/bus/handoffs/HANDOFF-20260917-001-a3-onboarding-401.md`: novy handoff packet
- `docs/reports/2026-09-17-a3-onboarding-session-401-finding.md`: FINDING F1-F8 + PROPOSAL V1-V5 + vysledok V1
- `.ai/bus/decisions/DEC-20260917-003-a3-onboarding-401-intended.md`: founderov GO na V1
- `apps/crm/src/proxy-onboarding-session-gate.test.ts`: novy test, 401 = zamer
- `docs/reports/2026-09-04-rls-onboarding-session-api.md`, `docs/runbooks/rollback-onboarding-sessions-anon.md`: korekcie
- `.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md`: A3 vyhodnotene
### Dalsi krok
Founder: merge #566, potom SAMOSTATNE rozhodnutie o migracii 20260904220000 (stale PREPARED ONLY) — najprv read-only SELECT stavu RLS v prode podla runbooku :38-41.

## Session 2026-09-18 (GTM playbook — predaj RK, 80/20 majiteľa, akvizícia)
### Dokončené
- Syntéza GTM stratégie z dôkazov v repe → `docs/sales/gtm-playbook-2026-09-18.md`
- Nájdený rozpor: VETO na valuačný widget (2026-07-19, „chýba licencovaný zdroj cien") je
  prekonaný písomným povolením NBS (2026-08-10); zostáva len nespárovaná jednotka realizačná/ponuková
- Zdokumentované: 3× nezávislé odmietnutie AI/CRM trhom + kotva 300 €/tip + loop 31 dní na nule
- `memory/decisions.md` doplnený o decision record 2026-09-18
### Rozpracované / Pending
- **Founder GO S2** — rozsah tvrdenia widgetu na NBS dátach (3 otázky v §9 playbooku)
- GDPR gate pre A1 (RPO outreach zoznam) a S4 (audit cudzieho exportu) — `gdpr-advisor` nespustený
- Úlohy s 0 € engineeringom (S1 packaging, S3 segmentácia A/B/C, S8 procesná daň, A4 Únia, A8 sezónnosť) — GO nepotrebujú
### Kľúčové súbory zmenené
- `docs/sales/gtm-playbook-2026-09-18.md`: nový GTM playbook (stratégie, 80/20, akvizícia, 30/60/90)
- `memory/decisions.md`: decision record 2026-09-18 + revízia predpokladu VETO
### Ďalší krok
Founder: rozhodnúť S2 (ponuková úroveň NBS v UI? koeficient ostáva null? znenie atribúcie?).
Bez `GO S2` žiadny kód.

## Session 2026-09-18b (GO S1/S3/S8/A4/A8 — exekucne artefakty; S2 blokovane rozporom)
### Dokoncene
- `docs/sales/positioning-v1-zdroj-predavajucich.md` — S1 packaging (kategoria, hierarchia spravy, zakazany slovnik, smieme/nesmieme tvrdit)
- `docs/sales/segmentacia-a-b-c-outreach.md` — S3 segmenty podla CRM (A=Realvia, B=iny, C=Excel), skripty, kvalifikacia, tracker polia (riesi D5-7), A8 sezonnost
- `docs/ops/founder-time-protocol.md` — S8 triage 54 otvorenych PR do 3 kop + 2 nalezy
- `docs/sales/realitna-unia-druhy-kontakt-draft.md` — A4, NEODOSLANE
- Oprava vlastneho odporucania: auto-merge lane uz existuje (AUTOMERGE-POLICY v1.0 + workflow)
### Rozpracovane / Pending
- **S2 BLOKOVANE:** founder dal "GO S2" ale Q1=nie a Q3=ano su nezlucitelne. Ziadny kod kym sa Q1 neujasni.
- Founder rozhodnutia zo `founder-time-protocol.md` §6: zatvorit kopu 3 (29 PR)? prehodit 12 draftov kopy 1 na ready? overit robota na #189/#191/#192? stav migracie #437?
- `gdpr-advisor` skill nie je v tejto session dostupny — GDPR brana pre A1/S4 formalne nesplnena
### Kluc subory zmenene
- `docs/sales/positioning-v1-zdroj-predavajucich.md`, `docs/sales/segmentacia-a-b-c-outreach.md`
- `docs/ops/founder-time-protocol.md`, `docs/sales/realitna-unia-druhy-kontakt-draft.md`
- `memory/decisions.md`: decision record 2026-09-18 (GO + rozpor S2)
### Dalsi krok
Founder: ujasnit Q1 pre S2 (zobrazuje widget NBS uroven alebo nie?) + 4 rozhodnutia z founder-time-protocol §6.

## Session 2026-09-18c (Founder Acquisition Research Loop — zjednotenie)
### Dokoncene
- `docs/sales/founder-acquisition-loop-2026-09-18.md` — founderov ramec prijaty, konfrontovany s repo dokazmi
- Nalez 1: /proof + leak engine SHIPPED od 2026-07-06, 0 realnych prospectov za 3 mesiace -> hrdlo je navstevnost, nie nastroj
- Nalez 2: NAR cisla su US trh + neoverene -> PREDPOKLAD; lokalny SK dokaz (3 rozhovory) ma prednost
- Nalez 3: Founder Dashboard data-blocked (activities=3/31d, #437 nezmergovany)
- Experiment E0 navrhnuty: split otaracej vety H1 vs H2, rozhodovacie pravidlo vopred
- 30-dnovy Founder-led Acquisition OS po tyzdnoch s metrikami a failure signalmi
### Rozpracovane / Pending
- **E0 je prva uloha** — bez neho je prva veta outreachu hadanie
- Brany: G1 GDPR B2B outreach, G2 GDPR cudzi export, G3 S2 rozsah (stale nezodpovedane), G4 #437 do PROD, G5 suhlas s menovanim
- Founder dismissol obe otazky (S2 rozsah + prehodenie 12 draftov) — cakaju na dalsi pokyn
### Kluc subory zmenene
- `docs/sales/founder-acquisition-loop-2026-09-18.md`: zjednoteny loop + 30-dnovy OS
- `memory/decisions.md`: decision record 2026-09-18 (ramec prijaty, 3 nalezy, E0)
### Dalsi krok
Founder: spustit E0 (zoznam 40 RK segment A + split vety) alebo odpovedat na G3/G4.
## Session 2026-09-17 (open PR stack repro)
### Dokončené
- Reprodukcia 11 otvorených PR na origin/main `6f6381ca0`
- Report: `docs/reports/2026-09-17-open-pr-stack-repro.md`
### Rozpracované / Pending
- Founder: close #374 #480; merge stack MERGNÚŤ po rebase kde treba
### Kľúčové súbory zmenené
- `docs/reports/2026-09-17-open-pr-stack-repro.md`: dôkazová tabuľka
### Ďalší krok
Founder GO: rebase+merge #537/#486/#447 (tenant HIGH); close #374/#480.

## Session 2026-09-18d (ekonomika majitela RK -> akvizicny system)
### Dokoncene
- `docs/sales/owner-economics-acquisition-system-2026-09-18.md` (291 riadkov): retaz penazi a kde Revolis realne siaha (A,B) vs nesiaha (C,D,E); tuzby/strachy/uzke hrdla; 7 spustacov nakupu vratane detekovatelneho T5; mapa 10 namietok s odpovedami; cenova psychologia a 4-vrstvova architektura ponuky; struktura pilotu (Shadow 14 dni -> plateny 60-90 dni); rebrik dokazov 1-6; experimenty E1-E6 s kill kriteriom
- Merge origin/main do vetvy (#437 pritiahnuty)
### Korekcia
- **#588 NIE je merged** — GitHub API `state=open, merged=false`, ziadny zo 6 dokumentov nie je na main. Founder pravdepodobne zamenil cislo.
- Merged bol **#437** (migracia `20260817220000` s `last_contact_at`) -> G4 ciastocne zavreta, ale PROD aplikacia NEOVERENA
### Rozpracovane / Pending
- Founder: merge #588 (stale otvoreny, draft, zeleny)
- Brany: G1 GDPR B2B outreach, G2 GDPR pristup k ich datam (blokuje Shadow), G3 S2 rozsah, G4 PROD overenie migracie, G5 suhlas s menovanim
- E0 stale nespusteny — prva uloha 30-dnoveho OS
### Kluc subory zmenene
- `docs/sales/owner-economics-acquisition-system-2026-09-18.md`
- `memory/decisions.md`: decision record 2026-09-18 (ekonomicky model + korekcia o #588/#437)
### Dalsi krok
Founder: (1) merge #588, (2) read-only SELECT ci je migracia 20260817220000 aplikovana v PROD, (3) spustit E0.

## Session 2026-09-20 (PR #588 MERGED — akvizicny system na main)
### Dokoncene
- **#588 merged** do main ako `aa6e07f`. 7 dokumentov, 1679 riadkov, bez kodu a migracii.
  `founder-acquisition-loop`, `owner-economics-acquisition-system`, `gtm-playbook`,
  `positioning-v1-zdroj-predavajucich`, `segmentacia-a-b-c-outreach`,
  `founder-time-protocol`, `realitna-unia-druhy-kontakt-draft`
- Vetva restartovana z origin/main (merged historia sa uz nepouziva)
- Opraveny popis PR: tvrdil #437 nezmergovany, co uz neplatilo
### Overene fakty (proti primarnym zdrojom)
- #437 merged -> migracia `20260817220000` (`last_contact_at`) je na main; **PROD aplikacia NEOVERENA**
- #537 a #563 medzitym tiez merged (boli v kope "blokuje zakaznika")
- Vercel `ignoreCommand` (#578) NEchrani pred dennou kvotou `api-deployments-free-per-day` —
  kvota sa mini pri vytvoreni deploymentu, nie pri builde; setri build minuty, nie pocet deploymentov
### Rozpracovane / Pending
- **E0 nespusteny** — split otvaracej vety H1 vs H2, prva uloha 30-dnoveho OS
- Brany: G1 GDPR B2B outreach (blokuje tyzden 1), G2 GDPR pristup k ich datam (blokuje Shadow CRM),
  G3 S2 rozsah (NBS na maklerskej strane?), G4 PROD overenie migracie, G5 suhlas s menovanim
- `gdpr-advisor` skill nie je v tejto session dostupny -> G1/G2 formalne nesplnene
### Dalsi krok
Founder: read-only SELECT ci je `20260817220000` aplikovana v PROD (G4). Bez toho ranny zoznam nestoji.

## Session 2026-09-19…21 (Smolko ingest audit, P1 v0.2, parser fix)

### Dokončené
- **Reality Smolko — mailová slučka uzavretá.** 18. 9. 10:10 odoslaný e-mail „Rozšírenie Revolisu o dopyty a prístupy Vašich maklérov"; p. Smolko odpovedal ten istý deň 14:42 a vyplnil všetkých 5 bodov (zoznam maklérov + adresy, súhlas s napojením, Websupport IMAP/SMTP parametre cez webex, admin = iba on). **9 maklérov** na zapojenie vrátane konateľa; **4 účty žiadal deaktivovať**.
- **Produkčná zmena:** 4 profily deaktivované v `public.profiles` (`is_active → false`, `role` nedotknutá, vratné). Pred zápisom overené, že nedržia nič: 0 leadov, 0 úloh, 0 aktivít, 0 eventov. Agentúra `1111…1111` = 9 aktívnych / 4 neaktívni. Bod „admin iba ja" bol už splnený — konateľ má `role: owner`.
- **#584 — `.ai/bus/artifacts/TASK-RLS-ONBOARDING-SESSION/RESULT.md` zmergovaný do main** (`9c6fc4dd`, blob `311f3212`). Odvodený záznam Experimentu 01. Výsledok **`PARTIAL PASS / LOOP-LEVEL FAIL`** zachovaný nezmenený — G0-2…G0-5 PASS (83/83 typovaných položiek), G0-1 PASS vo vnútri behu / FAIL na úrovni slučky.
- **#591 — P1 kontrakt v0.2 rozšírený** o tri body, zmergované do `docs/agent-contract-v0.1` (`066ded51`):
  - **(e) actor / model / role / capabilities** — envelope nerozlišuje aktéra od jeho oprávnení (overené: `git grep 'capabilit|permission'` v kontrakte = 0).
  - **(f) `valid_for` + `on_state_change`** — väzba `DECISION` na stav, nad ktorým vzniklo, cez **všetky** state dependencies, nie len mutovaný ref. `on_state_change` ∈ `abort | re-audit | proceed`, default pri chýbajúcom poli = **`abort`**.
  - **(g) expirácia GO** — ak sa zmení ktorýkoľvek ref z `valid_for.depends_on`, pôvodné GO **automaticky expiruje**.
  - **Permission boundary zapísaná epistemicky presne:** `OBSERVATION:` branch push OK, tag push HTTP 403 · `CAUSE: UNKNOWN` · `HYPOTHESIS:` policy môže rozlišovať druhy refov — **NOT VERIFIED** (diagnostický endpoint proxy nebol dostupný).
- **#599 — oprava acquire parsera zmergovaná do main** (`2a510ba3`, `PARSER_VERSION` 1.2 → 1.3). Koreňová príčina: route skladá `raw = subject + text + html`, takže regexy nad poľami bežali aj nad HTML markupom. Opravené: `htmlToText()`, `cleanName()`, `pickContactEmail()` + parameter `recipient` z `email.to`, `cleanEmail()`. **Idempotencia zámerne nedotknutá** — `rawHash`/`eventId` sa naďalej počítajú z pôvodného `raw`. +7 regresných testov, fixtúry syntetické (PII klientov do repa nepatrí).

### Rozpracované / Pending
- **Atribúcia leadu na makléra — BLOCKED.** Nie je to len nedorobok: dnes **všetky** dopyty prichádzajú na `office@realitysmolko.sk`, takže neexistuje objektívny signál, podľa ktorého priradiť konkrétneho makléra. `inbound_mailboxes` je per agentúra (`smolko-a7f2@revolis.ai`), nie per maklér. Odblokuje sa až napojením individuálnych schránok. Stav dnes: **0 zo 7** živých portálových leadov má `assigned_profile_id`.
- **Napojenie schránok maklérov — odložené.** Čaká na zmeranie objemu: 21. 9. odoslaný e-mail p. Smolkovi s otázkou, koľko dopytov dostali traja menovaní makléri minulý týždeň priamo na svoju adresu. Bez toho čísla nevieme, či sa 8 preposielacích pravidiel + GDPR proces oplatí.
- **RAW STORAGE — nevyriešená technická medzera, bez GO.** Viď decisions.md.
- **Tri otvorené founder `DECISION`:** P1 (a–g), P2 (transport), P3a/P3b (RLS).

### Kľúčové súbory zmenené
- `apps/crm/src/lib/acquire/email-adapter.ts` — HTML normalizácia, výber kontaktnej adresy, čistenie mena (#599)
- `apps/crm/src/lib/acquire/__tests__/email-adapter.test.ts` — +7 regresných testov zo skutočných produkčných zlyhaní, syntetické fixtúry (#599)
- `apps/crm/src/app/api/acquire/email/route.ts` — `parseEmail(raw, receivedAt, { recipient: email.to })` (#599)
- `.ai/bus/artifacts/TASK-RLS-ONBOARDING-SESSION/RESULT.md` — odvodený záznam Gate 0 (#584)
- `docs/reports/2026-09-16-gate0-protocol-validation.md` — sekcia „Amendment 2026-09-18", položky `AE1–AE3`, `A1–A3` (#591)
- `.ai/bus/outbox/MSG-20260918-030-orchestrator-lessons-cleanup-permission-boundary.md` — lessons (#591)
- `public.profiles` (PROD) — 4× `is_active → false`

### Ďalší krok
Čakať na odpoveď p. Smolka s počtom dopytov u troch maklérov. To číslo rozhodne, či má napojenie schránok zmysel, alebo je problém v objeme dopytov a nie v ich zbere.
