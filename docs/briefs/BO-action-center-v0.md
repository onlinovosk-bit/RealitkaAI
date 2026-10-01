# Build Order — Action Center V0

**Status:** INTEGRATION REPORT — specification only  
**Kategória:** Core Product / Action Safety  
**Cieľ:** Maklér schváli a vykoná jednu skontrolovanú akciu (úloha · interná notifikácia · individuálny e-mail) tak, že schválený payload je ten istý, ktorý sa odošle, a retry nepošle druhý e-mail.

**Founder spec GO:** 2026-08-24 (zdroj: `BOactioncenterv0apricingmigration.md`)  
**Implementačný GO:** **NEUDELENÝ**  
**Autorizačná fráza (budúca, nie teraz):** `GO IMPLEMENT ACTION CENTER V0`  
Táto fráza v tomto dokumente **nie je** udelené GO. Platné GO musí prísť neskôr ako samostatná founder správa.

**platné_voči (overené fetchom):** `origin/main` = `47ec485275166f00671945ed3fd928fac5271508` (2026-08-24)

**Rozsahové vylúčenie:** `scripts/ruflo-model-bridge` a vetva `feat/bridge-harness` sa **nepoužívajú, neimportujú, necheckoutujú**. Preberajú sa **princípy**, nie kód.

---

## 0. Gate check (Ústava + Prime Directive)

