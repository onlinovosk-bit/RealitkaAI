# Critical bug: Realvia worker cross-tenant property overwrite

**Date:** 2026-09-03  
**Severity:** CRITICAL (data corruption / cross-tenant inventory hijack)  
**Status:** Fixed on branch `cursor/fix-realvia-agency-scoped-source-id`

## Bug and impact

`processAdvertPayload` / `processDeletePayload` in `apps/crm/src/lib/realvia/processQueue.ts`
looked up properties by `source_id` alone (service role), then updated/soft-deleted that row.

Schema uniqueness is **per tenant**:

```sql
CREATE UNIQUE INDEX idx_properties_tenant_source_unique
  ON public.properties (agency_id, source_system, source_id)
  WHERE source_id IS NOT NULL AND agency_id IS NOT NULL;
```

So the same Realvia `source_id` is allowed in multiple agencies. A webhook for Agency B
with that `source_id` could:

1. **Overwrite** Agency A's listing (and rewrite `agency_id` to B), or
2. **Soft-delete** Agency A's listing (`sold` / `removed`) on a delete event.

Concrete trigger: two agencies process Realvia jobs for the same numeric `source_id`
(common when IDs are not globally unique across Realvia accounts, or after tenant
onboarding/copy). Cron `/api/cron/realvia-process` runs with service role — no RLS safety net.

## Root cause

Global `source_id` lookup + service-role mutate, despite tenant-scoped unique index.
Create path also forced `propertyData.id = sourceId`, which collides across tenants
once lookups are correctly scoped.

## Fix

- Existence and delete lookups: `.eq('agency_id', …).eq('source_system', 'realvia').eq('source_id', …)`
- Mutates also pin `.eq('agency_id', …)`
- Fail closed when `agencyId` is blank
- Stop setting primary key = Realvia `source_id` on insert (DB generates UUID)

## Validation

```text
npx vitest run src/lib/realvia/processQueue.agency-scope.test.ts \
  tests/verification/realvia-agency-scoped-source.verification.test.ts
→ 6 passed
```

## Kontrolór (short)

| Claim | Label | Evidence |
|-------|--------|----------|
| Unique index is per-tenant | FAKT | migration `20260617120000_uc_export_mapper.sql` |
| Worker queried source_id only | FAKT | pre-fix processQueue.ts |
| Same source_id can exist in 2 agencies | FAKT | unique index allows it |
| Fix scopes by agency | FAKT | unit + verification tests |
