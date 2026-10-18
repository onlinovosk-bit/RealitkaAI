# Critical bug hunt — acquire / portal import / Realvia / minimize / follow-up (2026-10-18)

**Head:** `626748f0`  
**Branch:** `cursor/critical-bug-scan-f19c`  
**Bar:** CRITICAL only — data loss, auth bypass, silent wipe, wrong-tenant writes. Concrete trigger required.  
**Skipped (already tracked):** #843 matching-store wipe, #845 pricing-v2 stale webhook, #859 grant expire CAS, #877 past_due paysOutsideStripe, #881 acquire_dedup_keys global PK.

## Verdict

**NONE** — no new finding in the five focus areas meets the CRITICAL bar with a concrete, proven trigger.

## Scope (call chains walked)

| Area | Commits | Entry points |
|------|---------|--------------|
| Acquire email | `80eb86b1`, `92610ac2`, `ab9db2e1`, `30e888de` | `email-adapter.ts` → `api/acquire/email/route.ts` → triage / auto-response / dedup / `logEvent` |
| Portal CSV import | `0c19fe9c` | `importPortalLeadsFromCsv` → `api/integrations/portal/import` |
| Realvia queue | `9a4c6d8d` | `processQueue.ts` → `queueRetry.ts` → `webhookStore.updateQueueJobStatus` |
| Privacy minimize | `73ef8e68` | `minimize.ts` + 12 LLM call sites (restore / firstName / omit) |
| Follow-up sweep | `2512578d` | `api/cron/follow-up-sweep/route.ts` (observe-only layer) |

## Cleared (why not CRITICAL)

### 1. Acquire email (`80eb86b1` … `30e888de`)

- Shared-secret auth fail-closed; mailbox owner resolved under `agency_id`; lead insert and owner backfill are agency-scoped.
- HTML unwrap / `mailto:`/`tel:` salvage / phone separator fixes are **keep-lead** changes; they reduce false `not_a_lead`, they do not wipe rows.
- `lead_created` via `logEvent` is fail-soft; missing profile skips the event, lead stays.
- Cross-tenant suppression via global dedup key / deterministic lead id → **#881** (skipped).

### 2. Portal CSV import (`0c19fe9c`)

- Route passes `profile.agency_id`; every insert row carries `agency_id`; empty agency returns an error row (no silent write).
- PapaParse renames duplicate headers (`name` → `name_1`); second column is ignored, not a silent overwrite of the first (unlike XLSX hunt).
- RLS / parser / Slovak headers behave as tests claim for validation-time bad rows.

### 3. Realvia probe terminal (`9a4c6d8d`)

- `{test:true}` short-circuits before advert/delete; agency-scoped upsert/delete unchanged.
- Replay excludes the stable terminal error string; no evidence of silent property wipe.
- Speculative risk that a full advert payload *also* carrying `test:true` would be skipped is **unproven** against Realvia’s live shape (no sample in repo).

### 4. Minimize (`73ef8e68`)

- Prompt-only / outbound-restore pattern: `restoreName` runs **before** ghostwriter save and auto-reply return; `leads.name` is never written from `firstNameOnly`.
- Embeddings omit name on next build — matching quality change, not stored PII corruption or tenant cross-write.
- Follow-up drafts use first name inside the model text (no placeholder path); outbound approve still uses full lead email/phone from DB.

### 5. Follow-up sweep observe (`2512578d`)

- Adds `cron_runs` only; HTTP success contract unchanged; no send path; drafts still require human approve.
- Pre-existing `ai_reason` overwrite / unscoped admin updates by lead id are UUID-safe, not wrong-tenant.

## Near-misses (below bar — do not open as CRITICAL)

1. **Phone `PHONE_RE` after `80eb86b1`:** character class became `[ \t/().-]*` (zero-or-more). Newly matches URL-like `0/123/456/789` and `0-123-456-789` that the prior `[\s/-]?` single-separator pattern rejected. Trigger: portal HTML with numeric path before a real number → wrong `contactPhone` stored (email path usually still OK). Severity: contact corruption, not wipe/tenant/auth.
2. **Labelled phone greedy `[\d\s/().-]{7,}`:** `Telefón: 0905.123.456 / 0911.222.333` concatenates to one digit string (slash was already in the class since `92610ac2`). Same class of bug.
3. **`importPortalLeadsFromCsv` still one bulk `insert(inserts)`:** commit text claimed “one bad DB row no longer kills the import”; only **validation** skips are per-row. One Postgres constraint failure still returns `imported: 0` for the whole batch (error surfaced — not silent wipe of existing leads).
4. **`isOnboardingProbePayload`:** any root `test === true` wins over `isAdvertPayload`. Harmless for the documented curl body; dangerous only if Realvia ever ships real adverts with that flag (no PROD sample).
5. **Follow-up sweep** nightly overwrites `ai_reason` for eligible leads before drafting — soft loss of triage text, not lead rows.
6. **Acquire trusts `payload.mailbox.agencyId`** under shared secret (Worker contract). Mis-routed Worker agency id would write leads to the wrong tenant; CRM does not re-derive agency from mailbox alone. Design trust boundary, not a new bypass in these commits.

## Method

- Read full files + `git show` for listed SHAs on `626748f0`.
- Regex probe (node) for OLD vs NEW `PHONE_RE`.
- PapaParse duplicate-header check.
- Cross-check automation memory / prior hunts so #843/#845/#859/#877/#881 are not re-filed.
