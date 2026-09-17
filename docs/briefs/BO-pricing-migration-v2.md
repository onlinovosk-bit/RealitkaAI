# Build Order — Pricing Migration v2

**Status:** INTEGRATION REPORT — specification only  
**Kategória:** Commercial / Billing  
**Cieľ:** Nový self-serve seat cenník 89 / 83 / 79 € s DPH (`tax_behavior: inclusive`) na **nových** Stripe Price objektoch; existujúci zákazníci ostanú na grandfathered cene, kým founder nerozhodne inak.

**Founder spec GO:** 2026-08-24 — Stripe ceny potvrdené ako **s DPH**; nový cenník 89/83/79 potvrdený  
**Implementačný GO:** **NEUDELENÝ**  
**Autorizačná fráza (budúca, nie teraz):** `GO IMPLEMENT PRICING V2`  
Táto fráza v tomto dokumente **nie je** udelené GO. Platné GO musí prísť neskôr ako samostatná founder správa. **Nezahŕňa** Action Center V0.

**platné_voči (overené fetchom):** `origin/main` = `47ec485275166f00671945ed3fd928fac5271508` (2026-08-24)

Nezávislé od BO-A. Odporúčané poradie vykonania: **B potom A**. Runtime až po vlastnej fráze.

---

## 0. Gate check (Ústava + Prime Directive)

