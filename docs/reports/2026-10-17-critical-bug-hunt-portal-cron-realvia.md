# Critical bug hunt — portal import / cron / Realvia probe

**Date:** 2026-10-17  
**Branch:** `cursor/critical-bug-management-4032`  
**Head checked:** `626748f0` (main tip) + scoped commits below  
**Scope:** only CRITICAL classes — data loss, silent wrong writes, cron/webhook auth bypass, race that loses data, infinite retry loops, tenant isolation breaks.

## Already tracked (not re-reported)

| Issue | PR |
|-------|-----|
| matching-store recalculate wipe | #843 |
| pricing-v2 stale Stripe | #845 |
| grant-engine expire repair CAS | #859 |
| saas-ops past_due paysOutsideStripe | #877 |

## Commits reviewed

| SHA | Topic |
|-----|--------|
| `0c19fe9c` | Bod 5 portal import — `integrations-store.ts`, `portal/import/route.ts`, universal-import start |
| `2512578d` | follow-up-sweep `cron_runs` |
| `bb97240f` | realvia-process schedule + `cron_runs` |
| `4094e12e` | gmail-pull schedule + `recordSkippedCronRun` |
| `9a4c6d8d` | Realvia probe terminal after max_retries — `processQueue.ts`, `queueRetry.ts`, `webhookStore.ts` |

## Verdict

**No new CRITICAL bug** in the scoped commits.

## Checked areas (evidence)

### 1) Portal import (`0c19fe9c`)

| Risk | Result |
|------|--------|
| Auth / tenant | Session `getUser()` + `agency_id` from caller's `profiles` row; insert carries `agency_id` via `mappedContactToLeadInsert` (`integrations-store.ts` ~361, `map-contact.ts` ~81). No client-supplied agency. |
| Silent wrong writes | Location maps `location`/`lokalita` → `address` → DB `location`. Parser is Papaparse (quoted commas). Bulk insert is all-or-nothing; DB error returns `error.message` (no longer `{imported:0}` without reason). |
| Data loss | Pre-insert validation skips bad rows; good rows still go in one `insert(inserts)`. Claim “one bad row kills whole import” is only true for **validation** skips, not per-row DB insert (same as universal-import chunks). Not silent; not a new wipe path. |
| Dedup | Portal path still inserts without email dedup (universal-import has it). Duplicate leads possible — pollution, not CRITICAL wipe. |

### 2) Cron auth + observability (`2512578d`, `bb97240f`, `4094e12e`)

| Route | Auth | Result |
|-------|------|--------|
| `follow-up-sweep` | `!cronSecret \|\| Bearer !== secret` → 401 before work | Fail-closed; logging only after auth |
| `realvia-process` | same | Fail-closed; `recordUnauthorizedCronRun` only on 401 **with** valid schedule header — no work runs |
| `gmail-pull` | same | Fail-closed; skip log does not weaken auth |

`cronHttpStatus` returns 500 only when status is `failed` **and** `cron_runs` write failed — avoids Vercel retry storms on legitimate empty/partial runs. Tenant writes in follow-up use admin by lead id from the same query; gmail agency is env `GOOGLE_GMAIL_INBOUND_AGENCY_ID` (single-mailbox design).

### 3) Realvia probe retry (`9a4c6d8d`)

| Risk | Result |
|------|--------|
| Infinite retry via replay | **Fixed:** terminal probe error + `enqueueReplayFailedQueueJobs` skips `REALVIA_PROBE_TERMINAL_ERROR` (`webhookStore.ts` ~370). |
| False probe / data loss | `isOnboardingProbePayload` is top-level `test === true` only. Onboarding curl is `{"test":true,...}`; production advert shape is `advert`+`broker` without `test` (`docs/REALVIA_ONBOARDING.md`). |
| Tenant isolation | Probe branch does not call `processAdvertPayload` / `processDeletePayload`. Advert/delete paths still `.eq('agency_id', tenantAgencyId)`. |
| Claim race | `fetchPendingJobs` still lacks CAS/`FOR UPDATE` (pre-existing). Daily schedule does not add an infinite loop by itself. |

### Below CRITICAL (not filed)

- `updateQueueJobStatus` dropped the old `if (job)` guard (`webhookStore.ts` ~149–162). If `select retry_count` returned null while `update` still ran, `planQueueFailure` would restart from retry 0. With service role + PK lookup this path is not a concrete production trigger; left untracked.

## Artifacts

- Diffs: `git show` on the five SHAs above  
- Agency-scope tests already pin tenant filters on advert/delete
