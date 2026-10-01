# Audit — onboarding / aktivácia (pred feat/onboarding-activation-emails)

**Dátum:** 2026-06-12 · **Baseline:** `main` @ post-#184  
**Kanonická špecifikácia po implementácii:** [activation-emails.md](./activation-emails.md)

---

## Čo už existuje (NEDUPLIKOVAŤ)

| Oblast | Súbory | Poznámka |
|--------|--------|----------|
| Buyer onboarding UI (9 krokov) | `src/app/onboarding/*` | Iný flow — buyer/roundtable, nie self-serve RK po checkoute |
| Legacy e-mail dispatch d1/d3/d7 | `onboarding-dispatch.ts`, `client_onboarding_messages` | Buyer MVP tabuľka; **nezmenené** |
| Legacy šablóny (AI copy) | `revolisCsSystem.ts`, `send-onboarding-email.ts` | Staré welcome/crm/ai — **nezmenené** |
| Onboarding monitor | `onboarding-monitor/`, `onboarding-mvp.ts` | Checklist/readiness pre interný monitor |
| Universal import wizard | `/import/universal` | **Použiť** ako deep link CTA |
| Morning brief | `morning_brief_settings`, cron | **Použiť** pre S2 detekciu |

---

## Čo Brief 8 Agent C ešte NEMAL na maine (stav pred Vlnou 1)

| Požiadavka | Stav pred PR | Doručené v |
|------------|--------------|------------|
| Self-serve wizard (3 kroky) | ❌ | [#189](https://github.com/onlinovosk-bit/RealitkaAI/pull/189) |
| S0–S4 activation-health | ❌ | [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) |
| D0/D2/D5/D7 aktivačné e-maily | ❌ | [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) |
| `ONBOARDING_EMAILS_ENABLED` | ❌ | [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) |
| Wizard ↔ milestone event log | ❌ | [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) |
| D5 founder rescue draft | ❌ | [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) |

**Poznámka:** [#183](https://github.com/onlinovosk-bit/RealitkaAI/pull/183) bolo uzavreté bez merge — implementácia pokračuje cez W + W2 stack.

---

## Wizard ↔ e-mail prepojenie (W2)

| Wizard akcia | Milestone node | Vplyv na S-stav |
|--------------|----------------|-----------------|
| `save-office` | `wizard_s0_office_saved` | S0 (profil uložený) |
| `advance` → krok 2 | `wizard_s0_import_step` | S0 |
| `advance` → krok 3 (import OK) | `wizard_s1_import_ready` | S1 |
| `advance` → krok 3 (bez importu) | `wizard_s2_brief_step` | S2 |
| `complete` | `wizard_s3_completed` | S3 |
| `skip` | `wizard_skipped` | S4 |

Detail: [activation-emails.md § Wizard milestone event log](./activation-emails.md#wizard-milestone-event-log-w2).
