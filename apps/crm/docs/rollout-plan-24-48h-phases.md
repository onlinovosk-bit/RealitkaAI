# Revolis CRM - 24-48h Rollout Plan (Exact Phases)

Date: 2026-04-13  
Scope: Pilot rollout (1-2 real estate offices)  
Primary channel: `#launch-war-room`

## Owners

- Release Commander (Tech Lead): deployment, technical GO/NO-GO, rollback trigger
- Product Lead: pilot scope, user feedback loop, business GO/NO-GO input
- Incident Commander (On-call): P0/P1 triage and status updates
- Support/Ops: pilot communication and ticket routing
- Business Owner: final decision at 24-48h gate

## Severity model

- P0: security/data integrity/auth outage or critical business flow down
- P1: major degradation with workaround
- P2: minor issue without launch-blocking impact

---

## Phase 1 - T-24h (Preflight lock)

### Objectives

- Freeze risky change surface and validate release readiness.

### Checklist (must all pass)

- [ ] Scope lock confirmed (`in-scope` vs `out-of-scope`)
- [ ] Hotfix-only policy announced
- [ ] Production env sanity checked
- [ ] DB migration state clean
- [ ] Build passes
- [ ] API checks pass (`/api/system/smoke`, `/assistant`, `/api/billing/plan`)
- [ ] Rollback owner and incident template confirmed

### Commands (operator pack)

```bash
npm run build
npx supabase migration list --linked
npx supabase db push --linked
npx vercel env ls production
```

```powershell
Invoke-RestMethod -Uri "https://app.revolis.ai/api/system/smoke" -Method GET
$q = @{ messages = @(@{ role = "user"; content = "Preflight check" }) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "https://app.revolis.ai/api/leads/demo-syn-lead-1776025830-84/assistant" -Method POST -ContentType "application/json" -Body $q
Invoke-RestMethod -Uri "https://app.revolis.ai/api/billing/plan" -Method GET
```

### Exit criteria

- No open P0
- Build + smoke checks green
- Launch channel staffed with named owners

---

## Phase 2 - T0 (Launch moment)

### Objectives

- Start pilot safely and prove golden path on production.

### Checklist

- [ ] Pilot start announced (timestamp + owners online)
- [ ] Pilot cohort enabled
- [ ] Golden path executed and logged as PASS/FAIL:
  - [ ] Login
  - [ ] Dashboard load
  - [ ] Lead detail load
  - [ ] Assistant response on real/demo lead
  - [ ] Pipeline move persisted
  - [ ] Property edit persisted
  - [ ] Playbook visible (DEMO-labeled where fallback data are used)
  - [ ] Billing page + checkout start works in authenticated session

### Exit criteria

- Golden path completed end-to-end
- No unresolved P0/P1 introduced by launch

---

## Phase 3 - 0-2h (Hypercare)

### Objectives

- Catch regressions early and decide quickly on mitigation vs rollback.

### Check cadence

- T+15m, T+30m, T+45m, T+60m, T+90m, T+120m

### At each checkpoint capture

- [ ] API error rate (4xx/5xx trend)
- [ ] Assistant p95 latency + fallback/error ratio
- [ ] Auth/login failures
- [ ] Billing route failures
- [ ] User-reported blockers
- [ ] Open incidents by severity (P0/P1/P2)

### Rules

- Any P0 => immediate incident process + mitigation/rollback decision in <= 15 min
- P1 repeated twice in 60 min => freeze non-critical changes, ship targeted fix only

### Exit criteria

- No active P0
- P1 stable or mitigated
- Monitoring trend non-worsening

---

## Phase 4 - 2-24h (Stabilization)

### Objectives

- Maintain service quality and validate business utility under real usage.

### Check cadence

- T+4h, T+8h, T+12h, T+24h

### At each checkpoint capture

- [ ] KPI snapshot (usage + reliability)
- [ ] Top 3 user pain points
- [ ] Hotfix needed? yes/no + owner + ETA
- [ ] Billing signal check (checkout/portal failures, Stripe anomalies)
- [ ] Playbook data quality (fallback share vs live data)

### Rules

- Only ship fixes tied to pilot blockers or clear degradations
- Batch UX polish and non-critical refactors post-pilot

### Exit criteria

- Exit metrics still on track (availability, latency, incident budget)
- No unresolved launch-blocking risk for 24h review

---

## Phase 5 - 24-48h (Decision window)

### Objectives

- Decide GO / CONDITIONAL GO / NO-GO with evidence.

### Decision meeting (30-45 min)

- [ ] Exit criteria vs actuals
- [ ] Incident review (resolved/open)
- [ ] User feedback summary
- [ ] Risk register with owner + due date
- [ ] Decision signed by Business Owner + Tech Lead + Product Lead

### Decision rules

- GO (green): no unresolved P0/P1 blockers, metrics in threshold
- CONDITIONAL GO (yellow): manageable risks with named owners and deadlines
- NO-GO (red): unresolved stability/security/data integrity risk

### Required outputs

- [ ] One-page decision memo in `docs/`
- [ ] Next 7-day action list with owners
- [ ] Stakeholder update message sent

---

## Reporting template (copy/paste)

`Pilot Status: GREEN|YELLOW|RED`  
`Phase: T-24h | T0 | 0-2h | 2-24h | 24-48h`  
`Window: T+__h`  
`Availability: __%`  
`AI p95 latency: __s`  
`AI fallback/error: __%`  
`Open P0/P1/P2: __/__ /__`  
`Top issues: 1) __ 2) __ 3) __`  
`Decision: continue | mitigate | rollback | GO | CONDITIONAL GO | NO-GO`

