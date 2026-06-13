# `lib/activation` — onboarding aktivácia (e-maily + wizard)

**Stav:** modul **nie je na `main`** — doručený cez otvorené PR [#189](https://github.com/onlinovosk-bit/RealitkaAI/pull/189) (wizard) a [#193](https://github.com/onlinovosk-bit/RealitkaAI/pull/193) (W2 wiring).

## Plánovaná štruktúra (vetva `feat/onboarding-wizard`)

| Súbor | Účel |
|-------|------|
| `flags.ts` | `ONBOARDING_WIZARD_ENABLED` — default **OFF** vo všetkých env |
| `wizard-gate.ts` | `/post-login` redirect → `/get-started/N` alebo `/dashboard` |
| `sequence.ts` | D0–D7 activation kroky (e-mailová sekvencia) |
| `dispatch.ts` | Odoslanie activation e-mailov (Resend) — **flag-gated** |
| `gather-snapshot.ts` | Snapshot agentúry pre personalizáciu |
| `email-templates.ts` | Šablóny bez AI zmienok |
| `health.ts` | Health check activation pipeline |

## W2 doplnky (#193)

| Súbor | Účel |
|-------|------|
| `wizard-events.ts` | Mapovanie wizard krokov → S0–S4 milestone |
| Event log | `activation_email_events` (migrácia z #183) — best-effort insert |

## Dokumentácia

- `apps/crm/docs/onboarding/activation-emails.md` — špec D0–D7 + wizard milestones
- `apps/crm/docs/onboarding/ACTIVATION-AUDIT.md` — audit stavu vs Brief 8.0

## STOP pravidlá

- Žiadne auto-send zákazníkom bez explicitného flagu ON
- Auth routes (`login/actions.ts`) — denylist; redirect cez `login/page.tsx` + `/post-login`
