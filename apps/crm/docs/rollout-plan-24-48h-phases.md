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

---

## L99 14-Day Implementation Plan (AI Chief of Sales Layer)

Date: 2026-04-29  
Goal: Ship decision intelligence (not just tools) in 14 days.

### Target outcomes

- Every lead gets a **decision scorecard**: `who/what/when/success_prob/expected_revenue`.
- Every hot lead gets a **closing window** (for example `3-7 days`) and auto-priority shift.
- Every risky deal triggers **rescue automation** with suggested strategy.

### What already exists (base)

- Buyer Readiness score and live risk signals.
- AI insights and alerting surfaces in dashboard.
- AI/call/coaching primitives and playbook scaffolding.
- Market/heatmap/radar layers and onboarding MVP.

### What is missing (must build now)

- Action scoring layer with expected business impact.
- Closing window model tied to queue ordering.
- Auto-rescue workflows with measurable win-back rate.

---

## Delivery tracks

### Track A - Data and schema

- New tables:
  - `lead_action_scores`
  - `lead_closing_windows`
  - `lead_rescue_runs`
  - `lead_micro_actions`
- New lead-level fields:
  - `success_probability` (numeric)
  - `expected_revenue` (numeric)
  - `closing_window_days_min` (int)
  - `closing_window_days_max` (int)
  - `priority_bucket` (`critical|high|normal|low`)
  - `risk_trend` (`up|flat|down`)
- Indexes:
  - `leads(priority_bucket, bri_score desc)`
  - `leads(updated_at desc)`
  - `lead_action_scores(lead_id, created_at desc)`
  - `lead_rescue_runs(lead_id, status, created_at desc)`

### Track B - Decision engine APIs

- `POST /api/ai/decision/score-lead`
  - input: lead id + context
  - output: `who/what/when/success_prob/expected_revenue`
- `POST /api/ai/decision/recompute-queue`
  - output: reordered priority queue with reasons
- `POST /api/ai/closing-window/recompute`
  - output: min/max closing window + confidence
- `POST /api/ai/rescue/trigger`
  - output: rescue plan + channel + message strategy
- `POST /api/ai/micro-actions/schedule`
  - output: day plan micro actions with timing

### Track C - UI and UX

- Lead card:
  - add `success_prob`, `expected_revenue`, `closing window`.
- Queue:
  - add auto-priority lane (`critical now`).
- Daily playbook panel:
  - `Top 10 leads`, `Top 5 actions`, `Top 3 risks`, each with "why".
- Rescue panel:
  - status of at-risk deals and one-click rescue actions.
- Manager view:
  - expected revenue delta from AI-driven actions.

### Track D - Measurement and guardrails

- Core KPIs:
  - conversion rate
  - time-to-close
  - rescue success rate
  - follow-up consistency
  - action completion rate
- Model quality:
  - calibration of success probability
  - closing window hit-rate
- Safety:
  - fallback mode if model confidence < threshold
  - action audit log for all AI-generated recommendations

---

## 14-day execution plan

### Day 1-2: Schema and contracts

- Finalize schema, migrations, indexes.
- Define API contracts and response types.
- Add telemetry events for each decision step.

**Exit criteria**
- Migrations apply cleanly.
- API stubs return typed payloads.

### Day 3-4: Action scoring MVP

- Implement success probability + expected revenue formula.
- Persist top actions per lead.
- Expose decision payload on lead detail endpoint.

**Exit criteria**
- For every active lead, one recommended action exists with score.

### Day 5-6: Closing window model

- Add model for `closing_window_days_min/max`.
- Add queue reorder logic by probability x window urgency.
- Render closing window in lead list and detail.

**Exit criteria**
- Queue auto-sorts by urgency and value.
- 95% of hot leads have closing window output.

### Day 7-8: Rescue automation

- Detect drop in activity and risk trend.
- Generate rescue strategy (channel, message type, timing).
- Add one-click trigger in UI.

**Exit criteria**
- At-risk deals create rescue runs automatically.

### Day 9-10: Daily playbook engine

- Assemble Top 10/5/3 daily pack.
- Add "why this action" explanation string.
- Add gamified execution score for agent discipline.

**Exit criteria**
- Daily playbook generated before 08:00 for pilot users.

### Day 11-12: Micro-action timing engine

- Add behavioral triggers and timing windows.
- Schedule and dispatch micro-actions.
- Add open/click/response tracking.

**Exit criteria**
- Micro-actions generated and tracked with delivery status.

### Day 13: Validation and load checks

- Backtest on historical leads.
- Verify model calibration and queue stability.
- Run smoke + regression on lead/pipeline/assistant flows.

**Exit criteria**
- No P0/P1 regressions.
- KPI trend positive in pilot cohort.

### Day 14: Pilot release gate

- Release to pilot offices only.
- 24h hypercare with checkpoint cadence.
- GO/NO-GO review with decision memo.

**Exit criteria**
- Signed GO/CONDITIONAL GO decision with owned risk list.

---

## API payload reference (MVP)

```json
{
  "leadId": "uuid",
  "decision": {
    "who": "Lead Name",
    "what": "Call with urgency script",
    "when": "within_15_minutes",
    "successProb": 0.74,
    "expectedRevenue": 1850
  },
  "closingWindow": {
    "minDays": 3,
    "maxDays": 7,
    "confidence": 0.68
  },
  "risk": {
    "level": "high",
    "trend": "down",
    "rescueSuggested": true
  }
}
```

---

## Rollback and fallback plan

- Feature flags:
  - `decision_engine_enabled`
  - `closing_window_enabled`
  - `rescue_automation_enabled`
- If quality degrades:
  - disable auto-actions, keep recommendations read-only.
- If infra fails:
  - degrade to existing BRI + manual queue order.
- Preserve all logs for replay and model correction.

---

## Ownership matrix

- Product owner: prioritization and acceptance criteria.
- Data/AI owner: scoring logic and calibration.
- Backend owner: API and job orchestration.
- Frontend owner: queue/playbook/rescue UI.
- QA owner: smoke/regression and pilot verification.
- Incident owner: launch-day rollback authority.

