# GMAIL-CONNECT critical bug hunt (#819)

**Date:** 2026-10-20  
**Scope:** OAuth connect/callback/disconnect + pull + migration `20261005100100`  
**Bar:** auth bypass, cross-tenant token access, token leakage, silent data loss, crash in critical path

## Verdict

**(a) One critical correctness bug found and fixed** — disconnect∩pull race can resurrect a wiped connection as `active` with empty ciphertext → UI shows connected, inbound pull silently stops.

## Finding

| Field | Detail |
|-------|--------|
| **Bug** | `markPulled` (and `markError`) update by `agency_id` only |
| **Trigger** | Cron `runGmailInboundPullAll` has loaded agency A’s active row into memory; owner POSTs disconnect (`wipeConnection` → ciphertext `""`, `status=revoked`); in-flight pull succeeds and calls `markPulled(A)` |
| **File:line (before fix)** | `apps/crm/src/lib/inbound/gmail-connect-store.ts` — `markPulled` ~88–94; caller `gmail-pull.ts` ~484. Same class: `markError` ~98–104 / caller ~476 |
| **Root cause** | Post-pull bookkeeping forced `status: "active"` without checking the row was not revoked mid-flight and still has ciphertext |
| **Impact** | Silent inbound data loss: Integrations UI shows **Pripojené** (email + active), next pulls skip the agency (empty ciphertext filtered), labeled portal inquiries never reach `/api/acquire/email` until manual reconnect. Not cross-tenant; not token leak |

### Fix

- `markPulled`: `.eq("status", "active").neq("refresh_token_ciphertext", "")`
- `markError`: `.neq("status", "revoked")`
- Unit + verification guards in the same change

## Checked — no critical issue

1. **OAuth state CSRF / agency confusion** — `signConnectState` HMAC + 15 min TTL; callback requires `state.profileId === profile.id && state.agencyId === profile.agency_id`; save uses `profile.agency_id` only; URL `?agency=` ignored on connect (tests cover foreign state).
2. **Encrypt/decrypt wipe** — decrypt failure disables via `markError`, does not clear ciphertext; missing refresh token aborts before `saveConnection`.
3. **Pull wrong agency credentials** — each job binds `agencyId` + decrypted token from the same DB row; acquire payload uses that `agencyId`; multi-agency tests assert token/post isolation.
4. **Disconnect other agency** — wipe/read keyed only by `profile.agency_id`; extra query params → 400.
5. **Missing auth** — connect/callback/disconnect: `getCurrentProfile` + `canManageGmailConnection` (owner/manager, active, agency set); pull: `Bearer CRON_SECRET` fail-closed.
6. **Refresh-token races (Google)** — `prompt=consent` + reject if `refresh_token` missing; reconnect upsert replaces ciphertext atomically for that agency (last-writer-wins within tenant, not cross-tenant).
7. **Migration** — ciphertext-only storage, scopes check (readonly only), RLS deny-all + revoke for anon/authenticated; service-role only access paths.

## Non-critical notes (not reported as findings)

- Disconnect CSRF: cookie `SameSite=Lax` blocks cross-site POST; no extra CSRF token (consistent with other form POSTs).
- Concurrent connect+disconnect on same agency can orphan a Google grant; reconnect recovers.
