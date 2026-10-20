# Critical bug hunt — Realvia / permissions / auth (2026-10-20)

Scope: PRs **#816, #895, #866, #880, #892, #885**. Bar: CRITICAL only (data loss, crashes, security holes, significant user-facing breakage with concrete trigger). Evidence: current `origin/main` sources + PR diffs.

## Verdict

**1 CRITICAL** (#895 acquisition callers dead after fail-closed). Other five areas: **no CRITICAL**.

---

## 1. REALVIA-SEC-01 (#816) — credential redaction

**Files:** `apps/crm/src/lib/realvia/validate.ts`, `apps/crm/src/lib/infra/platform-heartbeat.ts`, webhook route.

| Claim | Evidence |
|---|---|
| Redaction breaks auth? | **No.** `collectRequestHeaders` (L75–80) only maps for logs/`headers_json`. `validateSecret` (L119–120) and agency resolve (route L94–99) read **raw** `request.headers.get(...)`. |
| Forged webhooks easier? | **No.** Validation path unchanged; redaction closes credential leak into logs/DB, does not weaken Mode 1/2 checks. |
| Heartbeat change | Observability only (`realviaQueueFailed` / worker stale). No queue mutation. |

**CRITICAL:** none.

---

## 2. demo/capture-lead fail-closed (#895)

**File:** `apps/crm/src/app/api/demo/capture-lead/route.ts`

### Auth bypass?

**No bypass found** in the route gate:

- L15–20: missing/empty `DEMO_CAPTURE_API_KEY` → **503**, no `createAdminClient`
- L23–25: `x-api-key` must match via equal-length `timingSafeEqual` → else **401**, no write
- Tests pin insert not called on unset/empty/wrong/missing key

### CRITICAL — acquisition forms permanently fail

| Location | Behavior |
|---|---|
| `HeroEmailCapture.tsx` L86–94 | `fetch("/api/demo/capture-lead")` with only `Content-Type` — **no `x-api-key`** |
| `AcquisitionHub.tsx` L146–149 | same |

**Concrete trigger:** visitor submits hero email or AI Odhadca capture on CRM landing.

| Prod env | Response | Effect |
|---|---|---|
| `DEMO_CAPTURE_API_KEY` unset/empty | 503 | lead not stored; UI error |
| key set | 401 | lead not stored; UI error |

Pre-#895 (`e89deed4^`): `if (apiKey && header !== apiKey)` — **fail-open when env unset**, so browser callers worked. After merge to `main` (`e89deed4`), every in-repo caller fails by construction. PR body documented this; no trusted-server caller or header injection was added. Putting the secret in client JS would leak it.

**Classification:** significant user-facing breakage (acquisition), not an auth bypass.

---

## 3. team_member_permissions (#866)

**Files:** migration `20261016170000_…team_permissions.sql`, `api/nav/permissions/route.ts`, `team-permissions-fail-closed.verification.test.ts`.

| Risk | Finding |
|---|---|
| Missing table fail-open? | **Already closed in route** (L51–57 → `UNKNOWN_TEAM_PERMISSIONS`, all `false`). Verification pins solo-only `DEFAULT`. |
| New empty table fail-closed lock-out? | Empty table → `.single()` no row → same UNKNOWN path as missing table. Solo (`!team_license_id`) still DEFAULT. **No new incorrect lock-out vs current code.** |
| Still fail-open? | Not for team members without a row. Solo export `true` is intentional (own contacts). |

Migration file comment: PROD apply is founder-gated; creating empty table does not seed grants (by design).

**CRITICAL:** none.

---

## 4. semantic search service_role (#880)

**File:** `apps/crm/src/app/api/search/semantic/route.ts`

| Step | Isolation |
|---|---|
| Auth | session required (L61–62) |
| RPC | `createAdminClient().rpc(match_*)` — SECURITY DEFINER, **no agency filter** (ids = candidates only) |
| Details | session client + `.eq("agency_id", callerAgencyId)` + `.in("id", ids)` (L199–203, L226–230) |
| No agency | throws → ILIKE fallback under session RLS (L136–138) |

Tests pin: foreign id dropped even at higher similarity; RPC not called without agency.

**Tenant isolation bypass in response?** Not found. (Residual: RPC still scans global embeddings for ranking — ids not returned to client after filter. `createAdminClient` can fall back to anon key if service role missing — pre-existing helper; still filtered by session+agency.)

**CRITICAL:** none.

---

## 5. listing-from-photos (#892) — flag OFF

**Files:** `listing-from-photos-flag.ts`, `api/ai/listing-from-photos/route.ts`

- Flag: `LISTING_FROM_PHOTOS_V0 === "1"` only (default OFF)
- Route L85–87: flag off → **404 before** auth, spend, vision, `saveGeneration`
- Test: `spendForAction` not called when flag off

No alternate route burns credits with flag off. Cred spend only after flag+session+agency when ON.

**CRITICAL:** none (flag OFF path).

---

## 6. Realvia processQueue failureKinds (#885)

**Files:** `failureKinds.ts`, `metrics.ts`, `processQueue.ts`

`tallyRealviaFailures` / `meta.failures` are **metrics only** after the batch (processQueue L168–177). Job status still goes through `updateQueueJobStatus` (retry → pending, terminal → failed). No path marks a failed advert as completed due to classification.

Probe payloads: intentional terminal fail after max_retries (`queueRetry.ts`); not silent discard of real adverts.

**CRITICAL:** none (no silent drop of jobs from #885).

---

## Cleared / out of scope

- Tracked open PRs from prior hunts (#843, #859, #877, #881, #883) — not re-audited here.
- Historical `identifikator` plaintext already in old `realvia_webhook_logs` rows — pre-#816 residue, not a new forge path from redaction.

## Next (GO)

`GO CAPTURE-LEAD-CALLER` — trusted-server proxy (or equivalent) so Hero/AcquisitionHub can submit without embedding `DEMO_CAPTURE_API_KEY` in the browser; until then acquisition capture on CRM landing stays dead after #895.
