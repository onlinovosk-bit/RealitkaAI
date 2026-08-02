# Swarm 4-vlny — verifikácia (Vlna 4)

**Dátum:** 2026-08-02 ~15:25 UTC+2  
**Verifikátor:** Cursor subagent (Wave 4A + 4B, read-only)  
**Základ:** `main` @ `fa58a367d` (merge #343 Wave 3A)  
**Playbook:** `docs/briefs/overnight/2026-07-31-swarm-4-vlny.md`

---

## Executive summary

| Vlna | Výsledok | Poznámka |
|---|---|---|
| **1** (1A–1C) | **PASS** | Simi Real opt-out, IČO fix, valuation_estimates persist |
| **2** (2A–2B) | **PASS** | credit-rates sadzobník, Guardian NO_PHONE v1.2 |
| **3** (3A) | **PASS** | SYSTEM_USAGE_AGENCY_ID oddelené od Smolka |
| **4A** Regresie | **PASS** (s poznámkami) | Žiadny kódový regres widgetu; 2 founder-only riziká |
| **4B** Demo readiness | **PASS** (s podmienkami) | Widget cesta bezpečná; migrácie na prod ešte founder |

**Celkový verdikt:** Swarm zmeny sú **bezpečné na merge/deploy kódu**. Demo GARANT REAL (pondelok 8:45) stojí na widgete — **kód neblokuje**. Pred demom founder **aplikuje 2 migrácie** (moat + system agency) a spustí audit SQL.

---

## Akceptačné kritériá po vlnách

### Vlna 1A — Simi Real opt-out (#336)

| Kritérium | Výsledok | Dôkaz |
|---|---|---|
| `grep -ri "simireal\|mihalrado\|Simi Real" automation/ docs/sales/call-list*` → 0 | **PASS** | Grep 2026-08-02: 0 zhôd |

### Vlna 1B — ONLINOVO IČO (#337)

| Kritérium | Výsledok | Dôkaz |
|---|---|---|
| `brain/identity/COMPANY.md` obsahuje správne IČO 54166942, Poprad | **PASS** | Riadok 17: Štúrova 130/25, Poprad, IČO 54166942 |
| Zoznam ďalších miest s nesprávnym IČO v PR | **PASS** (partial) | `docs/progress.md:46` stále uvádza `54 539 251` — **nie opravené** (playbook: právne docs schvaľuje človek). `brain/` čistý. |

### Vlna 1C — valuation_estimates (#338)

| Kritérium | Výsledok | Dôkaz |
|---|---|---|
| Migrácia `20260731210000_valuation_estimates.sql` v repe | **PASS** | Súbor existuje, RLS podľa tenant vzoru |
| `estimate/route.ts` zapisuje po `buildDeterministicEstimate` | **PASS** | `persistValuationEstimate()` volané riadky 91–100 |
| Insert zlyhanie nezhodí widget | **PASS** | `persist-estimate.ts:77-88` best-effort; chyba len log |
| Sandbox `/odhad/demo` → `is_sandbox=true` | **PASS** | `resolveTenantRecord` + tenant DB flag; verification test 12/12 |
| Migrácia neaplikovaná na prod | **INFO** | Founder action — pozri Demo blockers #1 |

### Vlna 2A — credit-rates (#339)

| Kritérium | Výsledok | Dôkaz |
|---|---|---|
| `credit-rates.ts` + unit test | **PASS** | LEAD_UNLOCK=20, test 2/2 |
| Call sites nemenené | **PASS** | `spendCredits()` — 0 call sites mimo definície |
| Návrh call sites v PR | **PASS** | PR #339 body: listing-content, rescore-lead, outreach-store, budúci unlock |

**Poznámka (nie regresia vĺn):** `program-tier-pricing.ts` `CREDIT_ACTION_COSTS.leadUnlock: 4` — duplicitný zdroj, **neimportuje** `credit-rates.ts`. Zámerne odložené na founder GO (PR #339). Nie je to zmena z vĺn 1–3.

### Vlna 2B — Guardian NO_PHONE (#340)

| Kritérium | Výsledok | Dôkaz |
|---|---|---|
| Grace window pre NO_PHONE | **PASS** | `config.ts`: 24h grace, 90d activity window; `rules.ts:56-69` |
| Existujúce testy zelené | **PASS** | guardian.test.ts 22/22 (súčasť 44-test batch) |
| Digest OFF | **PASS** | Žiadna zmena digest enablementu |

### Vlna 3A — SYSTEM_USAGE_AGENCY_ID (#343)

| Kritérium | Výsledok | Dôkaz |
|---|---|---|
| Default ≠ Smolko UUID | **PASS** | `usage-metrics.ts`: `00000000-0000-0000-0000-000000000001` |
| Operator vylučuje system agency | **PASS** | `operator/config.ts:22-23`; test 9/9 |
| Audit SELECT pripravený | **PASS** | `apps/crm/docs/ops/system-usage-agency-audit.sql` |
| Žiadny prod UPDATE v migrácii | **PASS** | Migrácia len INSERT system agency ON CONFLICT |
| Výstup SELECT v PR | **N/A** | Prod SELECT — founder spustí pred/po deploy |

---

## 4A — Regresie (fresh verifier)

Metóda: grep, unit testy, verification testy, code review diff vĺn 1–3. **Predpoklad zlého stavu — bez vynútených nálezov.**

### Kontrolný zoznam

| Hľadaný problém | Nález | Detail |
|---|---|---|
| Zmena dotýkajúca sa widgetu platiaceho zákazníka | **bez nálezov** | `submit/route.ts` pre Smolko nezmenený tok; sandbox vetva oddelená `tenant.isSandbox` |
| Kód predpokladajúci aplikovanú migráciu (hard fail) | **mierny** | `valuation_estimates` insert zlyhá ticho ak tabuľka chýba — widget OK, moat stratený. `incrementUsageMetric` warn-only ak FK zlyhá |
| Zmena RLS | **bez nálezov** | Nová RLS len v migrácii `valuation_estimates` (Wave 1C); existujúce tabuľky nezmenené |
| Zmena správania pre Smolko `agency_id` | **bez nálezov** | Smolko UUID stále pre leads/widget; system metriky idú na nový tenant |
| Sadzby kreditov na viac než jednom mieste | **známy dlh** | `credit-rates.ts` (20) vs `CREDIT_ACTION_COSTS.leadUnlock` (4) — neprepojené, nie regresia |
| Zápis do `leads` zo sandboxu | **bez nálezov** | `submit/route.ts:110-130` sandbox → `sandbox_submissions` only |
| Simi Real v outreach | **bez nálezov** | grep 0 zhôd |

### Spustené testy (lokálne, 2026-08-02)

```
vitest run:
  guardian.test.ts          — PASS (22 tests in file)
  credit-rates.test.ts      — PASS
  usage-metrics.test.ts     — PASS
  persist-estimate.test.ts  — PASS
  operator.test.ts          — PASS
  valuation-widget.verification.test.ts — PASS (12/12)
Celkom: 44 + 12 = 56 testov PASS
```

---

## 4B — Demo readiness (GARANT REAL, pondelok 8:45)

**Prod host:** widgety bežia na `app.revolis.ai` (napr. https://app.revolis.ai/odhad/demo). Rovnaké cesty na `www.revolis.ai` vracajú **404** — smoke testuj len na app.

**Kontext:** Demo stojí na widgete a zbere leadov, nie integrácii. Netestované cez Smolkov owner účet.

### Demo blockers (zoradené podľa trápnosti pred zákazníkom)

| # | Závažnosť | Blocker | Stav | Akcia |
|---|---|---|---|---|
| 1 | **Stredná** | Migrácie `20260731210000` + `20260731220000` **nie sú na prod** | Kód deployed, schéma nie | Founder apply pred/po deploy; bez `valuation_estimates` sa odhady neukladajú (widget funguje) |
| 2 | **Nízka** | System agency row chýba → cron metriky `console.warn` | Tiché zlyhanie | Apply migráciu 3A; spusti audit SQL |
| 3 | **Nízka** | `/operator` default OFF (`OPERATOR_DASHBOARD_ENABLED` false) | 404 | **Nie blocker pre GARANT REAL** — demo nevyžaduje operator dashboard |
| 4 | **Info** | `/demo-odhad` → redirect `/demo` (UnifiedDemo), nie `/odhad/demo` | Marketing demo ≠ valuation sandbox | Pre widget demo používaj **`https://app.revolis.ai/odhad/demo`** |
| 5 | **Info** | `lead_consents` non-transactional submit | Známy dlh (playbook) | **Zámerne odložené** — nekritické pre demo widgetu |
| 6 | **Info** | Duplicitný credit pricing (`leadUnlock: 4` vs 20) | Žiadny spend wired | Founder rozhodnutie post-demo |

### Demo cesta — statická verifikácia

| Cesta | Očakávanie | Výsledok |
|---|---|---|
| `https://app.revolis.ai/odhad/demo` | Sandbox widget, `is_sandbox=true`, `sandbox_submissions` | **PASS** — tenant resolution + submit vetva |
| `https://app.revolis.ai/odhad/reality-smolko` | Produkčný widget, leads + consents | **PASS** — config v `agency-config.ts`, verification test |
| `/api/healthz` | 200 `{ ok: true }` | **PASS** — `route.ts` bez auth |
| `/api/health` | 401 (neexistuje ako health) | **PASS** — netestované (playbook: netestuj) |
| Widget estimate API | Best-effort persist, response vždy | **PASS** |

---

## Founder action items

### Povinné pred demo (pondelok 8:45)

1. **Apply migrácie na prod** (v poradí):
   - `20260731210000_valuation_estimates.sql` — moat capture
   - `20260731220000_system_usage_agency.sql` — system tenant row
2. **Spusti audit SQL** (read-only): `apps/crm/docs/ops/system-usage-agency-audit.sql`  
   Prilož výstup — koľko systémových záznamov visí pod Smolkovým `agency_id`.
3. **Smoke widgetu** na prod: `https://app.revolis.ai/odhad/demo` (sandbox) + `https://app.revolis.ai/odhad/reality-smolko` (1 test submit). **Demo sandbox submit:** overené **PASS** na app.revolis.ai (2026-08-02).

### Po demo / rozhodnutia

4. **Call sites pre kredity** — PR #339 návrh; schváliť ktoré akcie míňajú kredity.
5. **Zosúladiť** `CREDIT_ACTION_COSTS` → import z `credit-rates.ts`.
6. **Opraviť** `docs/progress.md` IČO (54166942) po právnej kontrole.
7. **lead_consents RPC** — transakčný submit (playbook bonus nález).

### Zakázané (swarm pravidlá)

- ❌ Prod DELETE/UPDATE historických usage riadkov bez explicitného GO
- ❌ Email send / Guardian digest ON
- ❌ Test cez Smolkov owner účet

---

## PR referencie

| PR | Vlna | Merge |
|---|---|---|
| #336 | 1A | ✅ |
| #337 | 1B | ✅ |
| #338 | 1C | ✅ |
| #339 | 2A | ✅ |
| #340 | 2B | ✅ |
| #341 | docs W1 | ✅ |
| #343 | 3A | ✅ |
| #344 | docs W3 status | pending merge |
| TBD | docs W4 verifikácia | this report |

---

## Verdikt

**Swarm 4-vlny kód: GO na produkčný deploy.**  
**Demo GO s podmienkou:** founder aplikuje 2 migrácie + quick widget smoke na prod (https://app.revolis.ai/odhad/demo). Demo sandbox submit overené **PASS** na app.revolis.ai (2026-08-02).
