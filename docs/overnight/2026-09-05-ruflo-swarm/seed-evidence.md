# Seed evidence — 2026-09-05 Ruflo overnight (PREPARED)

Pointers for W0. Separate **verified on disk** (this handoff prep, 2026-09-05) from **quoted from founder prep** (not re-proven here as live production state).

Package status: **PREPARED / NOT STARTED**. No RUN_ID output tree created. No live model calls.

## Verified on disk (handoff workspace)

Baseline for this package commit worktree: branch `docs/ruflo-overnight-prepared` from `origin/main` @ `cf3604613` (Strážca prítoku / Brief 18 V2). Separate from dirty `feat/bridge-harness`.

| Path | Check | Result |
|---|---|---|
| `apps/crm/package.json` | deps present | **Present:** `next` ^16.2.4, `@supabase/supabase-js` ^2.101.1, `maplibre-gl` ^4.7.1, `zod` ^4.4.2, `fast-xml-parser` ^5.5.11, `vitest` ^4.1.2, `playwright` ^1.58.2. Do not bootstrap a parallel Next/org model without reuse analysis. |
| `apps/crm/src/lib/program-tier-pricing.ts` | file exists | **Exists** on `origin/main` snapshot. Start pricing work from this + docs, not from scratch. |
| `apps/crm/docs/pricing-v1.md` | file exists | **Exists** on `origin/main` snapshot. Align with code pricing; production Stripe **not** verified in this handoff. |
| `docs/briefs/reality-smolko-production-blockers-2026-09-04.md` | file exists | **Exists**. Current-er blockers register. Any DB snapshot numbers inside are **quoted document claims**, not a live DB check by this swarm. |
| `.cursor/rules/revolis-builder.mdc` | file exists | **MISSING** on disk. |
| `apps/crm/AGENTS.md` | still references builder rule | **Yes** — points to `.cursor/rules/revolis-builder.mdc`. Drift confirmed. Use available Engineering Constitution (`.cursor/rules/l99-engineering-constitution.mdc`) for Integration Report; do not pretend the missing file was read. |
| `.cursor/rules/l99-engineering-constitution.mdc` | fallback exists | **Exists**. |
| `scripts/ruflo-model-bridge/README.md` | on `origin/main` / this worktree | **MISSING** (path not on tracked main history). |
| `scripts/ruflo-model-bridge/cli.ts` | on `origin/main` / this worktree | **MISSING**. |
| `output/overnight/` | live RUN tree | **Absent** — correct for PREPARED. |
| `scripts/ruflo*` | overnight launcher scripts | **No** `scripts/ruflo*` overnight dispatcher found for this package. |
| Prior overnight prompts | inventory | Existing: `docs/prompts/ruflo-swarm-*.md`, `docs/briefs/overnight/*` — historical; this package is the 2026-09-05 research/specs handoff. |

## Quoted from founder prep (local bridge workspace — do not treat as main baseline)

Prep text recorded during preparation on local branch `feat/bridge-harness`, HEAD `4a01a46a161cb68cdae50f4f58a9218aee71de56`, dirty index/worktree. That HEAD is **not** automatic night-run BASE_SHA.

Separately confirmed **read-only** on `C:\\RealitkaAI` (`feat/bridge-harness` @ same HEAD): `scripts/ruflo-model-bridge/` exists as **local staged/dirty** files (`AM` in `git status`), including `README.md` and `cli.ts`. README describes bounded `governance_review_v0` / Agent OS V0: synthetic input, at most one provider invocation per run, model without tools — **not** a general research/coding runner.

**Do not** use V0 bridge as the overnight research runner. Do not label real repo/client data as synthetic to bypass its contract. **Do not** stash/reset/clean that dirty bridge tree for this package.

## Hard non-claims

- No invented portal XSD/endpoints or competitor prices in this package.
- No spend cap, start/deadline, or runner assignment invented here — fill `launch-record.template.md` before W0.
- Stripe production state: **unverified**.
- Smolko blocker brief DB figures: **not** re-checked live.
