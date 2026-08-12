# Decisions dedup audit (LANE 11 / Ruflo Swarm Vlna 3)

**Date:** 2026-08-12  
**Branch:** `docs/decisions-dedup-audit` @ `origin/main` (`05ad07099`)  
**Scope:** READ-ONLY investigation. **Execute nothing** — founder decides.  
**Plan archive:** [`docs/prompts/ruflo-swarm-vlna3-2026-08-12.md`](../prompts/ruflo-swarm-vlna3-2026-08-12.md)

---

## Verdict (one screen)

| Question | Answer |
|---|---|
| Are `memory/decisions.md` and `brain/decisions/decisions.md` content-identical? | **YES** — same git blob `4d349d3b6…`, same SHA-256, 565 lines / 41 895 bytes each. |
| Have they ever diverged? | **NO content divergence yet.** Duplicate introduced as an exact copy in `#383` (`b4681a98c`, 2026-08-11). No later commit touched either path. |
| Who consumes `brain/decisions/`? | **Ingest writes `index.json`; catalog indexes one ADR.** No app/runtime code reads `brain/decisions/decisions.md`. Agents/docs are the risk surface. |
| Recommended SoT | **`memory/decisions.md`** (already Constitution / ENGINE / runbook). |
| Recommended view | **`brain/decisions/index.json`** (already non-canonical projection). Treat `decisions.md` under brain as DEBT — remove or generate. |
| Size estimate | **XS** (delete duplicate + fix refs) or **S** (ingest mirror of MD). |

---

## 1. Who reads `brain/decisions/`?

Inventory of the directory on `origin/main`:

| Path | Role |
|---|---|
| `brain/decisions/index.json` | Generated machine index (`npm run brain:ingest`) |
| `brain/decisions/adr-2026-07-28-architecture-evolution.md` | Hand-authored ADR asset (catalog root) |
| `brain/decisions/decisions.md` | **Duplicate markdown log** (DEBT; agent convenience) |
| `brain/decisions/README.md` | Declares SoT = `memory/decisions.md`; flags duplicate as debt |

### Code / tooling

| Consumer | Reads / writes | Notes |
|---|---|---|
| `brain/src/ingest.ts` (`npm run brain:ingest` / `brain:check`) | **Writes** `brain/decisions/index.json` (+ `brain/registry/index.json`) | Does **not** read or write `brain/decisions/decisions.md`. Builds decisions from `brain/src/catalog.ts` `DECISION_SPECS` (evidence paths point at `memory/decisions.md`). |
| `brain/src/catalog.ts` | **Reads** `memory/decisions.md` (canonical asset `memory.decisions`); lists `brain/decisions/adr-2026-07-28-architecture-evolution.md` as a separate asset | Roots for the log asset: `["memory/decisions.md", "decisions.md"]` — basename alias, not a pointer at the brain duplicate. |
| `.github/workflows/memory-engine-report.yml` | Runs `npm run brain:ingest -- --brain-root $RUNNER_TEMP/brain` | Temporary projection only; does not validate or sync `brain/decisions/decisions.md`. |
| App / CRM runtime (`apps/**`) | **No matches** for `brain/decisions` | Production code does not load this tree. |

`git grep` evidence (non-doc code/config hits):

- `.cursor/rules/l99-engineering-constitution.mdc` — after writing Decision Memory, run `brain:ingest` → `brain/decisions/index.json`.
- `brain/src/catalog.ts` + `brain/registry/index.json` — ADR path under `brain/decisions/`.
- `package.json` — `brain:ingest` script.

### Docs / agents (human + LLM consumers)

Heavy documentation references treat `brain/decisions/` as Decision Memory / projection / brief destination. **Write policy already points agents at `memory/decisions.md`:**

- `CLAUDE.md`, `.claude/skills/task-loop/SKILL.md`, `.claude/skills/kontrolor/SKILL.md`
- `.cursor/rules/l99-engineering-constitution.mdc`
- `docs/architecture/engineering-constitution.md`, `memory-engine-runbook.md`, `memory-engine-canonical-model.md`
- `brain/ENGINE.md` — canonical decisions = `memory/decisions.md` (+ docs/adr)

Explicit dual-path mention (drift risk):

- `docs/architecture/acquisition-os-stage0-zisti-report.md` — lists both MD paths.
- `brain/decisions/README.md` — already marks `decisions.md` as duplicate DEBT (from doplnenie 2026-08-11 / `#383`).

