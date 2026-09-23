# Critical bug: viewing confirmation sent to the demo contact

**Date:** 2026-09-14
**Severity:** HIGH — customer-visible; a real buyer's confirmation goes to a fixture email/phone
**Branch:** `fix/playbook-confirm-viewing-scoped-lead`
**Source:** bug #3 in `docs/reports/2026-09-13-critical-bug-hunt.md`

## Trigger

A logged-in broker confirms a viewing from the playbook UI:
`POST /api/playbook/confirm-viewing` with a real `leadId` and a
`playbookItemId` such as `viewing-today-1`.

## Root cause

Two defects compounding, which is why this one actually sends.

1. The route called `getLead(leadId)` with **no** scoped client. On the server
   `resolveTenantSupabase(undefined)` returns the cookie-less browser singleton,
   so the `leads` select fails.
2. `getLead` answered a failed read with `mockLeads.find((lead) => lead.id === id)`
   — a fixture lead — in **every** environment, production included.

The route then fell through to `demoContact(playbookItemId)`, which resolves to
`lucia.demo@revolis.ai` / `+421901112233`, and handed that to `sendMessage`,
which really sends through Resend / Twilio. There was also no `agency_id` gate on
the lead before sending.

Net effect: the confirmation leaves the system addressed to a demo contact, the
real buyer is never notified, and the CRM records a successful send.

## Fix

- The route creates `createClient()` and passes it: `getLead(leadId, supabase)`.
  That restores RLS **and** the tenant gate — `getLead` filters the row through
  `resolveSessionAgencyId` + `filterRowsByAgency`, so a lead from another agency
  now resolves to `undefined`.
- A lead that is not visible is a **404 with no send**, instead of a fallback.
- The playbook fixture contact is used only when demo mode is actually on
  (`readDemoModeFromCookie()`), never as a substitute for a real buyer's missing
  contact details. A real lead with no email and no phone returns 400 and asks
  the broker to complete the contact in the CRM.
- `getLead` no longer returns fixture leads in production — both fallbacks (no
  client, failed read) return `undefined` there, matching the guard `listLeads`
  already had. Local development and tests keep the fixtures.

The `getLead` hardening is the part that matters beyond this route: every other
caller that reads a lead on a failed production select was getting demo data too.

## Validation

```bash
cd apps/crm
npx vitest run \
  src/lib/__tests__/playbook-confirm-viewing-contact.test.ts \
  src/lib/__tests__/get-lead-no-fixture-in-production.test.ts \
  tests/verification/playbook-confirm-viewing-contact.verification.test.ts
```

The route tests assert positively (real contact is used, scoped client is passed)
and negatively (`lucia.demo@revolis.ai` and `+421901112233` appear in no response
on any failure path), plus that demo mode still works.

## Not verified

- No production request was made; this was not exercised against the live
  database or against Resend/Twilio.
- Whether any confirmation has already gone out to the fixture contact is not
  established here. `activities` / `messages` rows with
  `source: playbook_confirm_viewing` and a `lucia.demo@revolis.ai` recipient
  would show it — worth a read-only query before closing the incident.

## Rollback

Revert the branch. No migration, no schema change.

Merge robí founder — agent nemerguje.