| Otázka | Odpoveď |
|--------|---------|
| Posúva ďalšieho platiaceho klienta / retenciu? | Nie ako platený modul. Je to **podmienka**, aby akcie smeli osloviť klienta. Bez nej ostane odporúčanie textom. |
| Zaplatí za to dnešný klient? (Ústava Q1) | Nie priamo. Founder verdikt v zdroji je BUILD ako safety gate. **Kontrolór FLAG:** literál Q1 = NIE → strop VALIDATE, kým founder v implementačnom GO nepotvrdí override. |
| Lead → Provízia? | Áno. Bez bezpečného vykonania sa reťazec zastaví na „odporúčaní“. |
| Timing OK (nie „príliš skoro")? | Áno. Odporúčania v produkte už sú; chýba bezpečné vykonanie. |
| Prečo nie existujúce primitíva? | Sú, ale netvoria systém. Šesť doložených dier v Integration Report (D1–D6). |
| Founder trap | Complexity Bias. Kill: nový deployable, druhá orchestrácia, vlastný queue service, bulk akcie v prvom vydaní. |
| Verdikt | **BUILD — úzky rozsah podľa §4**, až po `GO IMPLEMENT ACTION CENTER V0`. Tento check-in je VALIDATE/spec. |

Zapíš do `memory/decisions.md` po implementačnom GO. Spec check-in: `docs/reports/2026-08-24-bo-action-center-pricing-review.md`.

---

## 1. Integration Report (povinné pred kódom)

Auditovaný baseline: `origin/main` @ `47ec485275166f00671945ed3fd928fac5271508`.

| Položka | Existuje? | Cesta / rozhodnutie |
|---------|-----------|---------------------|
| Schvaľovací store | Áno, **nevhodný** | `apps/crm/src/lib/capabilities/_shared/human-approval.ts:3` — `const approvals = new Map()` **D1**. Nereuse ako trvalý store. |
| Send bez brány | Áno | `apps/crm/src/app/api/outreach/send/route.ts` — `leadId` → `sendAiOutreachEmail` **D2**. |
| Approve + generate | Áno | `apps/crm/src/app/api/outreach/approve/route.ts` loguje `human_approved`, **potom** `sendAiOutreachEmail` volá `generateOutreachEmail` **D3**. |
| Audit log | Áno | `ai_action_audit` (`20260610000001_ai_action_audit.sql`) — `body_hash` bez UNIQUE **D4**; bez stavového automatu **D5**. **Zostáva log.** Nový automat sa doň nevtláča. |
| Kreditový strop | Áno, fail-open | `apps/crm/src/lib/credits/spend-for-action.ts` — `CREDITS_ENFORCEMENT` default off **D6**. Tento BO ho **nezapína**. |
| Outbox / job tabuľka | Nie | Žiadne `action_runs` / `outbox` v `apps/crm`. |
| UI „Spustiť akcie“ | Áno | `WorkdeskTopbar` CTA. Názov sa v tomto vydaní **nepoužíva** (pozri pomenovanie). |
| Agent OS V0 kód | Nie na tomto baseline | `scripts/ruflo-model-bridge` na `origin/main` **neexistuje**. |

**Jediná nová vec (ak vôbec):** tabuľky `action_runs` + `action_events` (append-only) + serverová brána pred existujúcim send pipeline. Žiadny nový deployable. Outbox = Postgres riadok + existujúci cron/route pattern, nie nová služba.

### Princípy z Agent OS V0 (nie kód)

1. Nemenný action intent po zmrazení.  
2. Explicitná identita a idempotencia pokusu.  
3. Append-only história prechodov, oddelená od aktuálneho stavu.  
4. Stav `unknown` pri neistom výsledku — nie automatické zopakovanie.  
5. Deterministické overenie výsledku.  
6. Reconciliácia bez opakovania externej akcie.

### Stavový automat

```
draft → proposed → awaiting_approval → approved → executing
                                                    ├→ succeeded
                                                    ├→ failed
                                                    └→ unknown
```

`unknown` je terminálny až do ručnej reconciliácie. Z `unknown` sa nikdy neprechádza automaticky späť do `executing`.

### Engineering justification (pre budúci implementačný PR)

- **Trigger:** new-file (migrácia + store), nie nový deployable  
- **Decision path:** new-code pre stav; reuse send pipeline a `ai_action_audit` ako log  
- **Alternatives considered:** (a) persistovať `Map` do KV — nemá unique/idempotency ani RLS tenant; (b) natlačiť stav do `ai_action_audit` — log bez automatu, porušuje append-only význam.  
- **Why not reuse:** D1–D5 dokazujú, že existujúce primitíva nie sú schvaľovací tok.  
- **Expected outcome:** schválený hash = odoslaný payload; dvojklik nepošle druhý e-mail.  
- **Related paths:** `human-approval.ts`, `outreach/send`, `outreach/approve`, `outreach-store.ts`  
- **Contradiction check:** none voči tomuto spec check-inu; runtime až po GO.

---

## 2. Verification map (plán → test → kód)

Index: `docs/briefs/verification-index.md`. Súbory nižšie **ešte neexistujú** — vzniknú v implementačnom PR spolu s kódom.

| # | Akceptačné kritérium (merateľné) | Verification test | Playwright smoke | Vitest unit |
|---|----------------------------------|-------------------|------------------|-------------|
| 1 | Dvojité odoslanie s tým istým idempotency key vloží jeden `action_run` | `tests/verification/action-center-v0.verification.test.ts` | — | `lib/actions/__tests__/idempotency.test.ts` |
| 2 | Schválený `payload_hash` sa zhoduje s odoslaným telom | ten istý | — | approve/send unit |
| 3 | Timeout / nejasná odpoveď → `unknown`, nie retry do `executing` | ten istý | — | state-machine unit |
| 4 | Cudzia agentúra nevidí cudzí `action_run` (RLS) | `tests/rls/` + verification | — | RLS |
| 5 | Maklér neschváli akciu nad leadom kolegu | verification | — | route auth |
| 6 | `executing` je zapísané **pred** externým volaním | verification (zdrojový invariant) | — | store |
| 7 | Flag `ACTION_CENTER_ENABLED` default off; stará `POST /api/outreach/send` ostáva | verification | `smoke.spec.ts` outreach auth (existujúci) | — |

**Pravidlo:** zmena správania v stĺpci Verification = aktualizácia testu v **tom istom PR**.

---

## 3. Dátový predpoklad

- [x] Zdroj overený: vlastné CRM (`docs/architecture/master-data-sourcing-map.md` Zhluk 1 — leady, aktivity, outreach). Žiadny nový externý osobný zdroj.
- [x] GDPR: e-mail klientovi, ktorého lead už je v tenante. Právny základ ostáva 6(1)(b)/(f) existujúceho outreach; tento BO **nemené** právny základ, len bránu. Pred implementáciou: `gdpr-advisor` na send path.
- [ ] Stripe / billing: **OUT** — stop, ak by sa diff dotkol `credits-billing.ts` alebo `stripe/**`.

---

## 4. Scope

### IN

- Vytvorenie úlohy · interná notifikácia · **individuálne** skontrolovaný e-mail.
- Zmraziť payload + hash pred schválením; schvaľuje sa táto verzia.
- DB unique `(agency_id, idempotency_key)`.
- Audit kto / kedy / ktorá verzia.
- Tenant, rola, typ akcie na serveri.
- Trvalý outbox/job v Postgres (nie nový deployable).
- `executing` pred externým volaním; timeout → `unknown`; uložiť provider message/operation ID.
- Samostatné handlery a oprávnenia per typ akcie.
- Flag `ACTION_CENTER_ENABLED`, default **off**.
- Pomenovanie: maklér **Navrhnuté kroky** (v karte **Skontrolovať a vykonať**); majiteľ **Centrum akcií**. Názov „Spustiť akcie“ sa nepoužíva.

### OUT

- Hromadné SMS a e-maily.
- Automatické zmeny pipeline.
- Autonómne finančné a zmluvné akcie.
- Akákoľvek akcia bez ľudského potvrdenia.
- Odstránenie `POST /api/outreach/send` (D2) v tomto vydaní — najprv brána, uzavretie starej cesty **samostatným PR**.
- Zapnutie `CREDITS_ENFORCEMENT`.
- Agent OS V0 runtime / `feat/bridge-harness`.
- Pricing / Stripe (BO-B, iná autorizácia).

### Dátové zmeny

Nová tabuľka `action_runs` + `action_events`. Migrácia pod `apps/crm/supabase/migrations/` → automerge **denylist → Tier 3 → founder merguje ručne**; na produkciu cez Supabase Dashboard.

---

## 5. Brány (GO zostáva ľudské)

| Brána | Kto | Kedy |
|-------|-----|------|
| Integration Report | Founder | tento check-in |
| `GO IMPLEMENT ACTION CENTER V0` | Founder | pred prvým runtime riadkom |
| PR + Preview | agent | po implementácii |
| CI zelené | CI | pred merge |
| Merge do main | Founder | Tier 3 (migrácia) |
| Prod migrácia | Founder | samostatný GO |
| Zapnutie flagu | Founder | samostatné, default off |

---

## 6. Acceptance = Running

1. [ ] Verification testy zo sekcie 2: `npx vitest run tests/verification/action-center-v0.verification.test.ts`
2. [ ] RLS: `npx vitest run tests/rls/`
3. [ ] Playwright smoke: `npm run test:smoke`
4. [ ] Manuálne: dvojklik schválenia → jeden e-mail (log Resend + jeden `action_run` succeeded); simulovaný timeout → `unknown` bez druhého sendu.

---

## 7. Rollback

- PR revert / flag `ACTION_CENTER_ENABLED=off`.
- DB: forward-only; tabuľky ostávajú (append-only, nič nemazať).
- Stará `outreach/send` cesta v tomto vydaní ostáva.

---

## 8. Effort

- [ ] S (<0.5 d) · [x] M (0.5–2 d) · [ ] L (2–5 d) · [ ] XL (>5 d)

---

## 9. Plan Mode artefakt

`docs/briefs/plans/BO-action-center-v0-plan.md`

---

## Stop podmienky (implementácia)

Zastav a nahlás, ak: neexistuje spôsob, ako trvalo uložiť schválenie · outbox by si vyžiadal nový deployable · diff sa dotkne `credits-billing.ts` alebo `stripe/**` · niektorý defekt D1–D6 sa na vtedajšom `origin/main` nepotvrdí · agent by checkoutol `feat/bridge-harness`.
