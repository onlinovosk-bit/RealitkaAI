# Critical bug hunt — 2026-11-02

Head audited: `origin/main` @ `24d0eed6` (#935).
Scope: matching/recommendations wipe, auth/permission, capture/acquire dedup,
gmail OAuth, outreach unsubscribe, deliverability, bus-core cost-governor.

## NEW CRITICAL (this PR)

### Recommendations rebuild from PostgREST-capped match page

- **File:** `apps/crm/src/lib/recommendations-store.ts`
- **Mechanism:** `listPersistedMatches` selected `lead_property_matches` ordered by
  score with no pagination. Supabase/PostgREST `max_rows = 1000`
  (`apps/crm/supabase/config.toml`). A full page is not a complete tenant match
  set.
- **Global trigger:** `POST /api/recommendations/recalculate` `{}` when the agency
  has &lt;500 leads (passes #927 lead guard) but &gt;1000 match rows →
  `clearRecommendations` then rebuild from the top-1000-by-score page only.
  Leads whose matches sit below that cut get `missing_inventory_match` instead of
  `property_match`.
- **Per-lead trigger:** same handler with `{ leadId }` loaded the **global** top
  page then `filter(leadId)`. A lead with real matches outside that page looked
  like zero matches → DELETE that lead’s `ai_recommendations` → insert
  `missing_inventory_match`.
- **Impact:** silent corruption / wipe of match-based AI recommendations
  (HTTP 200). Distinct from #930 (DB **error** → `[]`), #927 (lead LIST_MAX /
  empty lead page), #924 (matching lead/property LIST_MAX).
- **Fix:** fail-closed global clear when `matches.length >= MATCHES_READ_MAX`
  (1000); per-lead path reads `.eq("lead_id", leadId)` (≤35 rows from matching).

## Checked — no NEW critical beyond tracked open PRs

| Area | Result |
|------|--------|
| `matching-store` DELETE-then-INSERT timeout soft-return | Still #843 |
| `matching-store` LIST_MAX lead/property truncation | Still #924 |
| `matching-store` empty property read on lead recalc | Merged #883 |
| `recommendations` empty / lead LIST_MAX | Merged #927 |
| `recommendations` match **error** soft-fail `[]` | Still #930 (not this PR) |
| `outreach` `fetchLeadAgencyId` null → `SYSTEM_USAGE_AGENCY_ID` | Still #923 |
| Gmail `markPulled` resurrect wiped OAuth | Still #902 |
| Gmail `markError` disable reconnected token | Still #911 |
| `acquire_dedup_keys` global PK | Still #881 |
| Team users / teams role mint + agency body | Merged #935 |
| Public capture / capture-lead (#896) | Key server-side; `leads_demo` only; 401/503 without key |
| Unsubscribe / suppression / resend bounce (#910) | HMAC fail-closed; GET no write; Permanent bounce only |
| Cost governor | Authorize fail-closed on bad config/ledger; multi-process file race documented, not newly introduced |
| Gmail connect callback | State bound to session agency/profile |
| Assign-lead | Target profile must share caller `agency_id` |

## Validation

```bash
cd apps/crm && npx vitest run \
  src/lib/__tests__/recommendations-recalculate-fail-closed.test.ts \
  tests/verification/matching-recommendations-scoped-writes.verification.test.ts
```
