# Merge origin/main into docs/stage0-pass-confirmed (re-check)

**Date:** 2026-08-19
**Branch:** `docs/stage0-pass-confirmed`
**Worktree:** `C:\RealitkaAI\.worktrees\fix-crm-layout-perf`
**Action:** Cursor diff-tab `fix-merge-conflicts` against `origin/main`

## Fetch

- `git fetch origin main` succeeded.
- `origin/main` after fetch: `d8d9a64b133ff964f1938387d04e1ea43de7efbf` (`fix(auth): stop ILIKE email wildcards hijacking profiles (#427)`).
- Current branch upstream `origin/docs/stage0-pass-confirmed` fetched; remote tip is `8f308b75f` (Stage 0 PASS confirmed). Local HEAD is ahead of that remote by the unpushed merge of main.

## Result: already up to date — merge not redone

- HEAD: `d6c58966c0826d1d960be7ea40506b3f925a5099` (`Merge origin/main into docs/stage0-pass-confirmed.`)
- Merge parents: `8f308b75f` (this branch) + `d8d9a64b1` (`origin/main`)
- Merge-base(`HEAD`, `origin/main`) = `d8d9a64b1` = `origin/main`
- `git merge-base --is-ancestor origin/main HEAD` → yes
- `git merge origin/main` → **Already up to date.**
- Divergence vs `origin/main`: 2 ahead / 0 behind (`8f308b75f` Stage 0 PASS + `d6c58966c` merge commit)

No new conflicted files. No second merge attempted.

## Prior merge already on this HEAD (not replayed)

Completed locally at 20:32 +0200 in `d6c58966c`. Full classification is in `docs/reports/2026-08-19-merge-origin-main-stage0-pass.md`.

| File | Class | What was kept |
|---|---|---|
| `memory/decisions.md` | simple | Keep-both: D-03 (Stage 0 PASS) + D-04 (ILIKE auth append from main) |
| `memory/session-summary.md` | simple | Keep-both stacked session blocks |

No complicated conflicts in that merge. No leftover conflict markers in the tree.

## Out of scope this turn

- Untracked leftover `docs/prompts/ruflo-swarm-noc-2026-08-15.md` left unstaged (not needed for merge).
- Did not push. Branch remains ahead of `origin/docs/stage0-pass-confirmed`.

## Remaining risks

- Local merge `d6c58966c` is **not** on the remote branch yet. Preview/CI on the remote tip (`8f308b75f`) does not include origin/main.
- Until this branch is pushed, other worktrees/agents can re-attempt the same merge against a stale remote tip.
