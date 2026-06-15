# Audit — onboarding / aktivácia (pred feat/onboarding-activation-emails)

**Dátum:** 2026-06-12 · **Baseline:** `main` @ post-#178

## Čo už existuje (NEDUPLIKOVAŤ)

| Oblast | Súbory | Poznámka |
|--------|--------|----------|
| Buyer onboarding UI (9 krokov) | `src/app/onboarding/*` | Iný flow — buyer/roundtable, nie self-serve RK po checkoute |
| Legacy e-mail dispatch d1/d3/d7 | `onboarding-dispatch.ts`, `client_onboarding_messages` | Buyer MVP tabuľka; **nezmenené** |
| Legacy šablóny (AI copy) | `revolisCsSystem.ts`, `send-onboarding-email.ts` | Staré welcome/crm/ai — **nezmenené** |
| Onboarding monitor | `onboarding-monitor/`, `onboarding-mvp.ts` | Checklist/readiness pre interný monitor |
| Universal import wizard | `/import/universal` | **Použiť** ako deep link CTA |
| Morning brief | `morning_brief_settings`, cron | **Použiť** pre S2 detekciu |

## Čo Brief 8 Agent C ešte NEMAL na maine

| Požiadavka | Stav pred PR |
|------------|--------------|
| Self-serve wizard (3 kroky) | ❌ neimplementovaný |
| S0–S4 activation-health | ❌ |
| D0/D2/D5/D7 aktivačné e-maily | ❌ |
| `ONBOARDING_EMAILS_ENABLED` | ❌ |
| Event log + metriky view | ❌ |
| D5 founder rescue draft | ❌ |

## Kanonická špecifikácia po implementácii

`docs/onboarding/activation-emails.md` (copy + trigger tabuľka)
