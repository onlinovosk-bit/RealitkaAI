# Critical bug hunt — auth / SECURITY DEFINER / ghostwriter / Realvia (2026-10-18)

**Head:** `626748f0` (main tip at window end)  
**Branch:** `cursor/critical-bug-scan-f19c`  
**Window:** ~7 days ending `626748f0` (from `ce2be49a` / #846 through marketing #878)  
**Skipped tracked:** #843 #845 #859 #877 #881  

## Verdict

**NONE** — no new CRITICAL auth bypass or cross-tenant write with a concrete trigger in the focus set.

## Focus clearance (evidence)

### 1. Ghostwriter `send-email` after #874 (`4a9dd312`)

- **Before:** service-role stamp selected nonexistent `profile_id`; failed select → `!letter` allow path → `UPDATE ghostwriter_letters SET email_sent_to… WHERE id = :any`.
- **After:** route no longer writes `ghostwriter_letters` (comment + test `ownership-fail-closed.test.ts`: `adminFromMock` never called).
- Send still requires session + `agency_id` + `authorizeSend`; `letterHtml` comes from the caller body (no cross-tenant letter read/write).

### 2. SECURITY DEFINER → service role (#846 / `ce2be49a`)

| Caller | Client after #846 | Tenant / auth gate |
|--------|-------------------|--------------------|
| `api/price-trail` → `addPricePoint` | `createAdminClient` | `profile.id` from session |
| `api/leads/bri-recompute` → `computeBRI` | admin | `profile.id` from session |
| `api/events` → `recomputeBRI` | admin | `profile.id` from session |
| `api/cron/*` bri/arbitrage | admin | `CRON_SECRET` |
| `morning-brief/track/{open,click}` | admin | unauthenticated by design (email pixel); RPC only sets `opened_at` / `clicked_at` on known brief UUID |

No path found that passes client-supplied `p_profile_id` / `agencyId` into these RPCs after the switch.

**Known ops remainder (not a new regression):** package D `docs/ops/prod-packages/secdef-callers-close/` is still **SQL NEAPLIKOVANÉ** (mapa 2026-10-14, gate `GO D-APPLY`). Until apply, `authenticated` may still `EXECUTE` `add_price_point` / `compute_bri_*` directly with a chosen `p_profile_id` (pre-existing hole the package is meant to close). Code side of #846 is ready; this hunt does not treat the deferred apply as a fresh CRITICAL introduce.

### 3. Realvia `dump=headers` (#850 / `f7f53686`)

- `hasCronAuthorization`: fail-closed when `CRON_SECRET` unset/blank; requires `Authorization: Bearer …`.
- Proxy/auth headers redacted in `collectRequestHeaders`.
- Verification: `realvia-dump-headers-auth.verification.test.ts` + route tests.

### 4. Billing / checkout cross-tenant

- `credits/checkout` (#867): only adds `missingPriceEnvKeys` on 503; sessions still built via `requireCheckoutAgencyId(profile)` from session helpers (seat/top-up/v2).
- No body `agencyId` accepted for checkout metadata in these paths.

### 5. Other recent API auth-touching commits in window

- Morning-brief settings (#852): session client; `profile_id` never from body.
- Portal import (#858): `agency_id` from session profile on insert (fixes silent RLS zero, not a bypass).
- Acquire email (#872): events wire only; agency still from Worker payload under shared secret (near-miss already noted; cross-agency dedup wipe tracked as #881 — skipped).

## Below CRITICAL (not filed)

- Unauthenticated brief pixel can flip `opened_at`/`clicked_at` if brief UUID is known — intentional tracking design, analytics pollution only.
- `createAdminClient()` falls back to anon/publishable key if service role env missing — reliability footgun, not privilege escalation (and distinct from fail-closed `createServiceRoleClient()`).
- Ghostwriter generate still inserts letters via admin without tenant columns (schema gap); append-only, not overwrite of another tenant’s row by id.

## Primary sources this turn

- `git show` / `git log` on `4a9dd312`, `ce2be49a`, `f7f53686`, `661d9f0d`, and API file list in window
- Current routes: `ghostwriter/send-email`, `morning-brief/track/*`, `webhooks/realvia`, `billing/credits/checkout`, `price-trail`, `leads/bri-recompute`
- SQL: `add_price_point`, `record_brief_*`, `compute_bri_score*` migrations + `secdef-callers-close/mapa-ciest.md`
