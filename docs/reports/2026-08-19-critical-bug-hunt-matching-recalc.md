# Critical bug hunt — matching recalculate data loss (2026-08-19)

Scope: recently landed `main` commits (#428–#434 area), excluding already-tracked items (#438–#443, billing/credits, properties scoped writes).

## Summary

**2 HIGH-confidence critical bugs found** (both in `matching-store.ts`). No additional HIGH-confidence novel bugs in webhook auth, profile tier throttle, or other unscoped store classes beyond what is already tracked in #443.

---

## Bug 1 — Global recalculate wipes all tenant matches (unscoped list reads)

**Files / functions**
- `apps/crm/src/lib/matching-store.ts` — `recalculateAllMatches`
- `apps/crm/src/app/api/matching/recalculate/route.ts` — `POST` (global branch)
- `apps/crm/src/lib/ai/matching-engine.ts` — `runAImatching` (cron path; delete likely no-op without session)

**Trigger (step by step)**
1. Authenticated user with valid tenant session calls `POST /api/matching/recalculate` with **no** `leadId` / `propertyId` (global recalc).
2. Route passes scoped `supabase` from `createClient()` into `recalculateAllMatches(supabase)`.
3. Function uses scoped client for `DELETE FROM lead_property_matches` (RLS-scoped — **all tenant matches removed**).
4. **But** `listLeads()` and `listProperties()` are called **without** `scoped` → `resolveTenantSupabase()` falls back to browser singleton **without request cookies** → `resolveSessionAgencyId` returns `null` → both lists return `[]`.
5. `rows.length === 0` → function returns `{ totalRows: 0 }` with HTTP 200. **No re-insert.**

**Why critical**
- **Data loss**: every `lead_property_matches` row for the tenant is deleted; none are recreated.
- Fires on an authenticated, intentional admin action (global recalc API).
- User sees success (`inserted: 0` / `totalRows: 0`) with no error.

**Confidence:** HIGH

**Relevant code**

```488:525:apps/crm/src/lib/matching-store.ts
  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);

  try {
    const { error: deleteError } = await withMatchingTimeout(
      "recalculateAll:delete",
      Promise.resolve(supabase.from("lead_property_matches").delete().not("id", "is", null))
    );
    // ...
  }

  const rows = leads.flatMap((lead) => {
    const matches = getMatchingPropertiesForLead(lead, properties, 35);
    // ...
  });

  if (rows.length === 0) {
    return {
      mode: "all",
      totalRows: 0,
      totalLeads: leads.length,
      totalProperties: properties.length,
    };
  }
```

Contrast with `recalculateMatchesForLead`, which correctly passes `scoped` to reads:

```321:322:apps/crm/src/lib/matching-store.ts
  const lead = await getLead(leadId, scoped);
  const properties = await listProperties(undefined, scoped);
```

---

## Bug 2 — Per-lead/property recalculate: delete succeeds, insert timeout → silent wipe

**Files / functions**
- `apps/crm/src/lib/matching-store.ts` — `recalculateMatchesForLead`, `recalculateMatchesForProperty`, `recalculateAllMatches`
- `apps/crm/src/lib/matching-hooks.ts` — `autoRecalculateForLead` / `autoRecalculateForProperty` (swallows result)
- Amplified by #428 `fetchWithTimeout` (8s) + existing `withMatchingTimeout` (8s)

**Trigger (step by step)**
1. User edits a lead (PATCH `/api/leads/[id]`) or calls `POST /api/matching/recalculate` with `leadId`.
2. `recalculateMatchesForLead(leadId, supabase)` runs: **DELETE** all matches for `lead_id` completes.
3. INSERT of recomputed matches is slow (large inventory, DB load, or concurrent 8s abort from `fetchWithTimeout`).
4. `withMatchingTimeout` or fetch abort fires; `isRecoverableMatchingError` matches `"timeout"` in message.
5. Catch block logs warning and returns `{ inserted: 0 }` — **no throw**.
6. Caller (`autoRecalculateForLead` or API route) returns **HTTP 200**; lead PATCH succeeds. UI shows zero matches.

**Why critical**
- **Data loss** after a routine CRM edit (every lead update triggers `autoRecalculateForLead`).
- **False success**: no 5xx, no rollback, delete is not compensated.
- More likely post-#428 when Supabase HTTP aborts at 8s under load.

**Confidence:** HIGH

**Relevant code**

```330:384:apps/crm/src/lib/matching-store.ts
  try {
    const { error: deleteError } = await withMatchingTimeout(
      "recalculateLead:delete",
      Promise.resolve(supabase.from("lead_property_matches").delete().eq("lead_id", leadId))
    );
    // delete succeeds...
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "lead" as const, leadId, inserted: 0 };
    }
    throw err;
  }
  // ... build payload ...
  try {
    let { error: insertError } = await withMatchingTimeout(
      "recalculateLead:insert",
      Promise.resolve(supabase.from("lead_property_matches").insert(payload))
    );
    // ...
  } catch (err) {
    if (isRecoverableMatchingError(err)) {
      console.warn("[matching-store] DB write timeout on recalculate — skipping persist");
      return { mode: "lead" as const, leadId, inserted: 0 };
    }
    throw err;
  }
```

Same pattern exists for `recalculateMatchesForProperty` (lines 414–467) and `recalculateAllMatches` (lines 490–548).

---

## Areas checked — no additional HIGH-confidence novel bugs

| Area | Result |
|------|--------|
| Properties/tasks/leads API unscoped store writes (#443 class) | Same class as **already tracked #443** — not re-reported |
| `resolve-profile-for-auth` tier throttle (#432) | Throttle blocks redundant `ui_role` writes within 1h; session still gets normalized entitlements in memory. No HIGH-confidence paid-feature bypass beyond tracked billing tier bugs |
| `fetch-timeout` / proxy fail-open (#438) | Proxy fail-open already tracked; billing Stripe fail-open returns free plan (UX, not data loss) |
| Google `lead-webhook` allowlist (#412) | Key + rate limit + agency resolution; Stage 0 never inserts CRM leads |
| `load-dashboard` / acquisition page (#430) | Under `(dashboard)/layout` which calls `linkProfileToAuthUser` first; empty dashboard if profile still unlinked is degraded UX, not auth bypass |
| `recalculateMatchesForProperty` unscoped reads | `getProperty` / `listLeads` without `scoped` → throws before delete in prod (broken recalc, not wipe) |
| Listing PATCH title strip (#398) | Verification test exists; not re-validated as open bug |
| Acquisition sync persist (#423) | Gated by `ACQUISITION_PERSIST_SYNC === "true"` only |
| Pagination (#425) | Caps at 500 rows — visibility truncation, not mutation data loss |

---

## Recommended fixes (not implemented in this report)

1. **Bug 1:** Pass `scoped` into `listLeads(undefined, scoped)` and `listProperties(undefined, scoped)` inside `recalculateAllMatches`; same for `recalculateMatchesForProperty` reads.
2. **Bug 2:** Delete-after-insert in a transaction, or delete only after successful insert (replace-all via upsert), or on insert failure re-throw / restore from snapshot; never return success when `inserted === 0` after a successful delete unless matches were intentionally empty **before** delete.

---

## Verification

- Static code audit + git history (`matching-store.ts` delete-then-insert pattern since Wave 28; #428 increases timeout likelihood).
- No code changes in this report-only commit.
