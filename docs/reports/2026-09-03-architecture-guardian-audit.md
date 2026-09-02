# Architecture Guardian — READ-ONLY audit (L3)

**Date:** 2026-09-03  
**Branch:** `docs/architecture-guardian-audit`  
**Scope:** A1 · Architecture Guardian (Night Operations / L3 night-wave)  
**Mode:** READ-ONLY facts + options. No enablement, no merge, no product code changes.

---

## Executive verdict

**Architecture Guardian (A1) exists as docs/scaffolding, not as an `apps/crm` product module.**

What is real in-repo today:

1. Paste-ready Cursor Automation brief: `docs/automations/a1-architecture-guardian.md`
2. Supporting Night Ops docs (`docs/automations/*`, `docs/architecture/2026-08-03-night-operations*.md`, `docs/audit/README.md`)
3. PR-only ratchet workflow: `.github/workflows/code-contract-guard.yml` (runs `check-api-contract.mjs`; optionally `find-dead-exports.mjs` **if the file exists**)

What is **not** real on `origin/main`:

- No in-app package / module named Architecture Guardian under `apps/crm`
- No nightly schedule over `main` for A1
- `apps/crm/scripts/find-dead-exports.mjs` is **absent** from `origin/main`
- `docs/audit/guardian-history.jsonl` is **absent** (README documents it as future A1 output)

**Product** `Guardian v1` (`apps/crm/src/lib/guardian/*`, `/api/cron/guardian-run`) is a **different system** (forgotten-leads pipeline). Conflating it with A1 Architecture Guardian is a category error.

Claim **"Z 2/3 postavený"** in Night Ops Center is **overstated** relative to what actually runs on `main`.

---

## 1. Does Architecture Guardian exist in the repo?

### 1.1 Docs / scaffolding (YES)

| Path | Role |
|------|------|
| `docs/automations/a1-architecture-guardian.md` | Paste-ready Cursor Automation instructions (A1) |
| `docs/automations/2026-08-03-setup-karta.md` | Setup card: A1 cron 02:00 CEST / 00:00 UTC |
| `docs/automations/2026-08-03-nocne-automatizacie.md` | Night automations overview |
| `docs/architecture/2026-08-03-night-operations.md` | Night ops architecture + A1 success metrics |
| `docs/architecture/2026-08-03-night-operations-center.md` | Center status table (includes "2/3" claim) |
| `docs/audit/README.md` | Documents future `guardian-history.jsonl` append-only log |

Verified: `docs/automations/a1-architecture-guardian.md` is present on `origin/main`.

### 1.2 `apps/crm` product module for Architecture Guardian (NO)

There is **no** Architecture Guardian application package under CRM (no `apps/crm/src/lib/architecture-guardian`, no A1 API route, no A1 cron in `vercel.json` for repo health).

If the question is: "Does a product Architecture Guardian app module exist?" → **No.** Only Night Ops documents + PR contract ratchet exist.

### 1.3 Related but distinct: Product Guardian (leads)

| Artifact | Path | Purpose |
|----------|------|---------|
| Library | `apps/crm/src/lib/guardian/*` | Lead rules R1–R4, runner, digest |
| Cron | `apps/crm/src/app/api/cron/guardian-run/route.ts` | Hourly forgotten-leads scan |
| Brief | `docs/briefs/build-package-guardian-v1-blok-c.md` | Guardian v1 Blok C (pipeline) |

This is **lead hygiene**, not architecture/repo contract guarding. Shared name "Guardian" must not imply shared runtime.

---

## 2. What actually runs today?

### 2.1 `code-contract-guard.yml` — PRs only

File: `.github/workflows/code-contract-guard.yml`

| Trigger | Present? |
|---------|----------|
| `pull_request` (paths under `apps/crm/src/**`, scripts, baselines) | YES |
| `workflow_dispatch` | YES |
| `schedule` / nightly cron | **NO** |

Jobs:

1. `node apps/crm/scripts/check-api-contract.mjs --ci` — always (API route contract ratchet vs `api-contract-baseline.json`)
2. `node apps/crm/scripts/find-dead-exports.mjs --ci` — **conditional** on `hashFiles('apps/crm/scripts/find-dead-exports.mjs') != ''`

Implication: on `origin/main`, step (2) is **skipped** because the script file is missing. Dead-export guarding does **not** run on main today.

### 2.2 `find-dead-exports.mjs` — not on main

| Check | Result on `origin/main` |
|-------|-------------------------|
| `apps/crm/scripts/find-dead-exports.mjs` | **Missing** |
| `apps/crm/scripts/check-api-contract.mjs` | Present |
| `apps/crm/scripts/api-contract-baseline.json` | Present |

A1 paste instructions (`a1-architecture-guardian.md`) still list step 5 as `node scripts/find-dead-exports.mjs`. That step **cannot succeed on current main** until the script lands.

### 2.3 Schema governance — not a substitute for A1 nightly

`.github/workflows/schema-governance-guard.yml`: schedule is **commented out** (historical alarm fatigue / missing secrets). Manual `workflow_dispatch` only. This is schema allowlist vs live RLS snapshot — orthogonal to A1's tsc/tests/contract/dead-exports loop.

### 2.4 Cursor Automation A1 — outside git

A1 as specified is a **Cursor Automation** (human enables cron + paste instructions). Enabling it is **not** represented by a green GitHub Actions schedule on this repo. Absence of `guardian-history.jsonl` is consistent with A1 never having written its allowed history branch.

### 2.5 Product `/api/cron/guardian-run` — different product

