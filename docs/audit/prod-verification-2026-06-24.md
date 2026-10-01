# PROD verification audit — 2026-06-24

Agent-run checks (no Smolko browser session).

## Overené agentom

| Položka | Výsledok | Dôkaz |
|---------|----------|--------|
| Vitest Guardian (panel-map, href, panel) | **12/12 pass** | lokálny `npm run test` |
| `npm run build` | **green** | lokálny build |
| Tenant health (PROD DB read) | **OK** | `npm run ops:tenant-health`: 439 leadov, 94 properties, `manual_plan=market_vision`, owner `rastislav.smolko@gmail.com` linked |
| PR #241 | **merged** | main @ prior session |
| Schema Guard workflow_dispatch | **FAIL** | chýbajú `SCHEMA_GUARD_*` secrets v GitHub Actions |
| PROD `/api/cron/realvia-process` + lokálny `CRON_SECRET` | **401** | lokálny secret ≠ Vercel Production `CRON_SECRET` |
| PROD Guardian browser smoke | **BLOCKED** | `.env.local` `TEST_USER_*` ≠ Smolko owner; login timeout na app.revolis.ai |

## Guardian PROD smoke (5/5) — stále na Andy

Skript pripravený: `apps/crm/scripts/prod-guardian-smoke-once.mjs`  
Spusti s **Smolko** creds v `.env.local` (`rastislav.smolko@gmail.com`):

```powershell
cd apps/crm
# dočasne nastav TEST_USER_EMAIL/PASSWORD na Smolko účet
node scripts/prod-guardian-smoke-once.mjs
# výstup: docs/audit/prod-guardian-smoke-latest.json
```

## Ostáva len na človeka

- Guardian PROD 5/5 (Smolko login + klik bod 4)
- Lemon Squeezy Share
- Tomáš / dual export Realvia ↔ Revolis
- cron-job.org: overiť job + **Production** `CRON_SECRET` (nie lokálny)
- GitHub secrets: `SCHEMA_GUARD_SUPABASE_URL`, `SCHEMA_GUARD_SERVICE_ROLE_KEY`
- Realvia re-test (Lýdia Bereczová)
- PR triage (#217, #198, #192, #191, #189, #186, #173, #155, #72)
