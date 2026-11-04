# Critical bug hunt — auth / unsubscribe / capture / team (2026-11-03)

**Head checked:** `origin/main` @ `24d0eed6` (includes merged #935 team users gate)  
**Branch:** `cursor/critical-bug-remediation-8d1d`  
**RAU:** FIX / revolis — hunt language tripped `db-mutation` on „wipe“; work is code+report only (no PROD/DB/merge).

## Scope reviewed (source)

- `apps/crm/src/lib/email/suppression.ts`
- `apps/crm/src/lib/email/unsubscribe-token.ts`
- `apps/crm/src/app/api/unsubscribe/route.ts`
- `apps/crm/src/app/api/notifications/unsubscribe/route.ts`
- `apps/crm/src/app/api/resend-webhook/route.ts`
- `apps/crm/src/lib/outreach-store.ts` (suppression + List-Unsubscribe)
- `apps/crm/src/proxy.ts` (PUBLIC_PATHS, starter-pack, cron bypasses)
- `apps/crm/src/app/api/team/**` (users, teams, assign-lead)
- Capture / public forms: `demo/capture-lead`, `demo/public-capture`, `leads/inbound`, `acquire/email`, `valuation/submit`, `starter-pack/download`, `onboarding/session`, concierge, hubspot webhook, google lead-webhook
- Adjacent: `profiles/[id]`, `invite`, morning-brief track, followup cron auth

## Skipped (already tracked — not re-reported)

| Item | PR |
|------|-----|
| outreach `fetchLeadAgencyId` → `SYSTEM_USAGE` suppression/unsub scope | #923 (open) |
| gmail markError/markPulled ciphertext races | #911, #902 (open) |
| team users/teams role mint + body.agencyId | #935 (merged) |
| public form capture API key | #896 (merged) |
| starter-pack proxy HMAC allowlist | #929 (merged) |
| `acquire_dedup_keys` global PK | #881 (open) |

## NEW CRITICAL

### 1. `PATCH /api/profiles/[id]` mints `founder` → unpaid `protocol_authority`

| | |
|--|--|
| **Severity** | CRITICAL — privilege / entitlement escalation |
| **File** | `apps/crm/src/app/api/profiles/[id]/route.ts` (role write via `createAdminClient`, previously no allowlist; self-check only `id === user.id`) |
| **Concrete trigger** | Tenant **owner** (or legacy founder) calls `PATCH /api/profiles/{teammateProfileId}` with `{ "role": "founder" }`. Service-role update succeeds. Same owner can also target **their own profile PK** (`id ≠ auth.uid()`) because the self-refusal compared only auth uid. |
| **Impact** | `role === "founder"` short-circuits license gates to **`protocol_authority`** (`lib/license/resolve-account-tier.ts`, `lib/license/access.ts`) and hub tier **enterprise** (`api/hub/get-tier`). Paid program access without Stripe. Invite + team/users already refuse minting `founder` for this reason. |
| **Root cause** | August #493-era fix required owner+admin for role flips but left `body.role` unconstrained. Self-guard used auth uid, while modern `profiles.id` is not `auth.users.id`. |
| **Why not duplicate** | #935 closed `/api/team/users` + `/api/team/teams` only. `/api/invite` already has `INVITABLE_ROLES`. This is the remaining service-role role writer without the same allowlist. |

**Fix in this PR:** `ASSIGNABLE_ROLES` = owner/manager/agent; refuse self role change on profile PK **or** auth uid; unit + verification updates.

## Cleared at CRITICAL bar (this pass)

- Unsubscribe HMAC fail-closed; GET confirm / POST mutate; legacy notifications/unsubscribe → redirect only.
- Resend webhook: secret required (503), Standard Webhooks verify; bounce/complaint → global suppression.
- Outreach suppression path fail-closed (agency wrong-scope remains #923 only).
- Public capture: key server-side; writes `leads_demo`.
- Inbound form: slug+token; acquire/email: shared secret fail-closed; valuation: tenant slug resolve.
- Starter-pack: HMAC + purchase row; in `PUBLIC_PATHS`.
- Team assign-lead: agency filter on profile + lead.
- Team create owner gate present on main (#935).
- Proxy: no new accidental public API beyond reviewed set; cron paths still gated in handlers.

## Non-critical notes (not filed)

- `rateLimit` fail-open when service role/RPC missing → public capture spam to `leads_demo` possible.
- Inbound auto-response path has no `checkSuppression` (transactional ack; compliance judgment separate).
- `GET /api/team/users` calls `listProfiles()` without request-scoped client (demo fallback risk on misconfig — not cross-tenant PROD leak proven here).

## Evidence

- Unit: `src/app/api/profiles/[id]/__tests__/route.test.ts`
- Verification: `tests/verification/profiles-role-agency-guard.verification.test.ts`
