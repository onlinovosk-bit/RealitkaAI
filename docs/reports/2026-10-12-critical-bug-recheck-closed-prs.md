# Critical bug re-check — closed-without-merge PRs (>30d)

**Branch:** `cursor/critical-bug-management-c308` (= `origin/main` @ `cf0ddd7c`)  
**Date:** 2026-10-12  
**Scope:** Re-verify 7 bugs whose fix PRs were closed without merge (>30 days). Report **only** paths that still exist with a concrete trigger. Skip if fixed another way.

| # | Area | Closed PR | Disposition on current main |
|---|------|-----------|-----------------------------|
| 1 | properties-store scoped mutations | #443 | **FIXED** via #776 |
| 2a | matching unscoped list → wipe | #444 / #719 | **FIXED** via #719 |
| 2b | matching delete-then-insert timeout wipe | #444 finding 2 | **STILL PRESENT** |
| 3 | invite upsert `agency_id` | #447 | **FIXED** via #734 |
| 4 | auth-email-tests recovery cross-tenant | #462 | **FIXED** via #767 |
| 5 | HubSpot/analyze fail-open null agency | #486 | **FIXED** via #734 + `sameAgency` |
| 6 | lead-automation / assignment rules | #490 | **FIXED** via #752 |
| 7 | inbound-lead webhook silent drop + fake BRI reply | #495 | **FIXED** via #722 / #776 / process-lead rewrite |

---

## STILL PRESENT (ranked by severity)

### 1. Matching recalculate: DELETE succeeds, INSERT timeout → silent wipe

- **Severity:** data loss (HIGH)
- **Origin:** #444 finding 2 (report-only PR closed without merge; #719 fixed only the unscoped-read wipe)
- **Minimal fix obvious:** yes — do not ACK success after delete if insert fails/times out; prefer transaction, or defer delete until after insert staging, or restore from pre-delete snapshot / fail the HTTP request with 5xx

#### Vulnerable code

`apps/crm/src/lib/matching-store.ts` — after a successful delete, insert timeouts are swallowed and the handler returns `{ inserted: 0 }` (HTTP 200 via `/api/matching/recalculate`):

```336:391:apps/crm/src/lib/matching-store.ts
  try {
    const { error: deleteError } = await withMatchingTimeout(
      "recalculateLead:delete",
      Promise.resolve(supabase.from("lead_property_matches").delete().eq("lead_id", leadId))
    );
    // ...
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

Same pattern in `recalculateMatchesForProperty` (insert catch ~479) and `recalculateAllMatches` (insert catch ~570). Timeout window defaults to 8s:

```46:53:apps/crm/src/lib/matching-store.ts
const MATCH_DB_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_MATCHING_DB_TIMEOUT_MS ?? "8000");

function isRecoverableMatchingError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return ["timeout", "timed out", "statement timeout", "canceling statement",
    "failed to fetch", "fetch failed", "networkerror", "network error",
```

Entry route returns ok on success path:

```20:38:apps/crm/src/app/api/matching/recalculate/route.ts
    if (leadId) {
      const result = await recalculateMatchesForLead(leadId, supabase);
      // ...
      return okResponse({ mode: "lead", result });
    }
```

#### Concrete trigger

1. Broker (authenticated session) has existing rows in `lead_property_matches` for lead `L`.
2. `POST /api/matching/recalculate` with body `{ "leadId": "<L>" }` (or `{ "propertyId": "…" }` / empty body for global).
3. DELETE of prior matches completes within 8s.
4. INSERT of new match rows exceeds `MATCH_DB_TIMEOUT_MS` (8s), or hits a recoverable network/timeout error.
5. Store returns `{ inserted: 0 }`; route answers **200 ok**. Prior matches are gone; UI shows “prepočítané” with zero rows.

Also reachable after property edit via `autoRecalculateForProperty` → same store path.

#### What #719 did / did not fix

- **Fixed:** unscoped `listLeads`/`listProperties` + empty-read wipe (reads now take `scoped`; empty list returns before delete on property/all paths).
- **Not fixed:** delete-then-swallow-insert-timeout.

---

## FIXED elsewhere (evidence only — not actionable)

### 1. properties-store mutations omit scoped client — FIXED (#776)

`POST /api/properties` and `PATCH|DELETE /api/properties/[id]` pass request `supabase` into `createProperty` / `updateProperty` / `deleteProperty`. Covered by `apps/crm/src/app/api/properties/__tests__/scoped-client.test.ts`.

### 2a. matching unscoped list wipe — FIXED (#719)

`recalculateMatchesForProperty` / `recalculateAllMatches` pass `scoped` into list helpers and refuse to delete when the read set is empty.

### 3. invite upsert without `agency_id` — FIXED (#734)

`apps/crm/src/app/api/invite/route.ts` stamps `agency_id: profile.agency_id`, requires caller agency, blocks cross-agency email move, surfaces profile upsert errors.

### 4. auth-email-tests cross-tenant recovery — FIXED (#767)

`assertSameAgencyTarget` gates owner `recovery` / `recovery-link`; invite upsert includes `agency_id`. Tests in `__tests__/route.test.ts`.

### 5. HubSpot sync + ai/call/analyze fail-open — FIXED (#734)

Both use `sameAgency()` which returns `false` when either side is null (`apps/crm/src/lib/tenant-scope.ts`).

### 6. lead-automation / automation rules cross-tenant — FIXED (#752)

Routes require `agency_id`, pass cookie client into store, `assertRuleOwned` before PATCH/DELETE; store filters `.eq("agency_id", tenantAgencyId)`.

### 7. inbound-lead webhook silent drop + fake BRI reply — FIXED (#722 / #776)

`POST /api/webhooks/inbound-lead`: secret **required** (503 if unset), Bearer check, `processInboundLead` uses service-role, throws on insert failure, `briScore = bri?.new_score ?? null` (no draft when BRI missing). Residual `score: 50` on the **leads.score** insert column is a display default, not the BRI used for reply gating — not the original silent-drop / fake-BRI-triggers-reply bug.

---

## Summary

| Still present | Severity | Fix obvious |
|---------------|----------|-------------|
| Matching recalculate delete + insert-timeout ACK | data loss | yes |

**Count:** 1 still present / 6 original areas fixed by later merges.
