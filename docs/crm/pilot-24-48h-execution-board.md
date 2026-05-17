# Revolis.AI CRM - Pilot 24-48h Execution Board

Date: 2026-04-13  
Owner: Tech Lead + Product Lead  
Mode: Controlled pilot rollout (1-2 real estate offices)

## 1) Pilot charter

### Goal
- Validate production stability on real users and real workflows.
- Validate business value: AI helps agents pick and execute next action.
- Validate operational readiness: monitoring, incident handling, rollback.

### In scope
- `dashboard`
- `leads/[id]` detail
- `/api/leads/[id]/assistant`
- `pipeline`
- `properties` + edit panel
- `playbook`
- Billing read/check routes (`/api/billing/plan`, `/api/billing/portal`)

### Out of scope (during pilot window)
- Major UX redesign
- Refactors without direct pilot impact
- Broad migration cleanup not tied to pilot stability

## 2) Exit criteria (GO threshold)

- P0 incidents: `0`
- P1 incidents: `<= 1`, mitigated within 24h
- API availability during window: `>= 99.5%`
- AI endpoint p95 latency: `< 6s` (or your approved threshold)
- AI fallback/error rate: `< 5%`
- Billing core checks: pass
- Pilot user satisfaction: `>= 8/10`

## 3) RACI

- Tech Lead: release command, incidents, rollback decision input
- Product Lead: pilot scope, feedback scoring, GO/NO-GO recommendation
- Ops/Support: user communication, ticket triage, status updates
- Business Owner: final sign-off GO/NO-GO

## 4) T-24h preflight checklist (must pass before pilot start)

## 4.1 Release freeze and scope lock
- [ ] Freeze `main` (hotfix-only policy)
- [ ] Confirm in-scope and out-of-scope list to all stakeholders
- [ ] Open launch channel with owners and escalation contacts

## 4.2 Env and config
- [ ] Confirm Vercel Production env vars exist and are valid
- [ ] Confirm no accidental dependency on local `.env` for production behavior
- [ ] Confirm service-role usage only in server routes

Command:
```bash
npx vercel env ls production
```

## 4.3 DB and migration readiness
- [ ] Migration state in sync
- [ ] `db push` clean
- [ ] Backfill trend acceptable for launch target

Commands:
```bash
npx supabase migration list --linked
npx supabase db push --linked
```

## 4.4 Build and API sanity
- [ ] Build passes
- [ ] Smoke endpoint passes
- [ ] Assistant endpoint returns `ok: true`
- [ ] Billing plan/portal checks pass

Commands (PowerShell):
```powershell
npm run build
Invoke-RestMethod -Uri "https://app.revolis.ai/api/system/smoke" -Method GET
$body = @{ question = "Pilot preflight question" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://app.revolis.ai/api/leads/demo-syn-lead-1776025830-84/assistant" -Method POST -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri "https://app.revolis.ai/api/billing/plan" -Method GET
$portal = @{ returnUrl = "https://app.revolis.ai/settings" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://app.revolis.ai/api/billing/portal" -Method POST -ContentType "application/json" -Body $portal
```

## 4.5 Incident readiness
- [ ] Severity model agreed (P0/P1/P2)
- [ ] Incident Commander assigned (on-call)
- [ ] Rollback owner assigned
- [ ] Incident template prepared

Template:
- Incident ID
- Time detected
- Impacted flows
- Severity
- Mitigation action
- ETA
- Status updates timestamps
- Final RCA link

## 5) T0 launch sequence (pilot start)

- [ ] Announce pilot start in launch channel
- [ ] Enable pilot user cohort
- [ ] Run golden path live and capture evidence

Golden path (record PASS/FAIL + timestamp + owner):
- [ ] Login
- [ ] Dashboard load
- [ ] Lead detail load
- [ ] Ask assistant and receive actionable answer
- [ ] Pipeline stage move
- [ ] Properties edit save
- [ ] Playbook interactions
- [ ] Billing plan/portal route behavior

## 6) 0-2h hypercare protocol

- Monitoring interval: every 15 minutes
- Hard rule: any P0 triggers immediate incident process and mitigation/rollback decision

Checkpoints at T+15m, T+30m, T+45m, T+60m, T+90m, T+120m:
- [ ] API error rate (4xx/5xx)
- [ ] AI latency p95
- [ ] AI fallback/error ratio
- [ ] Auth/login failures
- [ ] Billing route failures
- [ ] User-reported blockers

## 7) 2-24h stabilization protocol

Checkpoint cadence:
- [ ] T+4h
- [ ] T+8h
- [ ] T+12h
- [ ] T+24h

For each checkpoint capture:
- [ ] KPI snapshot
- [ ] New incidents summary
- [ ] Top 3 user pain points
- [ ] Hotfix decision (yes/no)

Hotfix policy:
- Ship only fixes tied to pilot blockers or P1 degradation.
- Batch non-critical UX polish to post-pilot release.

## 8) 24-48h decision window

## 8.1 Decision meeting agenda (30-45 min)
- [ ] Review exit criteria vs actual metrics
- [ ] Review incidents and unresolved risks
- [ ] Review pilot user feedback score
- [ ] Decide: GO / CONDITIONAL GO / NO-GO

## 8.2 Decision rules
- GO (green): all critical criteria met, no unresolved P0/P1 blockers.
- CONDITIONAL GO (yellow): minor risks with named owner and due date.
- NO-GO (red): unresolved stability/security/data integrity risk.

## 8.3 Mandatory output artifact
- [ ] One-page signed decision memo stored in `docs/`

## 9) Rollback playbook (fast path)

Trigger rollback when:
- Sustained auth failure
- Assistant core endpoint unusable
- Data integrity risk
- Billing critical regression

Rollback steps:
1. Disable risky feature flags (if available).
2. Roll app back to last stable deployment.
3. Keep additive DB changes in place unless explicit data issue requires intervention.
4. Keep `/sofia` alias compatibility for one release cycle.
5. Publish incident update and ETA.

## 10) Daily reporting format (copy/paste)

`Pilot Status: GREEN|YELLOW|RED`  
`Window: T+__h`  
`Availability: __%`  
`AI p95 latency: __s`  
`AI fallback/error: __%`  
`Open P0/P1/P2: __/__ /__`  
`Top issues: 1) __ 2) __ 3) __`  
`Decision: continue | mitigate | rollback`

## 11) Command appendix (operator quick pack)

Run from `apps/crm`:

```bash
npm run build
npx supabase migration list --linked
npx supabase db push --linked
npx vercel --prod --yes
npx vercel env ls production
```

PowerShell API checks:

```powershell
Invoke-RestMethod -Uri "https://app.revolis.ai/api/system/smoke" -Method GET
Invoke-RestMethod -Uri "https://app.revolis.ai/api/billing/plan" -Method GET
$p = @{ returnUrl = "https://app.revolis.ai/settings" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://app.revolis.ai/api/billing/portal" -Method POST -ContentType "application/json" -Body $p
$q = @{ question = "Pilot runtime check" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://app.revolis.ai/api/leads/demo-syn-lead-1776025830-84/assistant" -Method POST -ContentType "application/json" -Body $q
```
