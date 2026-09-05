# Brain OS Activation V1

**Branch:** `chore/brain-os-activation`  
**Baseline:** see PR body SHA  
**Merge:** founder only

## Amendments vs original prompt

| Item | Original | Applied |
|---|---|---|
| T1 SoT | Redirect root `decisions.md` | + remove from `memory.decisions` catalog roots; path-qualified `[[memory/decisions\|Rozhodnutia]]` |
| T2 weekly | Amend memory-engine-report | New workflow `brain-weekly-audit.yml`: audit pair → `brain:weekly` → PR; min permissions; concurrency; no empty/dup PR; never main |
| T3 registry | Target 60–80 docs via ingest | Retrieval contract; keep curated briefs; no wholesale reports/briefs/prompts; new specs in `catalog.ts` |
| T4 vault | MAPA + OBSIDIAN | Path-qualified wiki links; no `[[INDEX]]` |
| T5 review_by | Decision record + PR note | `status: active → stale`; overrun in audit finding; **no** invented decision |

## Evidence notes

- `memory-engine-report.yml` line ~58: `continue-on-error: true`; artifacts `retention-days: 14` unchanged.
- `brain:weekly` reads `brain/audits/`, writes `brain/learning/` only.
- Registry specs live in `brain/src/catalog.ts`.
- New schedule trigger classified GO REQUIRED in ENGINE; workflow is the approved automation form.
