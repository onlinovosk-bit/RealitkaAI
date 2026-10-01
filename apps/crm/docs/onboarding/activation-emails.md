# Aktivačná onboarding sekvencia (D0–D7) — živá špecifikácia

**Implementácia:** `apps/crm/src/lib/activation/*`  
**Cron:** `GET /api/cron/activation-health`  
**Flag:** `ONBOARDING_EMAILS_ENABLED` — default **OFF**  
**Wizard flag:** `ONBOARDING_WIZARD_ENABLED` — default **OFF** (viz [#189](https://github.com/onlinovosk-bit/RealitkaAI/pull/189))

Aktivácia = import kontaktov + ≥1 skórovaný lead + ranný report zapnutý.

**Súvisiace PR:** [#183](https://github.com/onlinovosk-bit/RealitkaAI/pull/183) (closed — subset), [#189](https://github.com/onlinovosk-bit/RealitkaAI/pull/189) (wizard), [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) (wizard ↔ e-mail wiring).  
**Audit pred implementáciou:** [ACTIVATION-AUDIT.md](./ACTIVATION-AUDIT.md)  
**Overnight report:** [OVERNIGHT-REPORT-9.md](../OVERNIGHT-REPORT-9.md)

---

## Stavy (S0–S4)

| Stav | Podmienka |
|------|-----------|
| S0 | bez dokončeného importu (`import_jobs.status=done`, `imported_rows>0`) |
| S1 | import OK, žiadny lead so `score>0` |
| S2 | leady skórované, `morning_brief_settings.enabled=false` |
| S3 | aktivovaný — sekvencia stop (okrem D7 gratulácie) |
| S4 | D≥5, stále S0/S1, bez prihlásenia 72 h |

---

## Trigger tabuľka (D0–D7 cron)

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

---

## Wizard milestone event log (W2)

Wizard kroky (`save-office`, `advance`, `skip`, `complete`) emitujú milestone uzly do checklistu a event logu.
Kód: `apps/crm/src/lib/activation/wizard-events.ts` ([#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193)).

| Node | Wizard step | Typický S-stav |
|------|-------------|----------------|
| `wizard_s0_office_saved` | 1 → 2 | S0 |
| `wizard_s0_import_step` | 2 | S0 |
| `wizard_s1_import_ready` | 2 → 3 (import OK) | S1 |
| `wizard_s2_brief_step` | 3 | S2 |
| `wizard_s3_completed` | complete | S3 |
| `wizard_skipped` | skip | S4 |

**Persistencia:**

- `client_onboarding_progress.checklist.activationMilestones` — plný audit trail
- `activation_email_events` — best-effort insert (`status=skipped_flag`, `meta.eventType=wizard_milestone`)

D0–D7 cron sekvencia naďalej číta live agency snapshot cez `classifyActivationState` — wizard milestone **neduplikuje** odoslanie D-uzlov, len loguje prehľad pre founder metriky.

---

## Login redirect

Client login (`app/login/page.tsx`) routuje na `/post-login` (nie `proxy.ts` — auth denylist, viz [AUTOMERGE-POLICY.md](../../../../docs/AUTOMERGE-POLICY.md)).  
`/post-login` volá `loadWizardGateContext` keď `ONBOARDING_WIZARD_ENABLED=true`.

---

## Metriky

SQL view: `activation_email_metrics` (po migrácii `20260612140000_activation_email_events.sql`, ak je v stacku).

---

## Legacy (nedotknuté)

- `onboarding-dispatch.ts` / `client_onboarding_messages` — buyer d1/d3/d7
- `revolisCsSystem.ts` — staré šablóny s AI copy
