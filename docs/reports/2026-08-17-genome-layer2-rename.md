# L24 Genome Layer 2 rename

**Lane:** N1-L24  
**Branch:** `chore/genome-layer2-rename`  
**Date:** 2026-08-17  
**Mode:** branch + PR + STOP. Migration file only — not applied.

## Gate

- `origin/main` HEAD `b4e947580`; ancestor `d6b9e351` present.
- `D-2026-08-17-01` and `D-2026-08-17-02` present on that main.

## What changed

- Replaced illegal `apps/crm/supabase/migrations/2026_genome_layer2.sql` (version token `2026`) with `apps/crm/supabase/migrations/20260817120000_rename_genome_layer2.sql`.
- DDL unchanged (idempotent `IF NOT EXISTS` / `CREATE OR REPLACE`).
- Verification test accepts legacy name **or** 14-digit `*_rename_genome_layer2.sql` / `*_genome_layer2.sql`.
- Catalog evidence path updated to the new filename; note still names the legacy file.

## Verification

- `npx vitest run tests/verification/genome-layer2-rename.verification.test.ts` — 3 passed.
- `npx vitest run src/lib/agents/followup/__tests__` — 23 passed.

## Founder apply (required before merge)

Do **not** `supabase db push`. Do **not** Dashboard-apply from any other lane.

1. Supabase Dashboard → SQL Editor (prod).
2. Paste and run the full file `20260817120000_rename_genome_layer2.sql` (idempotent; objects already live).
3. Record history (same path as `20260811220000_acquisition_core`):

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, created_by)
VALUES ('20260817120000', 'rename_genome_layer2', NULL);
```

4. Confirm:

```sql
SELECT version, name, created_by
FROM supabase_migrations.schema_migrations
WHERE version = '20260817120000';
```

Do **not** INSERT version `2026`. Audit 2026-08-15: no history row for `2026`; tables already exist.

## Do not merge until

- The INSERT above is confirmed on prod.
- No `db push` of the 46/94 drift set.

## Not done

- Migration not applied (forbidden).
- `memory/` not written.
- No merge, no push to main.