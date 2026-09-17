# Critical bug: profile email ILIKE wildcards → account takeover / cross-tenant lead dump

**Date:** 2026-08-15  
**Branch:** `cursor/critical-bug-management-2148`  
**Verdict:** ONE critical bug found (fixed in this PR)

## Bug

**Profile email lookup uses PostgreSQL `ILIKE` with the raw login email.** In `LIKE`/`ILIKE`, `_` matches any single character and `%` any sequence. Login as `in_o@agency.sk` therefore matches profile `info@agency.sk`.

### Call path

1. `login` / dashboard layout / `/api/leads/inventory` call `linkProfileToAuthUser` + `resolveProfileForAuthUser`
2. `findProfileByEmailCandidates` → `.ilike("email", candidate)` (also via **service role**, so RLS does not contain blast radius)
3. If the matched profile has `auth_user_id` null → `persistAuthUserIdLink` steals the row (service-role fallback if RLS blocks)
4. Even without a successful link, `resolveProfileForAuthUser` can return the victim profile
5. `/api/leads/inventory` then uses `profile.agency_id` with **service-role** fallback when RLS returns 0 leads → full agency lead/PII dump

### Concrete trigger

1. Victim agency has an unlinked (or higher-entitlement) profile `info@victim-rk.sk` (common inbox) — or any email that differs by one character from an underscore pattern
2. Attacker authenticates to Revolis with email `in_o@victim-rk.sk` (owns that mailbox / OAuth)
3. Attacker opens workdesk / `GET /api/leads/inventory`
4. Impact: account takeover of the invite profile and/or exfiltration of all leads for the victim `agency_id`

### Root cause

`apps/crm/src/lib/profiles/resolve-profile-for-auth.ts` — `findProfileByEmailCandidates` used `.ilike("email", candidate)` for case-insensitive match without neutralizing `LIKE` wildcards.

### Minimal fix

- If the candidate contains `_` or `%` → use `.eq("email", candidate)` (exact)
- Otherwise keep `.ilike` for legacy case-insensitive match on normal emails
- Unit + verification coverage for the guard

### Files

- `apps/crm/src/lib/profiles/resolve-profile-for-auth.ts`
- `apps/crm/src/lib/profiles/__tests__/email-lookup-ilike-wildcard.test.ts`
- `apps/crm/tests/verification/auth-email-ilike-wildcard.verification.test.ts`

## Areas checked (no additional critical filed)

| Area | Why rejected / already tracked |
|------|--------------------------------|
| #369–#401 tracked billing/credits bugs | Explicitly skipped |
| Checkout empty `agencyId` | Prior near-miss; still medium without new stronger trigger |
| Acquisition connect shared `customer_id` UNIQUE | Prior near-miss; Stage 0 shared MCC may be intentional |
| `syncAccountTier` `listUsers` no pagination | Prior near-miss; incomplete sync, not proven wipe |
| Lead-webhook / connect / sync / dashboard | Stage 0 logging only; no CRM lead insert; auth looks sound |
| Listing generations PATCH (#398) | C4 fields present; tenant guard on update |
| Valuation attribution (#382) | Display/persist only |
| Profile request memo (#416) | Per-request `React.cache`; no cross-user leak found |
| `applyTopupPurchase` unchecked balance | Already #401 |
| Grant ledger-then-update skip | Needs mid-flight DB failure; lower practical severity than auth ILIKE |

## Verification

```text
npm test -- src/lib/profiles/__tests__/email-lookup-ilike-wildcard.test.ts \
  src/lib/profiles/__tests__/link-profile-to-auth.test.ts \
  src/lib/profiles/__tests__/resolve-profile-for-auth.test.ts \
  src/lib/profiles/__tests__/resolve-profile-service-fallback.test.ts \
  src/lib/profiles/__tests__/auth-profile-request-memo.test.ts \
  tests/verification/auth-email-ilike-wildcard.verification.test.ts
→ 6 files / 21 tests passed
```

## Kontrolór (short)

- **FAKT:** `.ilike("email", candidate)` in resolver (code read).
- **FAKT:** PG `ILIKE` `_` wildcard (language).
- **FAKT:** service-role merge + inventory service fallback (code read).
- **PREDPOKLAD:** attacker can obtain auth for a crafted underscore email on a matching domain — exploitability not universal, but defect is authz-critical when trigger exists.
- **Verdikt:** PASS to ship minimal guard; do not wait for production exploit evidence.
