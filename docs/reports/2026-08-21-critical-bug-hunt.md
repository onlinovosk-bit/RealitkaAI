# Critical bug hunt — 2026-08-21

Automation cron scan of recent `main` commits for high-severity correctness bugs.

## Verdict

**No new critical bug opened.** Expected outcome: findings either already fixed on `main` or already tracked with open fix PRs.

## Memory cleanup

| Bug | Prior PR | Status |
|-----|----------|--------|
| Legacy Stripe unknown price → free wipe | #371 | **Fixed** via merged #451 — removed from MEMORIES |
| Credits-cycle expire wipe of current grant | #374 | **Fixed** via merged #452 — removed from MEMORIES |
| Proxy fail-open on getUser timeout | #438 | Still open; fresh replay **#457** |
| Acquire email dedup claim orphan | #439 | Still open; fresh replay **#456** (+ #440) |

## Scanned surfaces (no new PR)

- Billing/credits after #451/#452 — guards present (`unknown` no-op, expire wipe refuse).
- Gmail inbound pull (#422) — cron secret + acquire shared secret; mock-first; no new critical trigger.
- Properties mutations — still broken (unscoped store); tracked **#443**.
- Matching recalculate wipe — still on `main`; fix lives on **#444** (open, conflicting).
- Invite `agency_id` omission — still on `main`; tracked **#447**.
- Near-miss noted previously: `syncAccountTier` `listUsers()` without pagination — incomplete sync, not a proven wipe; no PR.

## Still awaiting founder merge (highest blast radius)

1. #457 — fail-closed proxy API auth  
2. #456 — acquire dedup claim rollback  
3. #443 — properties scoped mutations  
4. #444 — matching recalculate wipe  
5. #447 — invite agency_id  
6. #369 / #370 — upgrade checkout + credits race  

## Next task (task-loop)

**ĎALŠIA ÚLOHA:** Founder merge #457 (proxy fail-closed) then #456 (acquire dedup).  
**PREČO TERAZ:** Auth hang + orphaned inbound leads are live prod risk; code already reviewed twice.  
**BRÁNA:** GO REQUIRED (merge only).
