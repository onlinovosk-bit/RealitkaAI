# FEATURE-VERIFICATION-REPORT — Overnight Brief 6.0

**Dátum:** 2026-06-11  
**Vetva:** `chore/feature-verification-6` (z `origin/main`)  
**Zdroj auditu:** `apps/crm/docs/qa/feature-audit-2026-06-03.md`  
**Metóda:** Vitest overenie čistej logiky / lib modulov / route handlerov bez produkčnej DB.

## Legenda overeného stavu

| Stav | Význam |
|------|--------|
| **FUNGUJE** | Logika prešla lokálnym testom; správanie zodpovedá očakávaniu |
| **FUNGUJE-MOCK** | Kód existuje; test overuje fallback/demo/mock vetvu alebo vyžaduje mock DB/API |
| **ROZBITÉ** | Test alebo kód odhalil regresiu / nekonzistentné správanie |
| **GATED** | Funkcia závisí od tier/env flagu; defaultne vypnutá alebo zamknutá |
| **NETESTOVATEĽNÉ LOKÁLNE** | Modul na `main` chýba alebo vyžaduje prod DB / externé služby |

## Súhrn počtov (17 features)

| Stav | Počet |
|------|------:|
| FUNGUJE | 7 |
| FUNGUJE-MOCK | 6 |
| GATED | 3 |
| NETESTOVATEĽNÉ LOKÁLNE | 1 |
| ROZBITÉ | 0 |

**Test beh:** `npm test -- tests/verification` → **17 súborov / 40 testov PASS**

---

## Tabuľka overenia

| Feature | Audit class | Verified state | Evidence (test path) | Recommended TASK |
|---------|-------------|----------------|----------------------|------------------|
| AI triage / lead scoring | PARTIAL | **FUNGUJE** | `tests/verification/lead-triage-scoring.verification.test.ts` | Deprecate legacy `/api/scoring`; zjednotiť BRI vs `leads.score` |
| Morning Brief backend | PARTIAL | **FUNGUJE-MOCK** | `tests/verification/morning-brief.verification.test.ts` | Settings page v app routes; Resend/E2E smoke; zapnúť LLM path smoke |
| Follow-up sweep (W2) | PARTIAL | **FUNGUJE** | `tests/verification/follow-up-sweep.verification.test.ts` | Cron E2E s `FOLLOWUP_MODE=draft`; overiť meta bump v DB |
| CRM import column detector | PARTIAL | **FUNGUJE** | `tests/verification/column-detector.verification.test.ts` | Universal import prod E2E (Playwright už existuje) |
| Seller Rescue churn-score | PARTIAL | **FUNGUJE** | `tests/verification/seller-rescue.verification.test.ts` | Deploy `seller-rescue` cron + UI surfacing v dashboard |
| CEO Command (director brief) | PARTIAL | **FUNGUJE-MOCK** | `tests/verification/ceo-command.verification.test.ts` | Napojiť `ceo_command` notifikácie na UI; owner-only route |
| Team gating `manual_plan` | PARTIAL | **FUNGUJE** | `tests/verification/team-gating-manual-plan.verification.test.ts` | RLS smoke pre Smolko tenant; sync Stripe ↔ manual_plan |
| Forecast gating (`canViewForecast`) | PARTIAL | **GATED** | `tests/verification/forecast-gating.verification.test.ts` | Upsell CTA audit na `/forecasting`; preview tier smoke |
| Dashboard insights cron lib | ATRAPA / PARTIAL | **FUNGUJE-MOCK** | `tests/verification/dashboard-insights-cron.verification.test.ts` | Nahradiť hardcoded `/api/dashboard/insights` LLM + cache cron |
| Routine notifications store | PARTIAL | **FUNGUJE-MOCK** | `tests/verification/notifications-store.verification.test.ts` | Inbox UI pre `routine_notifications`; seed pre CI ak treba |
| Decision feature flags | PARTIAL | **GATED** | `tests/verification/decision-flags.verification.test.ts` | Dokumentovať prod enable checklist; staging smoke pred `=true` |
| Demo-ops lib | NEPOSTAVENÉ (main) | **NETESTOVATEĽNÉ LOKÁLNE** | `tests/verification/demo-ops.verification.test.ts` | Merge demo-ops PR; potom Calendly/UTM unit testy |
| Prospecting ICP scoring (root) | PARTIAL | **FUNGUJE** | `tests/verification/prospecting-scoring.verification.test.ts` | Napojiť export do CRM ingest; nightly enrich cron |
| Stealth Recruiter filters | PARTIAL | **FUNGUJE-MOCK** | `tests/verification/stealth-recruiter.verification.test.ts` | `STEALTH_RECRUITER_DEMO_MODE=false` prod; cron v `vercel.json` |
| Call analyzer | PARTIAL → LIVE | **FUNGUJE-MOCK** | `tests/verification/call-analyzer.verification.test.ts` | E2E s reálnym prepisom + Claude mock v CI |
| Team visibility gating | PARTIAL | **FUNGUJE** | `tests/verification/team-visibility.verification.test.ts` | `multiTeam` billing gate + manager assign smoke |
| Arbitrage demo guard | PARTIAL + ATRAPA | **GATED** | `tests/verification/arbitrage-demo-guard.verification.test.ts` | `useLive: true` v AcquisitionHub; cron `arbitrage-scan` |

---

## Poznámky k rozdielom oproti auditu 2026-06-03

1. **Decision flags** — na `main` sú default **OFF** vo všetkých env (opt-in cez `DECISION_*_ENABLED=true`). Audit spomínal auto-on na Vercel preview/prod; kód bol sprísnený.
2. **Morning Brief** — backend gather/assemble vyžaduje Supabase; overený je exportovaný **fallback text** (`buildDeliveryFallbackText`).
3. **Dashboard insights** — cron lib + `buildDataFallback` FUNGUJE; legacy route s hardcoded SK textom zostáva ATRAPA (mimo scope unit testu).
4. **Demo-ops** — na `origin/main` **neexistuje** `apps/crm/src/lib/demo-ops/`; lokálny WIP môže byť prítomný necommitnutý.

---

## PR checklist

- [x] Vetva `chore/feature-verification-6` z `origin/main`
- [x] ≥15 features s evidenciou v `tests/verification/`
- [x] `npm test -- tests/verification` zelené
- [ ] Full `npm test` (vitest `src/**`) — spustiť pred merge
- [ ] Vercel Preview + smoke `tests/smoke.spec.ts` pred merge do `main`

**Odporúčaný ďalší krok:** 1 PR = 1 logická zmena podľa rizika v stĺpci Recommended TASK (začať Dashboard insights LLM + legacy route deprecate).