Runs on Vercel cron for **tenant lead findings**. Proves nothing about Architecture Guardian health of `main`.

---

## 3. "2/3 built" — overstated

Night Ops Center (`docs/architecture/2026-08-03-night-operations-center.md`) states Architecture Guardian is **"Z 2/3 postavený"** — patches 06/07 (dead exports + API contract) + `schema-governance-guard.yml`, missing only nightly over `main` (= A1).

### Decomposition against evidence

| Claimed third | Reality on `origin/main` |
|---------------|--------------------------|
| API contract patch + PR guard | **Partial YES** — `check-api-contract.mjs` + PR workflow exist |
| Dead exports patch | **NO on main** — script absent; PR step skipped |
| Schema governance as A1 building block | **Weak** — schedule disabled; different concern; historically always-red |
| Nightly A1 over `main` | **NO** — no GHA schedule; no proven Cursor Automation history file |

So at most **~1/3 operational in CI** (PR API-contract ratchet only), plus **docs scaffolding** for A1. Calling the whole Architecture Guardian "2/3 built" overstates runnable coverage and incorrectly folds disabled schema governance into A1 completeness.

---

## 4. Intended A1 loop (from paste-ready brief)

Source of truth for intended behavior: `docs/automations/a1-architecture-guardian.md`.

Ordered actions (Phase 1 — read-only except history append):

1. `cd apps/crm && npm ci --prefer-offline`
2. `npx tsc --noEmit`
3. `npm run test -- --run`
4. `node scripts/check-api-contract.mjs`
5. `node scripts/find-dead-exports.mjs`
6. Delta vs baselines under `apps/crm/scripts/`
7. Append one JSONL line to `docs/audit/guardian-history.jsonl` — commit **only** on `reports/guardian-history` (never `main`)
8. Trend last 14 history rows; flag worsening streaks

**Gap:** steps 5–8 are blocked or unproven on current `main` (missing script + missing history file + no scheduled runner in-repo).

---

## 5. Nightly options (A / B / C / D) — no recommendation

Options for closing the "nightly over main" gap. Listed for founder decision only — **this audit does not pick a winner**.

| Option | Shape | Pros | Cons / risks |
|--------|-------|------|--------------|
| **A** Cursor Automation | Enable A1 from `a1-architecture-guardian.md` (~02:00 CEST) | Matches SSOT docs; human-readable STOP report | Outside git; quota/cost; fails until `find-dead-exports.mjs` exists; history branch discipline |
| **B** GitHub Actions nightly | Add `schedule` job mirroring A1 steps 2–5 (+ artifact/report) | Visible in CI; reproducible; PR parity path | Needs secrets/npm ci budget; must avoid always-red fatigue; still need dead-exports script on main |
| **C** Vercel cron → API | New authenticated route that audits repo health | Same pattern as product crons | Bad fit (repo audit ≠ tenant DB); high conflation risk with `guardian-run`; app runtime is wrong place for monorepo tsc/dead-exports |
| **D** Status quo | Keep PR-only `code-contract-guard.yml` | Zero new ops surface; ratchet already prevents *new* API-contract debt on PRs | No nightly signal on `main`; dead-exports unenforced; A1 docs remain aspirational |

**Explicit:** no ranking, no "enable A1 today" call in this report.

---

## 6. Confusion map (do not mix)

| Concept | Is Architecture Guardian? |
|---------|---------------------------|
| `docs/automations/a1-architecture-guardian.md` | Scaffolding for **yes** (intended A1) |
| `code-contract-guard.yml` on **PR** | Partial **related** enforcement, not full A1 |
| `find-dead-exports.mjs` on main | **Missing** — intended A1 ingredient |
| `schema-governance-guard.yml` | Related quality guard, **not** A1 nightly |
| Product `/api/cron/guardian-run` | **No** — leads Guardian v1 |
| Claim "2/3 postavený" | **Overstated** |

---

## 7. Evidence checklist (light verification)

| Fact | Evidence |
|------|----------|
| A1 paste brief exists | `docs/automations/a1-architecture-guardian.md` on main |
| Contract guard is PR-only | `.github/workflows/code-contract-guard.yml` triggers |
| Dead-exports script on main | `git ls-tree origin/main` → **absent** |
| guardian-history.jsonl | **absent**; documented as future in `docs/audit/README.md` |
| Product guardian module | `apps/crm/src/lib/guardian/*` + `guardian-run` route exist (leads) |
| Architecture Guardian CRM module | **absent** |

---

## 8. Residual risks

1. **Name collision:** engineers may treat green `guardian-run` crons as proof Architecture Guardian is live.
2. **Docs drift:** A1 instructions reference scripts/baselines that main does not fully ship.
3. **False confidence:** "2/3 built" + green PR contract may hide missing dead-export + missing nightly main audit.
4. **Alarm fatigue precedent:** schema governance schedule was disabled; any nightly A1 must stay green-first (ratchet), not always-red.

---

## 9. Closure

**Changed:** documentation only — this audit file.  
**Verified:** paths/triggers/absence of `find-dead-exports.mjs` and `guardian-history.jsonl` on `origin/main`; product guardian paths exist and are lead-scoped.  
**Still risky:** aspirational A1 vs operational PR ratchet; product/name collision; no chosen nightly option.

### One-line summary

Architecture Guardian is **docs scaffolding + PR API-contract ratchet**; **not** a CRM app module; **not** nightly on main; product `guardian-run` is unrelated; **"2/3 built" is overstated**; nightly options **A/B/C/D** listed without recommendation.