| Otázka | Odpoveď |
|--------|---------|
| Posúva ďalšieho platiaceho klienta / retenciu? | Áno — komerčný cenník, ktorým sa predáva seat. |
| Timing OK (nie „príliš skoro")? | Áno, ak Stripe `tax_behavior` a sadzba DPH 23 % sú potvrdené **pred** prepnutím env. |
| Verdikt | **BUILD** po `GO IMPLEMENT PRICING V2`. Tento check-in je spec. |

**Obchodná poznámka (founder musí potvrdiť, že je to zámer):** dnešný rozptyl 79 → 63 je **20 %** zľava za objem `(79−63)/79`. Nový 89 → 79 je **11 %** `(89−79)/89`. Prechod 3 → 10 seatov je rastový skok, pri ktorom sa odomyká Owner Cockpit (min. 3 seaty).

Zapíš do `memory/decisions.md` pri implementácii: nielen nové čísla, ale aj **dôvod Owner Cockpitu 349 €** (dnes číslo žije, dôvod nie).

---

## 1. Integration Report (povinné pred kódom)

Baseline `47ec485275166f00671945ed3fd928fac5271508`:

| Položka | Existuje? | Cesta / rozhodnutie |
|---------|-----------|---------------------|
| SSOT seat cien | Áno | `apps/crm/src/lib/program-tier-pricing.ts` — `PLAN_PRICES_EUR` 79/71/63 |
| Owner Cockpit | Áno | `COCKPIT_PRODUCTS.owner.priceEur = 349`, `enabled: true`; Pro 499 `enabled: false`; founder 249 |
| Seat prahy | Áno | 1 / 3 / 10 — **nemeniť** |
| Founder pool | Áno | `FOUNDER_KANCELARIE_POOL_*` — **nemeniť** |
| Stripe Price IDs | Áno (env) | `STRIPE_PRICE_SOLO_SEAT` / `TEAM` / `OFFICE` |
| `tax_behavior` v kóde | Nie | V `apps/crm/src` **nie je** `tax_behavior` ani `inclusive` (okrem nesúvisiacich dátumov). Live Stripe = **NEZNÁME** do Dashboard/API overenia. |
| Mojibake | Áno | `apps/crm/src/lib/billing-store.ts:263` — `"PouĹľĂ­vateÄľ nemĂˇ email."` |
| Decision record 349 € | Nie | Číslo v `apps/crm/docs/pricing-v1.md:24`; dôvod v `memory/decisions.md` chýba |

**Jediná nová vec:** nové Stripe Price objekty (natívne Stripe API, nie nový kódový modul). Repo zmena = reuse `PLAN_PRICES_EUR` + zobrazené ceny + testy + decision record.

`apps/crm/src/lib/program-tier-pricing.ts` je automerge **denylist → Tier 3**. Merge = founder.

---

## 2. Verification map (plán → test → kód)

| # | Akceptačné kritérium (merateľné) | Verification test | Playwright smoke | Vitest unit |
|---|----------------------------------|-------------------|------------------|-------------|
| 1 | `PLAN_PRICES_EUR` = 89 / 83 / 79 | nový assert v `tests/verification/billing-credits.verification.test.ts` **alebo** `program-tier-pricing.verification.test.ts` | — | `src/lib/__tests__/program-tier-pricing.test.ts` |
| 2 | Hardcoded 79/71/63 v CRM billing UI zmiznú | verification (grep invariant) | — | — |
| 3 | `smart-active-program-features.test.ts` očakáva nové seat čísla | — | — | ten súbor (zdrojový BO ho **neuviedol** — doplnené) |
| 4 | Owner Cockpit ostáva 349; Pro disabled | verification | — | `program-tier-pricing.test.ts` (už 349/499) |
| 5 | `credits-billing.ts` a `stripe/**` sa v diffe **nemennia** | verification (path deny) | — | — |
| 6 | Mojibake riadok opravený na platné UTF-8 | grep verification | — | — |

Živá špecifikácia: zmena cien v **tom istom PR** ako testy.

---

## 3. Dátový predpoklad

- [x] Zdroj cien: interný cenník, nie kataster/portál.  
- [ ] GDPR: netýka sa nových PII.  
- [ ] Stripe live `tax_behavior` = **NEZNÁME** (stop podmienka).  
- [ ] Účtovníctvo 23 % DPH = **PREDPOKLAD** do potvrdenia.  
- [ ] Aktívne predplatné na starých Price = **NEZNÁME** do Stripe listu.

---

## 4. Scope

### IN — cenník (founder zdroj + doplnený inventár z `origin/main`)

| Súbor | Zmena | Tier |
|---|---|---|
| `apps/crm/src/lib/program-tier-pricing.ts` | `PLAN_PRICES_EUR` 79/71/63 → 89/83/79 | **denylist → Tier 3** |
| `apps/crm/docs/pricing-v1.md` | tabuľka Vrstva 1 | docs |
| `brain/identity/COMPANY.md` | riadok 50 | docs |
| `apps/crm/src/components/billing/ProgramComparison.tsx` | hardcoded „79 / 71 / 63“ | UI |
| `apps/crm/src/components/billing/FeatureComparisonTable.tsx` | zobrazené ceny (ak číta SSOT, overiť že sa nehardcoduje) | UI |
| `apps/crm/src/app/(dashboard)/upgrade/page.tsx` | zobrazené ceny | UI |
| `apps/crm/src/app/(dashboard)/billing/page.tsx` | map `starter/active_force/enterprise/market_vision` **79/71/63/63** | UI |
| `apps/crm/src/lib/__tests__/program-tier-pricing.test.ts` | očakávané hodnoty | test |
| `apps/crm/src/lib/__tests__/smart-active-program-features.test.ts` | `toBe(79)` / `toBe(71)` | test — **chýbalo v zdrojovom BO** |
| `memory/decisions.md` | pricing decision + dôvod 349 € | docs |
| `apps/crm/src/lib/billing-store.ts:263` | oprava mojibake | billing copy, nie Stripe charge path |

### OUT (neničiť v tomto PR, kým GO nerozšíri)

Verejné / marketing / legal stále ukazujú 79 — **nepatria do úzkeho CRM PR**, ale pred zákazníckym oznámením musia sedieť:

- `apps/crm/src/app/(public)/terms/page.tsx` — „Solo Seat (79 €/mes/maklér)“
- `apps/crm/docs/legal/VOP-vseobecne-obchodne-podmienky.md`
- `apps/marketing/components/LeadCaptureModal.tsx`, `demo/DemoSections.tsx`, `apps/marketing/app/zakulisie/[token]/page.tsx`
- `docs/pricing/credit-topup-proposal.md`

**Nemeniť:** prahy 1/3/10 · founder pool 249 · Owner Cockpit 349 · Owner Pro disabled · `credits-billing.ts` · mazanie starých Stripe Price.

### Stripe postup (až po GO)

1. Vytvoriť **nové** Price s `tax_behavior: inclusive`.  
2. Staré **nemazať** — grandfather.  
3. Prepínať env `STRIPE_PRICE_SOLO_SEAT` / `TEAM` / `OFFICE`.  
4. Sadzba 23 % zosúladiť s účtovníctvom **pred** produkčným prepnutím.

`tax_behavior` sa po použití Price objektu nedá spoľahlivo prepnúť — preto nové objekty, nie edit starých.

| Stupeň | Dnes (s DPH) | Nový (s DPH) | Zmena | Bez DPH pri 23 % |
|---|---|---|---|---|
| SOLO (od 1) | 79 € | **89 €** | +12,7 % | 72,36 € |
| TEAM (od 3) | 71 € | **83 €** | +16,9 % | 67,48 € |
| OFFICE (od 10) | 63 € | **79 €** | +25,4 % | 64,23 € |
| Owner Cockpit | 349 € | **349 €** | bez zmeny | 283,74 € |

### Decision record — Owner Cockpit 349 € (zapísať pri implementácii)

Seat monetizuje používanie maklérom. Cockpit monetizuje riadenie firmy. Cena sa neobhajuje počtom obrazoviek, ale tým, že jeden zachránený obchod zaplatí viac mesiacov. Oddelenie zvyšuje ARPA a dáva čistejšiu SaaS štruktúru. **Číslo bez tohto odseku v `memory/decisions.md` sa nesmie považovať za uzavreté.**

---

## 5. Brány (GO zostáva ľudské)

| Brána | Kto | Kedy |
|-------|-----|------|
| Integration Report | Founder | tento check-in |
| Potvrdenie objemovej zľavy 20 % → 11 % | Founder | pred GO IMPLEMENT |
| Stripe `tax_behavior: inclusive` overené v Dashboarde | Founder / ops | pred env switch |
| Účtovníctvo 23 % | Founder | pred prod |
| `GO IMPLEMENT PRICING V2` | Founder | pred runtime / env |
| Merge | Founder | Tier 3 |
| Prod env switch | Founder | samostatný GO |

---

## 6. Acceptance = Running

1. [ ] `npx vitest run src/lib/__tests__/program-tier-pricing.test.ts src/lib/__tests__/smart-active-program-features.test.ts tests/verification/billing-credits.verification.test.ts`
2. [ ] Playwright smoke (billing/upgrade routy)
3. [ ] Stripe: nové Price ID v test/sandbox, `tax_behavior=inclusive`, staré ID stále existujú
4. [ ] Checkout nového seat predplatného v sandbox ukáže 89/83/79 s DPH
5. [ ] Chybová hláška bez e-mailu je čitateľná slovenčina (nie mojibake)

---

## 7. Rollback

- Env vrátiť na staré Price ID (staré objekty ostávajú).  
- Repo revert `PLAN_PRICES_EUR` + UI.  
- Nemaže sa žiadne predplatné.

---

## 8. Effort

- [x] S (<0.5 d) · [ ] M · [ ] L · [ ] XL  — repo + testy. Stripe Dashboard + účtovníctvo mimo tohto odhadu.

---

## 9. Plan Mode artefakt

`docs/briefs/plans/BO-pricing-migration-v2-plan.md`

---

## Stop podmienky (implementácia)

Zastav a nahlás, ak: v Stripe je `tax_behavior` iné než `inclusive` · existujú aktívne predplatné na starých Price a nie je rozhodnuté o grandfatheringu · účtovníctvo nepotvrdilo 23 % · zmena by sa dotkla `credits-billing.ts` · agent by zmenil Owner Cockpit 349 bez decision recordu.