**Bottom line:** machine consumers care about **`index.json` + ADR**. The **markdown twin** is not ingested; it exists for agent convenience and is the dual-SoT hazard.

---

## 2. Identical? Since when (git log)?

### Content compare (HEAD / `origin/main`)

```
git hash-object memory/decisions.md
→ 4d349d3b6a54822337356601a32ecfc79c43a9fd

git hash-object brain/decisions/decisions.md
→ 4d349d3b6a54822337356601a32ecfc79c43a9fd
```

SHA-256 of both files also match. Line counts: 565 / 565.

### Timeline

| When | Event |
|---|---|
| Pre-2026-08-11 | Only `memory/decisions.md` existed as the markdown decision log (long history). |
| 2026-08-11 19:09 (`88bf48b1a`, #378) | Last edit to `memory/decisions.md` before the duplicate appeared. |
| 2026-08-11 22:23 (`b4681a98c`, #383) | **`brain/decisions/decisions.md` added** (+565 lines). Commit message: *"Record brain/decisions duplicate as DEBT (SoT remains memory/decisions.md)."* At that commit both files matched; working-tree blobs identical at HEAD. |
| After `#383` → HEAD | **Zero** commits touch either path → **no divergence window yet**. |

So the accurate statement is not "they diverged on date X", but:

> Dual editable logs since **2026-08-11 (#383)**. Content still synchronized because nothing has been appended to only one side. First post-duplicate edit to either file without a sync step will create silent drift.

---

## 3. Proposal (founder decision; do not execute)

### Already-documented model (preserve)

| Layer | Path | Status |
|---|---|---|
| **Source of truth** | `memory/decisions.md` | Canonical Decision Memory |
| **Machine projection** | `brain/decisions/index.json` | Non-canonical; regenerate via `brain:ingest` |
| **ADR home (example)** | `brain/decisions/adr-*.md` | First-class assets, not a second decisions log |
| **Debt** | `brain/decisions/decisions.md` | Duplicate checkout — must not stay a second editable SoT |

This matches `docs/architecture/memory-engine-runbook.md`, `engineering-constitution.md`, and `brain/decisions/README.md`.

### Options

#### Option A — Delete the MD twin (recommended default) — **XS**

1. Delete `brain/decisions/decisions.md`.
2. Keep/strengthen `brain/decisions/README.md` pointing to `memory/decisions.md`.
3. Grep-fix the few dual mentions (e.g. acquisition Stage0 report) to SoT-only.
4. No `brain:ingest` code change required (`index.json` path unchanged).

**Pros:** Removes dual-edit surface immediately; aligns with Constitution "no parallel log".  
**Cons:** Agents that navigate only under `brain/` lose a local copy (README redirect is enough).

#### Option B — Generate MD mirror from SoT in `brain:ingest` — **S**

1. Extend `brain/src/ingest.ts` to copy `memory/decisions.md` → `brain/decisions/decisions.md` on every ingest/`--check`.
2. Optionally fail `brain:check` if the mirror drifts.
3. Document: never hand-edit the brain MD path.
4. CI already runs ingest into a temp root — extend check against committed mirror if kept in-tree.

**Pros:** Convenience path stays; drift becomes detectable.  
**Cons:** Another committed generated artifact (same class of pain as index refresh / GUARD_BYPASS lessons from Vlna 2). Prefer temp-only generation if convenience is the only goal.

#### Option C — Status quo + discipline — **XS process, high residual risk**

Leave both files; rely on README + agent rules. **Not recommended** — first asymmetric append creates the "two sources of truth" class already called out for brain indexes / dual blueprints.

### `brain:ingest` change estimate

| Option | Ingest change | Docs/CI | Size |
|---|---|---|---|
| A delete twin | None | Light doc/README cleanup | **XS** |
| B generated mirror | Copy + optional `--check` equality | Runbook + maybe CI note | **S** |
| Make ingest *parse* `memory/decisions.md` into `index.json` instead of curated `catalog.ts` specs | Parser + schema + migration of DECISION_SPECS | Larger test surface | **M** (out of scope for dedup; separate initiative) |

**Recommendation for founder:** **Option A (XS)** unless a concrete agent workflow requires a file under `brain/decisions/*.md` for the full log — in that case **Option B** with `brain:check` drift gate, not hand sync.

---

## 4. Explicit non-actions (this PR)

- Did **not** edit `memory/decisions.md` or anything under `brain/decisions/` except by documenting findings here.
- Did **not** change `brain:ingest`, CI, or agent rules.
- Did **not** merge or push to `main`.

Founder decides A / B / C (or defer).