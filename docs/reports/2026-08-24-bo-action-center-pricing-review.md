# Review — Action Center V0 + Pricing Migration v2 (spec only)

**Date:** 2026-08-24  
**Mode:** REVIEW ONLY — no runtime, no Stripe, no PR merge of product code  
**Source upload:** `BOactioncenterv0apricingmigration.md`  
**Canonical BOs:** `docs/briefs/BO-action-center-v0.md`, `docs/briefs/BO-pricing-migration-v2.md`  
**Worktree:** `/tmp/revolis-bo-ac-pricing` from freshly fetched `origin/main`  
**Vetva:** `cursor/bo-action-center-pricing-db1f`  
**feat/bridge-harness:** nepoužitý (žiadny checkout/switch/reset)

---

## 0. Fresh fetch — povinný pred baseline tvrdením

| Položka | Hodnota |
|---|---|
| Príkaz | `git fetch origin main` (2026-08-24, táto session, pred zápisom BO) |
| Overený SHA | `47ec485275166f00671945ed3fd928fac5271508` |
| Subject | `fix(ui): make topbar search functional, add Hľadať button (#461)` |
| SHA v zdrojovom BO (`platné_voči`) | `47ec485275166f00671945ed3fd928fac5271508` |
| Porovnanie | **ZHODA** |
| `scripts/ruflo-model-bridge` na tomto SHA | neexistuje |

Lokálne `/workspace` origin/main pred fetchom mohlo byť zastarané; **tento** SHA je ten, voči ktorému sú D1–D6 a ceny overené.

`GO IMPLEMENT ACTION CENTER V0` a `GO IMPLEMENT PRICING V2` v BO a v tomto reporte sú **názvy budúcich príkazov**. Nie sú udelené.

---

## 1. Kontrolór — tvrdenia

| Tvrdenie | Nálepka | Verdikt | Dôkaz |
|---|---|---|---|
| `origin/main` = `47ec4852…` | FAKT | PASS | fetch + `git rev-parse origin/main` |
| D1 in-memory `Map` | FAKT | PASS | `human-approval.ts:3` |
| D2 send = `leadId` → send | FAKT | PASS | `outreach/send/route.ts` |
| D3 generate až po approve | FAKT | PASS | `approve/route.ts` → `sendAiOutreachEmail` → `generateOutreachEmail` v `outreach-store.ts:208` |
| D4 `body_hash` bez UNIQUE | FAKT | PASS | `20260610000001_ai_action_audit.sql` — dva indexy, žiadny UNIQUE |
| D5 audit bez stavového automatu | FAKT | PASS | tá istá migrácia |
| D6 kredity fail-open | FAKT | PASS | `spend-for-action.ts` default off |
| D1+D2+D3 = nie je schvaľovací tok | FAKT | PASS | z D1–D3 |
| Seat SSOT 79/71/63 | FAKT | PASS | `PLAN_PRICES_EUR` |
| Cockpit 349, Pro disabled, founder 249 | FAKT | PASS | `COCKPIT_PRODUCTS` |
| Mojibake `:263` | FAKT | PASS | `billing-store.ts` |
| Dôvod 349 € v `memory/decisions.md` | FAKT (chýba) | PASS ako dlh | číslo v `pricing-v1.md:24` |
| Volume 20 % → 11 % | FAKT (aritmetika) | PASS | `(79−63)/79`, `(89−79)/89` |
| Stripe ceny sú inclusive | PREDPOKLAD / founder 2026-08-24 | FLAG | v kóde `tax_behavior` nie je; live Stripe neoverené |
| DPH 23 % | PREDPOKLAD | FLAG | stop v BO-B |
| Aktívne predplatné na starých Price | NEZNÁME | STOP pred env switch | treba Stripe list |
| Q1 Action Center „nie priamo“ + verdikt BUILD | FLAG | FLAG | Ústava: NIE → strop VALIDATE; founder spec to berie ako safety gate |
| Zdrojový BO vymenoval všetky hardcoded 79 | PREDPOKLAD | FLAG | chýbajú `smart-active-program-features.test.ts`, `billing/page.tsx` map (doplnené), marketing/legal (OUT) |
| FeatureComparisonTable má hardcoded ceny | PREDPOKLAD v zdroji | FLAG | v súbore nie sú literály 79/71/63; upgrade page berie `priceEur` z configu |

---

## 2. Verdikt

**PASS ako specification check-in.** Defekty D1–D6 a dnešný cenník sedia na overenom SHA.

**STOP na implementáciu** — chýba samostatná founder správa s frázou.  
**STOP na Stripe env** — `tax_behavior` v Dashboarde neoverené z tohto prostredia.  
**FLAG** — Ústava Q1 vs BUILD; objemová zľava 20→11 čaká explicitné „je to zámer“; marketing/VOP mimo úzkeho CRM PR.

Meta 1 (nerobiť AC V0): dá sa ďalej posielať cez D2. To je presne dôvod BO.  
Meta 2: migrácia cien bez grandfatheringu je ťažko vratná voči zákazníkovi — preto nové Price, staré nemazať.  
Meta 3: natlačiť stav do `ai_action_audit` by bol drift; BO to zakazuje.

---

## 3. Čo overiť pred `GO IMPLEMENT`

**Pricing V2:** Stripe Dashboard `tax_behavior` na aktuálnych seat Price; zoznam aktívnych subscription vs staré Price ID; účtovníctvo 23 %; potvrdenie volume discount.

**Action Center V0:** nič navyše k D1–D6 na tomto SHA; po posune `main` zopakovať šesť greppov.

**Nemerge** produktový kód z tohto PR — tento PR je docs.
