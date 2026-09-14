# Critical bug hunt — 2026-09-14

**Branch:** `cursor/critical-bug-management-2691`  
**Mode:** hunt only (no new fix PR)  
**Scope:** HIGH-severity correctness in recent `main` commits + known tracked bugs

## Cleanup (MEMORIES)

| PR | Action |
|----|--------|
| #546 demo booking service-role | **MERGED** — removed from tracked list |
| #548 outreach scoped lead lookup | **OPEN** — added to tracked list (was report-only 2026-09-13) |
| #549 playbook confirm-viewing | **MERGED** — not re-opened |
| #550 profiles scoped PATCH | **MERGED** — not re-opened |

Still open (do not duplicate): #369 #370 #443 #444 #447 #462 #486 #490 #495 #537 #545 #548

## Scanned

Behavioral surface since ~2026-09-05 plus siblings of recent fixes:

- Merged fixes #546 / #549 / #550 (spot-check for regressions)
- `#542` Smolko chatbot API (tenant gate + scoped `listLeads`/`listTasks`)
- `#535` notification digest (owned by open #537)
- `#531` `/hladame` demand + inbound form (admin + agency filter)
- Public buyer-onboarding `createTask` (owned by open #545)
- Property Launch Pack credit spend path
- Team create routes (`body.agencyId` fallback)
- Matching auto-recalculate hooks / delete-then-insert timeout (owned by #444)
- Credits grant-engine RMW (owned by #370)
- `/upgrade` + `okResponse` contract (owned by #369) — **re-confirmed still broken on main**

## Verdict

**No new critical bug** cleared the bar for a fresh fix PR tonight.

Highest-value unpaid work remains **merge the open fix queue**, especially:

1. [#369](https://github.com/onlinovosk-bit/RealitkaAI/pull/369) — Stripe seat checkout dead on `/upgrade` (re-verified: page still reads `d.data` / `data.data.result.url` while `okResponse` flattens)
2. [#548](https://github.com/onlinovosk-bit/RealitkaAI/pull/548) — outreach cron/send scoped lead lookup
3. [#545](https://github.com/onlinovosk-bit/RealitkaAI/pull/545) — buyer-onboarding silent CRM task drop
4. [#537](https://github.com/onlinovosk-bit/RealitkaAI/pull/537) — notification digest tenant unread wipe

## Report-only (below PR bar)

- `POST /api/team/teams` and `POST /api/team/users` still fall back to `body.agencyId` when caller `agency_id` is null despite “enforce caller agency” comments. On a fully migrated DB, `teams_agency` WITH CHECK + missing authenticated `profiles` INSERT should block the exploit — treat as defense-in-depth debt, not a confident live cross-tenant write without RLS proof.
- Cookie-scoped `createClient()` inside several crons (arbitrage / price-trail / recompute-bri) can return empty sets with `ok: true`. Silent feature no-op; separate service-role pass if product still expects those jobs.

## ĎALŠIA ÚLOHA

**ĎALŠIA ÚLOHA:** Merge or explicitly reject open fix PR #369 (upgrade Stripe checkout contract).  
**PREČO TERAZ:** Blocks paying self-serve upgrade; bug still live on `main`; PR already has the minimal fix.  
**BRÁNA:** GO REQUIRED (merge + green CI / billing unlock)
