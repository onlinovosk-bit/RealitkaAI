# Runbooks (P1 — Resilience Rules)

Repo je jediný zdroj pravdy pre prevádzku. Tieto súbory musia existovať pred
tým, než bus-factor = 1 spôsobí výpadok firmy.

| Súbor | Účel |
|---|---|
| [andy-dashboard-60min.md](./andy-dashboard-60min.md) | Andy dashboard blok — odblokovanie B1–B3 |
| [onboard-new-agency.md](./onboard-new-agency.md) | Onboarding 2. zákazníka (9 krokov) |
| [deploy-rollback.md](./deploy-rollback.md) | Deploy happy path + rollback poradie |
| [secrets-inventory.md](./secrets-inventory.md) | Názvy secretov a umiestnenia (nikdy hodnoty) |

## Súvisiace (mimo runbooks/)

| Súbor | Účel |
|---|---|
| `apps/crm/scripts/prod-smoke.md` | P3 — post-merge prod smoke |
| `src/lib/infra/platform-heartbeat.ts` | P4 — heartbeat signály + cron |
| `.github/pull_request_template.md` | P2 — PR brány |
| `docs/prompts/_build-order-template.md` | P5 — build order šablóna |
