# PR Triage Matrix #14–#30

_Generated: 2026-06-07 UTC (TRACK-C readonly, overnight swarm)_

## Summary

| Metric | Value |
|--------|-------|
| Open in range | 17 |
| Vercel FAILURE | 12 |
| CONFLICTING | 1 (#14) |
| TOUCH-GUARD | 3 (#19, #24, #30) |
| **Recommendation** | **Close Slate stack bulk** — superseded by main + light migration; do not sequential merge |

## Matrix

| # | Title | Branch | Mergeable | CI Status | Files | Guard |
|---|-------|--------|-----------|-----------|-------|-------|
| #14 | feat: purple layout v2 + L99 copy SK | `feature/purple-layout` | CONFLICTING | SUCCESS | 8 | OK |
| #15 | feat: add Slate Workdesk shell foundation | `feature/slate-workdesk-shell` | MERGEABLE | FAILURE, SUCCESS | 7 | OK |
| #16 | feat: align dashboard with Slate Horizon | `feature/slate-dashboard-l99` | MERGEABLE | FAILURE, SUCCESS | 3 | OK |
| #17 | feat: align leads list with Slate Horizon | `feature/slate-leads-list` | MERGEABLE | FAILURE, SUCCESS | 7 | OK |
| #18 | feat: align pipeline list with Slate Horizon | `feature/slate-pipeline-list` | MERGEABLE | FAILURE, SUCCESS | 4 | OK |
| #19 | feat: align playbook list with Slate Horizon | `feature/slate-playbook-list` | MERGEABLE | FAILURE, SUCCESS | 5 | TOUCH-GUARD |
| #20 | feat: align contacts list with Slate Horizon | `feature/slate-contacts-list` | MERGEABLE | FAILURE, SUCCESS | 2 | OK |
| #21 | feat: align settings core with Slate Horizon | `feature/slate-settings-core` | MERGEABLE | FAILURE, SUCCESS | 3 | OK |
| #22 | feat: align team core with Slate Horizon | `feature/slate-team-core` | MERGEABLE | FAILURE, SUCCESS | 12 | OK |
| #23 | feat: align tasks list with Slate Horizon | `feature/slate-tasks-list` | MERGEABLE | FAILURE, SUCCESS | 47 | OK |
| #24 | feat: align billing core with Slate Horizon | `feature/slate-billing-core-page` | UNKNOWN | SUCCESS | 1 | TOUCH-GUARD |
| #25 | fix(crm): gate mock AI pulses for Smolko onboarding | `fix/smolko-pulse-gating` | MERGEABLE | FAILURE, SUCCESS | 9 | OK |
| #26 | fix(cron): Realvia queue processor for Smolko property sync | `fix/smolko-realvia-cron` | MERGEABLE | FAILURE, SUCCESS | 2 | OK |
| #27 | fix(dashboard): Slate Horizon light AI row for Smolko | `fix/smolko-dashboard-slate` | MERGEABLE | SUCCESS | 6 | OK |
| #28 | fix(sidebar): Smolko P0 — fixed nav at 76px, toast gating | `fix/smolko-sidebar-toast` | MERGEABLE | FAILURE, SUCCESS | 4 | OK |
| #29 | fix(crm): workdesk shell content offset (Smolko P0) | `fix/smolko-workdesk-shell` | UNKNOWN | SUCCESS | 3 | OK |
| #30 | fix(crm): unify Protocol Authority plan display for Smolko | `fix/smolko-plan-display` | MERGEABLE | SUCCESS | 23 | TOUCH-GUARD |

## Touch-Guard Legend

- **OK** — does not touch `billing/`, `/auth/`, `RLS`, `saas-ops.ts`
- **TOUCH-GUARD** — touches protected paths; do not merge without explicit review

## Per-PR recommendation

| # | Action | Rationale |
|---|--------|-----------|
| #14–#23 | **close** | Slate Horizon stack; stale vs `main`, mostly Vercel FAILURE, superseded by current UI |
| #24 | **close** | TOUCH-GUARD (billing); single-page slate billing experiment |
| #25–#28 | **close** or cherry-pick | Smolko fixes; many FAILURE; #27 green CI but low ROI vs current main |
| #26 | **close** | Superseded — `realvia-process` + external cron on main (#66 path) |
| #29 | **wait** | UNKNOWN mergeable; 3 files shell offset — review only if Smolko reports layout bug |
| #30 | **wait** | TOUCH-GUARD (billing/plan display); needs manual review, not bulk merge |

## New stack (context)

| PR | Status |
|----|--------|
| #101 | ✅ merged — workdesk profile hardening |
| TRACK-D branch | `feat/phase5-forecast-gating` — 1 commit ahead of main, **no PR yet** |
| TRACK-E branch | `feat/phase5-team-gating` — 1 commit ahead of main, **no PR yet** |

## Merge order (if anything from old stack)

**Do not** merge #14→#30 sequentially. If cherry-picking: #27 or #30 only after isolated review + green CI.
