# CRITICAL: Gmail reconnect ∩ pull `markError` disables new token

**Date:** 2026-10-21  
**Head:** `cursor/critical-bug-detection-046d`  
**Scope:** #819 gmail-connect, beyond tracked #902 (wipe∩`markPulled` resurrection)  
**Bar:** data loss / silent inbound stop / token corruption races

## Verdict

**1 HIGH** — reconnect (or any ciphertext rotation) during in-flight pull → `markError(..., disable=true)` turns the **new** active connection to `error` → inbound silently stops until manual reconnect.

Other scoped areas (#872 lead_created, #816 Realvia SEC-01, #888 CRON-TRUTH-01, #887 monthly grant hard-fail): **NONE_FOUND** at this bar after code review (see §Cleared).

## Finding

| Field | Detail |
|-------|--------|
| **Bug** | `markError` / `markPulled` update by `agency_id` only (even after #902’s `.neq(status, revoked)`), so they apply to whatever row is there when the UPDATE runs — including a freshly reconnected ciphertext |
| **Trigger** | 1) Cron `runGmailInboundPullAll` loads agency A, decrypts ciphertext **T1**. 2) Owner disconnects (`wipe` → revoked, revoke T1 at Google) then reconnects (`saveConnection` → **T2**, `status=active`). 3) In-flight refresh of T1 returns `invalid_grant`. 4) `markError(A, …invalid_grant, true)` sets `status=error` on the row that now holds **T2**. Same class without wipe: reconnect alone if Google invalidates the prior refresh token. |
| **File:line (before)** | `apps/crm/src/lib/inbound/gmail-connect-store.ts` `markError` / `markPulled`; caller `apps/crm/src/lib/inbound/gmail-pull.ts` ~474–484 |
| **Impact** | Valid new OAuth token left in DB but `status=error` → `loadActiveConnections` skips agency → labeled portal mail never reaches `/api/acquire/email` until UI reconnect. Silent inbound stop (not cross-tenant). |
| **Confidence** | **HIGH** — unconditional UPDATE by agency_id; #902 only skips `revoked`, not `active` with rotated ciphertext; disconnect path explicitly revokes T1 (`revokeGoogleToken`). |
| **Why not #902** | #902: wipe → empty ciphertext + `markPulled` resurrects `active`. This: wipe→reconnect (or rotate) → **non-empty T2** + `markError` disables it. |

### Fix (this PR)

- `markPulled(agencyId, expectedCiphertext?)` / `markError(..., expectedCiphertext?)`: when ciphertext provided, `.eq("refresh_token_ciphertext", expectedCiphertext)`; also keep #902-style filters (`status=active` + non-empty for pull; `neq revoked` for error).
- `runGmailInboundPullAll` remembers ciphertext at job start and passes it into callbacks.

## Cleared (no new HIGH)

1. **OAuth CSRF / wrong agency on callback** — HMAC state + session bind (`state.profileId`/`agencyId` must match `getCurrentProfile`); save uses `profile.agency_id`.
2. **Encrypt/decrypt silent** — bad blob → throw → `token_undecryptable` + disable (now ciphertext-scoped).
3. **Pull deleting Gmail messages** — `gmail.readonly` only; no trash/modify API.
4. **Cross-tenant inbound** — job binds `agencyId` + token from same DB row; acquire payload uses that id (shared-secret trust of Worker `agencyId` is known near-miss, not new in this pass).
5. **#872 lead_created** — fail-soft `logEvent` with service-role; lead insert path unchanged; skip without profile is intentional.
6. **#816 Realvia SEC-01** — `collectRequestHeaders` redacts `identifikator*`; resolve still uses raw headers; `dump=headers` behind `CRON_SECRET`.
7. **#888 CRON-TRUTH-01** — `failed` requires `failed > 0`; does not map real failure counters to empty; HTTP retry paths that key off `failed` unchanged for true failures.
8. **#887 monthly grant hard-fail** — RPC/`agency_not_found` surfaces `ok:false` → credits-cycle 500 for Vercel retry; soft skip remains `ok:true skipped`.

## Skipped tracked

#902 (wipe∩markPulled), #843, #859, #877, #881, #883
