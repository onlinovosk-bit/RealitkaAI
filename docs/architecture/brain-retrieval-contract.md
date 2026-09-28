# Brain retrieval / discoverability contract

**Status:** active (activation V1)  
**Owner:** founder  
**Related:** [[brain/ENGINE|ENGINE]], [[docs/architecture/MAPA|Mapa]]

## What the registry is

`brain/registry/index.json` is **not** a file crawler over the whole repo.
It is a **semantic registry**: a small set of curated `RegistrySpec` records in
`brain/src/catalog.ts`. Each record has `roots[]`; ingest expands those roots
into an **inventory** (`fileCount` + digest + sample).

As of activation baseline on `origin/main`:

| Metric | Value |
|---|---|
| Semantic registry records | 24 (before activation additions) |
| Inventory coverage (sum of `inventory.fileCount`) | ~947 files |

Adding a folder wholesale to the registry is **not** the same as adding
hundreds of individual Obsidian notes. Prefer one semantic record whose roots
cover the durable corpus.

## Discoverability rules

1. **New durable knowledge surfaces** get a `RegistrySpec` in
   `brain/src/catalog.ts` — **not** in `ingest.ts` (ingest only builds/writes).
2. **Keep** explicitly curated briefs and build packages already listed in the
   catalog (moat-capture, guardian-v1, operator-dashboard, premortems, VEOS).
3. **Do not** register entire trees:
   - `docs/reports/**` — ephemeral working papers
   - `docs/briefs/**` — except existing curated build-package roots
   - `docs/prompts/**` — except existing curated process roots
4. **Decisions SoT** is only [[memory/decisions|Rozhodnutia]]. Root
   `decisions.md` is a redirect. `brain/decisions/decisions.md` is forbidden.
5. **Retrieval path for agents:** registry id → `source.path` / `roots` →
   inventory sample → open the file. Do not invent a second index.

## Target size

There is **no** “60–80 documents” target. Record count stays small and semantic.
Inventory file counts grow as roots expand; that is expected.

## Activation V1 additions

- `memory.workspace` — `memory/` (session/ops surfaces; decisions still
  `memory.decisions`)
- `docs.audit-corpus` — `docs/audit/`
- `brain.audits` — committed `brain/audits/` history
- `brain.retrieval-contract` — this document
