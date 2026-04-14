# Revolis.AI CRM - Final Go/No-Go (1 page)

Date: 2026-04-13  
Release mode: Pragmatic  
Decision owner: Product + Tech Lead

## RAG status

### GREEN (ready)
- Build gate: `npm run build` passed.
- Lint gate (pragmatic policy): `npm run lint` passed.
- Smoke API gate: `/api/system/smoke` passed (all checks ok).
- Billing sanity endpoints: `/api/billing/plan` and `/api/billing/portal` return 200.
- Assistant endpoint: `/api/leads/[id]/assistant` responds correctly.
- DB migration alignment: linked migrations in sync (`20260320`, `20260411`, `20260412`, `20260413`).
- Security hardening: RLS enabled on legacy tables `public.revolis_leads` and `public.revolis_zaujemcovia`.
- Backfill progress: `ai_insight` filled `398/454` (87.7%), target 85-90% achieved.

### YELLOW (allowed with follow-up)
- Playwright login suite requires `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`; not a Day-0 blocker under pragmatic mode.
- Continue backfill batches until near-complete saturation (>95%) during Day-1 window.

### RED (must be zero to deploy)
- None currently detected in technical release gates.

## Final recommendation

**GO** for live deployment, with 24h monitoring window and Playwright credentials added as Day-1 quality task.

---

## Deploy sequence (Day 0)

Run from `apps/crm` in this exact order:

1. **Preflight**
   - `npm run lint`
   - `npm run build`
   - `curl.exe -s http://localhost:3000/api/system/smoke`

2. **Database**
   - `npx supabase migration list --linked`
   - `npx supabase db push --linked`

3. **Critical endpoint checks**
   - `curl.exe -s -o NUL -w "billing_plan:%{http_code}\n" http://localhost:3000/api/billing/plan`
   - `curl.exe -s -o NUL -w "billing_portal:%{http_code}\n" -X POST http://localhost:3000/api/billing/portal`
   - PowerShell:
     - `$body = @{ question = 'Test otázka' } | ConvertTo-Json`
     - `Invoke-RestMethod -Uri "http://localhost:3000/api/leads/<leadId>/assistant" -Method POST -ContentType "application/json" -Body $body`

4. **Deploy app (pipeline/platform step)**
   - Promote current tested build to live.

5. **Immediate post-deploy sanity (T+5m)**
   - Login flow
   - Dashboard load
   - Lead detail + assistant interaction
   - Pipeline move
   - Properties edit panel

---

## Monitoring window (24h)

Check at T+15m, T+1h, T+4h, T+12h, T+24h:

- API 4xx/5xx rate (focus on `/api/leads`, `/api/leads/[id]/assistant`, billing routes)
- Assistant latency and fallback/error ratio
- Billing webhook failures
- Backfill trend: `ai_insight` count continues rising
- Security incidents: cross-tenant exposure or client-side key leaks

## Rollback rule

Trigger rollback on sustained critical regression (e.g., auth break, data corruption risk, billing outage):
- Roll back app to last stable release.
- Keep additive DB changes in place (safe compatibility).
- Keep `/sofia` alias active through at least one release cycle.
