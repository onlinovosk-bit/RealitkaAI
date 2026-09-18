# Critical bug: outreach reads leads through the browser singleton

**Date:** 2026-09-14
**Severity:** HIGH — scheduled AI outreach never runs (false-green cron); manual and approved sends fail for every real lead
**Branch:** `fix/outreach-scoped-lead-lookup`
**Source:** bug #2 in `docs/reports/2026-09-13-critical-bug-hunt.md`

## Trigger

1. Vercel cron `POST /api/scheduled-outreach` with a valid `Bearer $CRON_SECRET`.
2. Authenticated agent `POST /api/outreach/send` (or `/api/outreach/approve`) with a real `leadId`.

## Root cause

All three paths called `listLeads()` with no client argument.

`listLeads()` → `resolveTenantSupabase(undefined)` → `getSupabaseClient()` (browser
anon singleton, no request cookies) → `resolveSessionAgencyId()` finds no user →
`listLeads` logs `missing profile agency_id` and returns `[]`.

Consequences:

- **Cron:** iterates zero leads and returns `{ ok: true }`. The run looks healthy
  in every dashboard while nothing was sent — the worst failure shape, because
  nobody investigates a green cron.
- **Manual / approved send:** `leads.find(id)` misses, so `sendAiOutreachEmail`
  throws `"Lead nebol nájdený."` for leads that plainly exist in the tenant. The
  service-role message inserts further down were never reached.

`/api/outreach/approve` — the human-approval path that the house rule depends on —
had the same defect and was not listed in the hunt report.

## Fix

One logical change: outreach resolves a lead through an **explicit** client.

- `resolveOutreachLead(leadId, scopedSupabase?)` in `outreach-store.ts`:
  a scoped client uses `getLead(leadId, scoped)` (RLS applies); no scoped client
  means a background job, which requires `createServiceRoleClient()` and **throws**
  when `SUPABASE_SERVICE_ROLE_KEY` is missing instead of silently missing.
- `sendAiOutreachEmail(leadId, scopedSupabase?)` uses it in place of
  `listLeads()` + `find`.
- `/api/outreach/send` and `/api/outreach/approve` pass their request-scoped
  `createClient()`.
- `runOutreachSequence(leadId, client?)` threads the client into the initial send
  and every scheduled follow-up.
- `leads-store.ts` gains `getLeadAsService()` / `listLeadsAsService()` — trusted
  service-role readers for cron, documented as RLS-bypassing and server-only.
- `/api/scheduled-outreach` rewritten: fail-closed `isAuthorizedCronBearer`,
  explicit service-role client (500 when absent, no more silent no-op), and an
  honest response body `{ scanned, attempted, sent, failed, errors }` so a run
  that did nothing can never again look like a run that worked.

## Deliberate guard — automatic send stays OFF

Fixing the lookup means the cron would start really sending to real prospects the
moment it is merged. That collides with the permanent Revolis rule *drafts yes,
automatic send to prospects never without human approval*.

So the cron is **opt-in**: without `SCHEDULED_OUTREACH_ENABLED=true` it returns
`{ ok: true, enabled: false, scanned: 0, reason: ... }` and sends nothing. The
plumbing is correct and testable; turning it on is a separate, explicit founder
decision. `/api/outreach/approve` (human approval) is unaffected and now works.

## Validation

```bash
cd apps/crm
npx vitest run \
  src/lib/__tests__/outreach-scoped-lead-lookup.test.ts \
  tests/verification/outreach-scoped-lead-lookup.verification.test.ts
npx eslint --quiet src/lib/outreach-store.ts src/lib/leads-store.ts \
  src/app/api/scheduled-outreach/route.ts src/app/api/outreach/send/route.ts \
  src/app/api/outreach/approve/route.ts src/scripts/outreach-automation-2.0.ts
```

Unit tests cover the three resolution paths (scoped / service-role / fail-closed)
plus the "no mock fallback" case. The verification test pins the call sites so a
future refactor cannot quietly drop the client again.

## Not verified

- No production run. `scanned`/`sent` counters were not observed against the real
  database; the cron was not enabled anywhere.
- Whether `SUPABASE_SERVICE_ROLE_KEY` is present in the Vercel production
  environment was not checked — if it is missing, the cron now returns 500
  instead of a false green, which is the intended, visible failure.

## Rollback

Revert the branch. No migration, no schema change, no data touched.

Merge robí founder — agent nemerguje.
