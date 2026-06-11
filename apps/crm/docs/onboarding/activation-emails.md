# Aktivačná onboarding sekvencia (D0–D7) — živá špecifikácia

**Implementácia:** `apps/crm/src/lib/activation/*`  
**Cron:** `GET /api/cron/activation-health` (registrácia v PR popise)  
**Flag:** `ONBOARDING_EMAILS_ENABLED` — default **OFF**

Aktivácia = import kontaktov + ≥1 skórovaný lead + ranný report zapnutý.

## Stavy (S0–S4)

| Stav | Podmienka |
|------|-----------|
| S0 | bez dokončeného importu (`import_jobs.status=done`, `imported_rows>0`) |
| S1 | import OK, žiadny lead so `score>0` |
| S2 | leady skórované, `morning_brief_settings.enabled=false` |
| S3 | aktivovaný — sekvencia stop (okrem D7 gratulácie) |
| S4 | D≥5, stále S0/S1, bez prihlásenia 72 h |

## Trigger tabuľka

| Uzol | Deň | Stav | CTA deep link | Stop / suppression |
|------|-----|------|---------------|-------------------|
| d0 | D0 | ≠S3 | `/import/universal` | max 1×; nie ak opt-out |
| d2_s0 | D2–4 | S0 | `/import/universal` | + reply concierge |
| d2_s1 | D2–4 | S1 | `/leads` | |
| d2_s2 | D2–4 | S2 | `/settings` | |
| d5_progress | D5–6 | S1/S2 | `/team` | |
| d5_founder_draft | D5–6 | S4 | draft → `FOUNDER_EMAILS` | **nie auto-send zákazníkovi** |
| d7_activated | D≥7 | S3 | `/leads` | len raz |

**Suppression:** max 1 odoslaný e-mail na agentúru za UTC deň; unique index `agency_id + node + date`.

## Metriky

SQL view: `activation_email_metrics` (po migrácii `20260612140000_activation_email_events.sql`).

## Legacy (nedotknuté)

- `onboarding-dispatch.ts` / `client_onboarding_messages` — buyer d1/d3/d7
- `revolisCsSystem.ts` — staré šablóny s AI copy

## Audit pred implementáciou

`docs/onboarding/ACTIVATION-AUDIT.md`
