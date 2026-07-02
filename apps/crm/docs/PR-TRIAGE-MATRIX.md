# PR Triage Matrix — All Open PRs

_Generated: 2026-06-08 UTC (AGENT-E readonly, overnight swarm v2)_

## Summary

| Metric | Value |
|--------|-------|
| **Open PRs (total)** | 4 |
| **Recently merged (note)** | #132, #133, #134 ✅ MERGED 2026-06-08 |
| **CONFLICTING** | 2 (#9, #72) |
| **CI green (last run)** | 2 (#30 Vercel only, #72 full) |
| **CI/Vercel FAILURE** | 2 (#6 draft, #9 Vercel) |
| **TOUCH-GUARD** | 1 (#30 — billing/plan) |
| **Draft** | 1 (#6) |

### Recently merged — Universal CRM Import stack

| PR# | Title | Merged |
|-----|-------|--------|
| #132 | feat(import): Universal CRM Import — schema + types + column detector | 2026-06-08 10:56 UTC |
| #133 | feat(import): Universal CRM Import — UI + API + preview wizard | 2026-06-08 11:23 UTC |
| #134 | feat(import): sidebar Import + onboarding banner (PR #3) | 2026-06-08 20:48 UTC |

Import stack is on `main`. Overnight agents B/D should rebase against current `main`.

---

## Matrix — all currently OPEN PRs

| PR# | Názov | Branch → Base | CI | Mergeable | Vek | Odporúčanie | Dôvod |
|-----|-------|---------------|----|-----------|-----|-------------|-------|
| [#72](https://github.com/onlinovosk-bit/RealitkaAI/pull/72) | feat(crm): Stealth Recruiter production readiness | `feat/stealth-recruiter-production` → `main` | ✅ Lint/test/build, ✅ Vercel CRM + marketing | **CONFLICTING** | 12d | **HOLD** | Stealth/growth feature — needs Andy legal + product sign-off; green CI but conflicts with post-#134 `main`; RLS migration + prod gating |
| [#30](https://github.com/onlinovosk-bit/RealitkaAI/pull/30) | fix(crm): unify Protocol Authority plan display for Smolko | `fix/smolko-plan-display` → `feature/slate-tasks-list` | ✅ Vercel CRM + marketing (no GH CI) | MERGEABLE | 19d | **CLOSE** | Orphaned Slate stack base; TOUCH-GUARD (`billing/`, `api/billing/plan`); 23 files / Smolko-specific — superseded by current `main` plan UX |
| [#9](https://github.com/onlinovosk-bit/RealitkaAI/pull/9) | feat: Realvia import auth + middleware/proxy bypass | `ai-core-v2` → `main` | ✅ GH CI, ❌ Vercel CRM | **CONFLICTING** | 20d | **CLOSE** | Mega-branch (222 files, +10k LOC); superseded by #132–#134 import stack + current auth/middleware on `main` |
| [#6](https://github.com/onlinovosk-bit/RealitkaAI/pull/6) | CRM: /integrations/realvia page and admin URL redirect | `cursor/integrations-realvia-route-2432` → `main` | ❌ GH CI, ❌ Vercel CRM | MERGEABLE | 27d | **CLOSE** | Draft since 2026-05-12; CI red; 5-file experiment — integrations path evolved on `main` without this branch |

---

## Touch-Guard legend

| Guard | PRs | Note |
|-------|-----|------|
| **OK** | #6, #9, #72 | No direct billing/auth/RLS edits in diff ( #72 adds RLS migration — review before any merge) |
| **TOUCH-GUARD** | #30 | Touches `billing/page.tsx`, `api/billing/plan/route.ts` — do not merge without explicit review |

---

## Per-PR detail

### #72 — Stealth Recruiter production readiness

- **Files:** 18 (+976 / −204)
- **Scope:** `stealth-recruiter` APIs, capability gating, Supabase migration, QA doc
- **Last updated:** 2026-05-28
- **Blockers:** CONFLICTING vs `main`; staging migration not applied; Playwright smoke pending
- **Action:** **HOLD** — rebase only after Andy approves stealth recruiter prod launch

### #30 — Smolko Protocol Authority plan display

- **Files:** 23 (+1063 / −189)
- **Base branch:** `feature/slate-tasks-list` (parent Slate PR closed)
- **Scope:** billing/settings plan display, sidebar, AI routes
- **Action:** **CLOSE** — stack abandoned; cherry-pick only if Smolko reports live plan-display bug

### #9 — ai-core-v2 / Realvia import auth

- **Files:** 222 (+10124 / −203), 9 commits
- **Scope:** agents/, middleware, import auth — entire parallel product line
- **Action:** **CLOSE** — import delivered via #132–#134; branch unmaintainable

### #6 — /integrations/realvia (draft)

- **Files:** 5 (+86 / −5)
- **Scope:** middleware, integrations page, smoke test
- **Action:** **CLOSE** — draft + red CI; no `/integrations/realvia` route needed from this branch

---

## Odporúčaný merge poriadok

**No PRs recommended for immediate merge.**

If Andy approves Stealth Recruiter after conflict resolution:

1. **#72** — `REBASE` onto `main` → re-run CI + Playwright `stealth-recruiter.smoke.spec.ts` → apply Supabase migration on staging → **then MERGE** (human gate)

Everything else: close without merge.

**Dependency context (already on `main`):**

```
#132 (schema/types) → #133 (UI/API wizard) → #134 (nav/banner)  ✅ DONE
```

Overnight feature branches (`fix/overnight-feature-health`, `feat/migration-intelligence`, `chore/smoke-test-suite`, `feat/demo-landing-page`) are **not yet open PRs** — triage again when created.

---

## PRs na bulk close

| PR# | Action | Dôvod |
|-----|--------|-------|
| **#6** | CLOSE | Draft 27d; CI + Vercel FAILURE; superseded integrations |
| **#9** | CLOSE | CONFLICTING mega-branch; import stack #132–#134 merged |
| **#30** | CLOSE | Orphaned Slate base; TOUCH-GUARD billing; Smolko stack abandoned |

**Do not bulk-close:** #72 — requires explicit HOLD + Andy decision.

### Suggested `gh` commands (human execution)

```bash
gh pr close 6 --comment "AGENT-E triage 2026-06-08: draft, CI red, superseded."
gh pr close 9 --comment "AGENT-E triage 2026-06-08: ai-core-v2 superseded by #132–#134 on main."
gh pr close 30 --comment "AGENT-E triage 2026-06-08: orphaned Slate stack, TOUCH-GUARD billing."
```

---

## Historical note (2026-06-07 triage)

Slate stack **#14–#23**, **#26**, and superseded gating PRs **#111**, **#112** were closed 2026-06-07 per prior matrix. Only **#6, #9, #30, #72** remain open.
