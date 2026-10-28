# Critical bug hunt — capture / permissions / semantic / PUBLIC_PATHS

**Date:** 2026-10-21  
**Head:** `ddea820c` (`fix(F2): public form capture…` #896) on `cursor/critical-bug-detection-046d`  
**Scope:** auth bypass, permission fail-open, cross-tenant read/write, silent data wipe  
**Prior audit:** `audit-2026-10-20-realvia-permissions-auth` (cleared #816/#866/#880/#892/#895) — rechecked after #896

## Verdict

**NONE_FOUND** (high confidence) for the CRITICAL bar above.

## Checked

### 1. #896 public-capture + #895 capture-lead

| Path | Result |
|---|---|
| `POST /api/demo/capture-lead` without `x-api-key` | **401** before admin client / insert (`capture-lead/route.ts:15–25`) |
| Env unset / empty | **503**, no write (`:16–20`) |
| Browser clients | Hero + AcquisitionHub call **only** `/api/demo/public-capture` — no key in client JS |
| `public-capture` | Injects `DEMO_CAPTURE_API_KEY` in-process; returns upstream body only — **no key leak** (`public-capture/route.ts:81–120`) |
| Source field | Enum-limited marketing attribution into **`leads_demo`** (admin insert), not CRM `leads` / agency_id — **no cross-tenant agency write** |
| Direct capture-lead still in `PUBLIC_PATHS` | Intentional for server callers; still key-gated |

### 2. #866 `team_member_permissions`

| Case | Result |
|---|---|
| Empty table / missing row / read error (team member) | `UNKNOWN_TEAM_PERMISSIONS` — **all `false`** (`nav/permissions/route.ts:51–57`, `types/navigation.ts:90–98`) |
| Solo (`!team_license_id`) | `DEFAULT_TEAM_PERMISSIONS` (export true) — intentional, own contacts only |
| Migration defaults | All permission columns `DEFAULT false` (`20261016170000_…sql:83–89`) |

Fail-open would be returning DEFAULT for team members; code does not.

### 3. #880 semantic search `service_role`

- RPC via `createAdminClient()` yields candidate IDs only (`semantic/route.ts:140–148`).
- Details loaded with session client + `.eq("agency_id", callerAgencyId)` (`:199–203`, `:226–230`).
- No `agency_id` → RPC skipped, ILIKE fallback (`:134–138`).
- Unit test pins foreign ID drop (`semantic/__tests__/route.test.ts`).

### 4. #892 listing-from-photos flag OFF

- `LISTING_FROM_PHOTOS_V0 === "1"` only (`listing-from-photos-flag.ts:6–8`).
- Route returns **404** before auth spend when off (`listing-from-photos/route.ts:85–87`).

### 5. #880 starter-pack download token

- Prod without real secret → `verify` returns `null` → **403** (`download-token.ts:16–20`, `:34`).
- Prod without DB client → **503** (cannot verify purchase) (`download/route.ts:18–20`).
- Bundle is static HTML, not tenant CRM data — no cross-tenant data leak vector in this path.

### 6. `proxy.ts` PUBLIC_PATHS

- **Only new public route since prior audit:** `/api/demo/public-capture` (#896).
- Other public entries unchanged; no newly ungated dangerous CRM mutate/read routes in this delta.

### Briefly re-verified (prior clears)

- **#816** Realvia: `validateSecret` still reads raw `identifikator*` / `x-revolis-secret`; redaction only in `collectRequestHeaders`.
- **#895** fail-closed: still present; tests cover unset/empty/wrong/missing key.

## Non-critical notes (out of CRITICAL bar)

- `rateLimit` fail-opens when service role / RPC unavailable (`rate-limit.ts:44–46`, `:60–63`) — documented on public-capture; enables spam of `leads_demo`, not auth bypass / tenant write / wipe.
- `/api/starter-pack/download` is **not** in `PUBLIC_PATHS` while relying on emailed tokens — availability issue for anonymous buyers, not a security fail-open.
- `docs/audit/route-gates.md` still describes capture-lead gate weakly vs #895 code (inventory drift).

## Evidence commands (this turn)

- Read: `public-capture/route.ts`, `capture-lead/route.ts`, `nav/permissions/route.ts`, `types/navigation.ts`, `search/semantic/route.ts`, `starter-pack/download{,-token}.ts`, `proxy.ts`, listing flag/route, Realvia `validate.ts`.
- `git show` on `ddea820c`, `e89deed4`, `5c6956cb`, `0fe3c3a1`, `141f248e`.
