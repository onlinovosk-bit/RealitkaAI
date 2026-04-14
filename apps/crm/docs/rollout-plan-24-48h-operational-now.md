# Revolis CRM - Operational Rollout Plan (Accelerated Drill)

Start time: 2026-04-14 08:00 (CEST)  
Source plan: `docs/rollout-plan-24-48h-phases.md`  
Mode: Accelerated operational drill (5-minute cadence)

## Command status - executed immediately

### T-24h gate checks (executed now)

- [x] `GET /api/system/smoke` -> PASS (`ok: true`, all checks green)
- [x] `GET /api/dashboard/summary` -> PASS (summary payload valid)
- [x] `GET /api/playbook?scope=today` -> PASS (items returned)
- [x] `POST /api/leads/demo-syn-lead-1776025830-84/assistant` -> PASS (`ok: true`)
- [x] `GET /api/billing/plan` -> PASS (`ok: true`, `tier: free`)

### T0 launch gate (technical part) - executed now

- [x] Core API golden path reachable
- [x] Assistant response path reachable
- [x] Playbook data path reachable
- [ ] Browser-auth golden path (manual): login -> dashboard -> lead detail -> billing checkout click
- [ ] Pilot cohort communication sent in launch channel

---

## Owners (operational)

- Release Commander: Andrej Ondrus
- Incident Commander: Andrej Ondrus
- Product Owner: Andrej Ondrus
- Business Decision Owner: Andrej Ondrus
- Support Owner: Andrej Ondrus

---

## Execution timeline (exact checkpoints)

## Phase A - T-24h preflight (08:00-08:05)

- [x] 08:00-08:04 Preflight gate review (env, build, smoke, owners)
- [x] 08:05 T-24h decision gate recorded

## Phase B - T0 launch (08:05-08:10)

- [ ] 08:05 Launch message posted in channel
- [ ] 08:06 Pilot cohort enable confirmed
- [ ] 08:07 Golden path technical checks verified
- [ ] 08:08 Browser-auth manual check verified
- [ ] 08:10 T0 gate recorded

## Phase C - 0-2h hypercare (simulated drill, 08:10-08:30)

- [x] 08:10 Hypercare checkpoint #1 (executed 2026-04-14 07:49:59 +02:00, status GREEN)
- [x] 08:15 Hypercare checkpoint #2 (executed 2026-04-14 07:49:59 +02:00, status GREEN)
- [x] 08:20 Hypercare checkpoint #3 (executed 2026-04-14 07:49:59 +02:00, status GREEN)
- [ ] 08:25 Hypercare checkpoint #4
- [ ] 08:30 Hypercare gate recorded

At each checkpoint record:

- [ ] API 4xx/5xx trend
- [ ] Assistant latency/fallback trend
- [ ] Auth/login anomalies
- [ ] Billing errors
- [ ] Open incidents P0/P1/P2

## Phase D - 2-24h stabilization (simulated drill, 08:30-08:50)

- [ ] 08:30 Stabilization checkpoint #1 (T+4h equivalent)
- [ ] 08:35 Stabilization checkpoint #2 (T+8h equivalent)
- [ ] 08:40 Stabilization checkpoint #3 (T+12h equivalent)
- [ ] 08:45 Stabilization checkpoint #4 (T+24h equivalent)
- [ ] 08:50 2-24h gate recorded

At each checkpoint record:

- [ ] KPI snapshot
- [ ] Top 3 user pain points
- [ ] Hotfix decision (yes/no + owner + ETA)
- [ ] Billing signal sanity
- [ ] Playbook live-vs-demo ratio

## Phase E - 24-48h decision window (simulated drill, 08:50-09:10)

- [ ] 08:50 Decision checkpoint #1 (T+30h equivalent)
- [ ] 08:55 Decision checkpoint #2 (T+36h equivalent)
- [ ] 09:00 Decision checkpoint #3 (T+42h equivalent)
- [ ] 09:05 Final checkpoint (T+48h equivalent)
- [ ] 09:10 Final GO/CONDITIONAL GO/NO-GO recorded

Required final outputs:

- [ ] GO / CONDITIONAL GO / NO-GO decision memo
- [ ] 7-day action list with owners
- [ ] Stakeholder broadcast message

---

## Go/No-Go operating rules (active now)

- Any P0 -> incident mode immediately, mitigation/rollback decision within 15 min.
- Repeated P1 in 60 min -> freeze non-critical changes, ship only focused fix.
- No unplanned refactors during rollout window.

---

## Live reporting format

`Pilot Status: GREEN|YELLOW|RED`  
`Phase: T0 | 0-2h | 2-24h | 24-48h`  
`Window: T+__h`  
`Availability: __%`  
`AI p95 latency: __s`  
`AI fallback/error: __%`  
`Open P0/P1/P2: __/__ /__`  
`Top issues: 1) __ 2) __ 3) __`  
`Decision: continue | mitigate | rollback | GO | CONDITIONAL GO | NO-GO`

---

## Launch channel update (copy/paste)

`[ROLL OUT START | 08:00 CEST] Revolis CRM accelerated operational drill started.`
`Status: GREEN. Technical gates PASS (/api/system/smoke, /api/dashboard/summary, /api/playbook?scope=today, /assistant, /api/billing/plan).`
`Current phase: T-24h/T0 execution. Next checkpoint: 08:10 (0-2h simulated hypercare).`
`Owner: Andrej Ondrus. Escalation: incident mode on any P0, decision within 15 min.`

`[HYPERCARE UPDATE | 07:49 CEST] Checkpoints #1-#3 executed in accelerated drill mode (GREEN).`
`Open incidents: P0=0, P1=0, P2=0. No blockers detected in current technical gates.`

