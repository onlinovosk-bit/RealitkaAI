# Genome Layer 2 migration audit

**Lane:** Ruflo swarm LANE 4  
**Scope:** read-only audit of `apps/crm/supabase/migrations/2026_genome_layer2.sql`  
**Date:** 2026-08-11  
**Branch:** `docs/genome-audit`  
**Constraint:** no prod DB connection; no rename/delete of the migration in this PR.

---

## 1. Who / what created it

| Fact | Evidence |
|------|----------|
| **Author** | Andrej-Ondrus `<onlinovo.sk@gmail.com>` |
| **Introduced** | `fbcce7dbf` — *feat(crm): Loop 1 follow-up agent draft-only + Genome substrat (Brief 10 Wave A)* (2026-06-25 07:31 +0200) |
| **Merged via** | [PR #247](https://github.com/onlinovosk-bit/RealitkaAI/pull/247) — *feat(crm): Loop 1 Follow-up Agent (draft-only) + Genome substrat* (merged 2026-06-25T06:49:56Z) |
| **Patched** | `b8b4e7181` — *fix(crm): populate decisions.agent for follow-up predictions* (2026-06-25 09:53 +0200) |
| **Patch merged via** | [PR #249](https://github.com/onlinovosk-bit/RealitkaAI/pull/249) — *fix(crm): populate decisions.agent for follow-up predictions* (merged 2026-06-25T07:56:21Z) |
| **`git blame`** | Lines 1–7, 9–72 ≈ `fbcce7dbf` (Andrej-Ondrus); line 8 (`agent` column in `CREATE TABLE`) + agent-related view/`ALTER` lines ≈ `b8b4e7181` |
| **Co-author on patch** | Cursor `<cursoragent@cursor.com>` (commit message trailer) |

Both commits are ancestors of `origin/main` (verified with `git merge-base --is-ancestor`).

PR #247 summary explicitly names this file as **A0** idempotent migration for `decisions`, `exclusivity_outcomes`, and view `genome_decision_open`, with schema allowlist entries — and states hard rules including **no prod migration via the PR path** (schema was expected to be applied outside normal migrate-on-merge).

---

## 2. What it contains

File header (verbatim intent):

> Genome Layer 2 — Prediction Registry + exclusivity outcomes (idempotent, CI + prod parity)  
> Applied manually on PROD; this file keeps ephemeral CI DB aligned.

### Objects

1. **`public.decisions`** — Prediction Registry rows  
   - Columns: `id`, `agency_id`, `lead_id`, `agent` (NOT NULL, default `'followup_agent'`), `decision`, `p_outcome`, `expected_value_eur`, `confidence`, `expected_outcome`, `status` (default `'open'`), `created_at`  
   - Indexes: `(agency_id, lead_id)`, `(status, created_at DESC)`  
   - Created with `CREATE TABLE IF NOT EXISTS` (idempotent)

2. **`public.exclusivity_outcomes`** — Loop 2 outcome log  
   - Columns: `id`, `agency_id`, `decision_id` → `decisions(id)` ON DELETE SET NULL, `lead_id`, `outcome`, `outcome_value_eur`, `recorded_at`  
   - Index: `(agency_id, recorded_at DESC)`

3. **`ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS agent ...`**  
   - Comment: *PROD parity: column added manually before repo migration; idempotent for CI.*  
   - Added in `b8b4e7181` after prod already required `agent NOT NULL`

4. **View `public.genome_decision_open`** — open decisions projection (includes `agent` after patch)

5. **RLS** enabled on both tables; policies `decisions_service_role` / `exclusivity_outcomes_service_role` (`FOR ALL` to `service_role`)

6. **Grants** to `service_role`: SELECT/INSERT/UPDATE on tables; SELECT on view

### Runtime consumers (code references)

| Path | Usage |
|------|--------|
| `apps/crm/src/lib/agents/followup/predictionWriter.ts` | `.from("decisions").insert(...)` — Loop 1 open predictions |
| `apps/crm/src/lib/agents/followup/outcomeWriter.ts` | `.from("decisions")` select/update + `.from("exclusivity_outcomes").insert(...)` — Loop 2 resolve |
| `apps/crm/src/lib/agents/followup/constants.ts` | Genome Prediction Registry agent id |
| `apps/crm/src/lib/agents/followup/__tests__/outcomeWriter.test.ts` | mocks `exclusivity_outcomes` / genome outcome mapping |

No other migration in `apps/crm/supabase/migrations/` creates `public.decisions` or `public.exclusivity_outcomes` (decision-intelligence migrations use `lead_*` tables, not this Genome registry).

---

## 3. Applied to prod? (inference only — no prod connection)

**Inference: YES — schema (and later `agent` column) was applied on PROD outside / ahead of this repo file.**

| Signal | Why it implies prod presence |
|--------|------------------------------|
| File header | Explicit: *"Applied manually on PROD; this file keeps ephemeral CI DB aligned."* |
| PR #249 commit body | *"PROD decisions table requires agent NOT NULL; follow-up writer omitted it and POST /api/followup returned 500."* — live write path hit prod schema |
| Inline SQL comment | *"PROD parity: column added manually before repo migration"* |
| PR #247 hard rules | *"ziadna prod migracia"* via PR — intentional manual/out-of-band apply |
| Merged app code on `main` | Follow-up writers assume tables exist |

**Not verified in this audit:** row in remote `supabase_migrations` / `schema_migrations` for version `2026`, live `\d decisions`, or RLS state. Confirming those requires a linked/read-only ops check under a separate GO gate.

CI relevance: workflows such as `.github/workflows/saas-grade-pipeline.yml` and `nightly-playwright.yml` run `supabase db reset`, so this file is part of ephemeral DB bootstrap regardless of prod history.

---

## 4. Migration order / collision risk vs `YYYYMMDDHHMMSS`

### Naming defect

| Expected convention | Actual |
|---------------------|--------|
| `{YYYYMMDDHHMMSS}_{slug}.sql` (14-digit timestamp) | `2026_genome_layer2.sql` |
| Version id ≈ full timestamp | Parsed version prefix = **`2026`** (4 digits only) |

### Ordering mismatch (HIGH operational risk)

Tooling disagrees on where this file sits:

| Sorter | Position of `2026_genome_layer2.sql` among 93 migrations |
|--------|----------------------------------------------------------|
| **Node/`localeCompare` on full filename** (ASCII) | **Last** (index 92) — after `20260803120000_ai_generations.sql` because `_` (0x5F) > digit `0` (0x30) at the 5th character |
| **Version-id string sort** (`2026` vs `20260310` vs `20260803120000`) | **First** — `"2026"` is a prefix and sorts before every proper `2026…` timestamp |
| **Windows PowerShell `Sort-Object` (culture)** | **First** — operator/UI confusion vs Node |

So: **filename order ≠ version-id order**. Any pipeline that keys off Supabase version ids can apply Genome **before baseline** (`20260310_…`), while a naive filename walk may apply it **after August 2026 migrations**.

### Collision / fragility checklist

| Risk | Severity | Notes |
|------|----------|-------|
| Non-standard version `2026` in migration history | **High** | Collides conceptually with year prefix of every 2026 migration; future tooling may assume 14-digit versions |
| Fresh `db reset` order undefined across tools | **High** | Depends on whether CLI sorts by filename or version token |
| Duplicate object names with other migrations | **Low (today)** | No second `CREATE` for `decisions` / `exclusivity_outcomes` found |
| Idempotent SQL masking order bugs | **Medium** | `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` can hide wrong order until a non-idempotent statement fails |
| Human mis-sort on Windows | **Medium** | File appears "first" in Explorer/PowerShell but "last" in Node ASCII |

**Verdict:** collision / order risk is **HIGH** relative to house convention, even though object-name collision with peer migrations is currently low.

---

## 5. Proposal (DO NOT EXECUTE in this PR)

| Option | Recommendation | Rationale |
|--------|----------------|-----------|
| **Delete** | **No** | Live Loop 1/2 code path depends on these objects; header + PR #249 prove prod reliance |
| **Keep as-is forever** | **No** | Broken name + version `2026` will keep biting CI/reset and ops |
| **Rename** | **Yes (preferred)** | Align with `YYYYMMDDHHMMSS`; preserve SQL body |

### Suggested rename (proposal only)

- Target name example: `20260625120000_genome_layer2.sql`  
  (anchors to Wave A / PR #247 calendar day 2026-06-25; exact HHMMSS should be chosen to sit **after** any migrations already known applied that day and **before** later June/July files if history repair requires monotonic versions)
- Content: keep idempotent DDL as-is (or split `agent` ALTER into a follow-up stamped migration only if repairing a DB that already recorded version `2026`)

### Required companion steps if rename is approved later (GO REQUIRED)

1. Confirm remote migration history: is version `2026` recorded?  
2. If yes: repair history (`supabase migration repair` / equivalent) — mark old version reverted, new version applied — **without** re-running destructive DDL on prod.  
3. If no (manual SQL only on prod): add properly stamped file for CI/history parity; do not double-apply non-idempotent changes.  
4. Single PR, preview/CI green, no bundling with feature work (L99: 1 PR = 1 logical change).

---

## Recommendation (summary)

**RENAME** (with migration-history repair under an explicit GO), **do not delete**, **do not leave** `2026_genome_layer2.sql` as the long-term name.

Confidence on prod presence: **high from repo evidence**, unconfirmed against live catalog in this lane.

---

## Appendix — commands used (read-only)

```text
git log --follow -- apps/crm/supabase/migrations/2026_genome_layer2.sql
git blame --line-porcelain apps/crm/supabase/migrations/2026_genome_layer2.sql
git merge-base --is-ancestor fbcce7dbf origin/main  # yes
git merge-base --is-ancestor b8b4e7181 origin/main  # yes
gh pr view 247 / gh pr list --search "populate decisions.agent"
rg decisions|exclusivity_outcomes|genome_decision apps/crm/src apps/crm/supabase/migrations
node -e '… readdir + sort …'  # filename last; version id "2026" first
```
