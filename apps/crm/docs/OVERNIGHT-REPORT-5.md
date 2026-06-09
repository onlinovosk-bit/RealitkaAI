# Overnight Report 5.0 — 2026-06-10
Agenti U, V, W, X, Y | Brief 5.0 | Cursor orchestration

## AGENT-U — Notifications + FK Fix
Status: **DONE**
PR: [#156](https://github.com/onlinovosk-bit/RealitkaAI/pull/156) `feat/notifications-infra-fk-fix`
- `routine_notifications.sql`: vytvorená (nie `notifications` — existujúca coaching tabuľka má inú schému)
- `import_jobs_fk_fix.sql`: vytvorená (ON DELETE SET NULL)
- `apps/crm/src/lib/notifications/store.ts`: vytvorený (admin client pre cron)
Blokery: Existujúca `public.notifications` (user_id/content) — routines používajú `routine_notifications`

## AGENT-V — Seller Rescue
Status: **DONE**
PR: [#158](https://github.com/onlinovosk-bit/RealitkaAI/pull/158) `feat/routine-seller-rescue` (base: #156)
- `churn-score.ts`: vytvorený (`last_contact` string, prod schema)
- `seller-rescue/route.ts`: vytvorený (GET + Bearer CRON_SECRET)
- testy: **4 passed**
- vercel cron 05:45: pridaný do `vercel.json`
Build: neoverený v CI (čaká na PR checks)
Blokery: —

## AGENT-W — Team Gating Fix
Status: **DONE**
PR: [#157](https://github.com/onlinovosk-bit/RealitkaAI/pull/157) `fix/team-gating-manual-plan`
- `resolveTeamAccountTier`: sync + `agencyManualPlan` parameter
- `manual_plan` lookup: implementovaný v `team/page.tsx` + `team/analytics/page.tsx`
- `capability-registry`: `market_vision` už má `canAccessTeamPressure` (guardian) — bez zmeny
Build: neoverený v CI
Blokery: —

## AGENT-X — CEO Command Center
Status: **DONE**
PR: [#159](https://github.com/onlinovosk-bit/RealitkaAI/pull/159) `feat/routine-ceo-command` (base: #156)
- `director-brief.ts`: implementovaný
- `assemble.ts` integrácia: done (owner/owner_vision guard)
- owner-only guard: implementovaný
Build: neoverený v CI
Blokery: Scope rozšírený do `lib/morning-brief/assemble.ts` (route len volá assembler)

## AGENT-Y — Cleanup + Guard
Status: **DONE**
PR: [#160](https://github.com/onlinovosk-bit/RealitkaAI/pull/160) `chore/cleanup-smoke-guard`
- `scripts/cleanup-smoke-profiles.ts`: vytvorený
- `env-guard.ts`: vytvorený
- E2E súbory guardované: **6** (smoke, smoke-all, smoke-areas, auth-flow, universal-import-smoke, universal-import-prod-e2e)
- CI prod block: pridaný do `saas-grade-pipeline.yml`
Blokery: —

## Pre Claude orchestrátora ráno

### PRs na review (v poradí mergu):
1. [#156](https://github.com/onlinovosk-bit/RealitkaAI/pull/156) feat/notifications-infra-fk-fix (základ)
2. [#157](https://github.com/onlinovosk-bit/RealitkaAI/pull/157) fix/team-gating-manual-plan (Smolko /team)
3. [#160](https://github.com/onlinovosk-bit/RealitkaAI/pull/160) chore/cleanup-smoke-guard (prevencia)
4. [#158](https://github.com/onlinovosk-bit/RealitkaAI/pull/158) feat/routine-seller-rescue (závisí na #156)
5. [#159](https://github.com/onlinovosk-bit/RealitkaAI/pull/159) feat/routine-ceo-command (závisí na #156)

### Andy musí urobiť manuálne PRED mergom #156:
```sql
-- Supabase SQL Editor (prod):
-- apps/crm/supabase/migrations/20260609210000_routine_notifications.sql
-- apps/crm/supabase/migrations/20260609210001_import_jobs_fk_fix.sql
```

### Smoke testy po deployi:
1. `rastislav.smolko@gmail.com` → `/team` → žiadny upgrade banner
2. `curl -X GET https://app.revolis.ai/api/cron/seller-rescue -H "Authorization: Bearer $CRON_SECRET"`
3. morning-brief email obsahuje sekciu `RIADITEĽSKÝ BRÍFING`

### NESMIE sa robiť bez Andy:
- Merge do main
- Supabase migrácie apply na prod
- Zmena `saas-ops.ts` `canUseFullApp`
