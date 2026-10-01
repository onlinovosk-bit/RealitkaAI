# Critical bug: buyer-onboarding CRM task silently dropped (RLS)

**Date:** 2026-09-12  
**Severity:** HIGH — every public Sprievodca / buyer-onboarding submit loses the agent follow-up task  
**Status:** fixed on branch `fix/buyer-onboarding-create-task-scoped-admin`

## Trigger

1. Anonymous visitor submits `/buyer-onboarding` (server action `submitBuyerOnboarding`).
2. Lead insert succeeds via `createAdminClient()` (service role).
3. `createTask(...)` is called **without** a scoped client.

## Root cause

`createTask` → `resolveTenantSupabase(undefined)` → browser anon singleton (`getSupabaseClient()`).

`tasks` RLS policy `tasks_agency` requires `lead_id` in the caller's `profile_agencies_for_auth()` set. Public form has no auth session → `auth.uid()` is null → WITH CHECK fails → `createTask` throws → catch logs via `autoErrorCapture` and continues.

Contrast: `POST /api/tasks` correctly passes `createClient()` as the second argument.

## Impact

- Lead + buyer_intent + email notify + auto-response still run.
- CRM task board never gets `Nový buyer lead: …` — agents miss the operational handoff unless they notice the email.

## Fix

Pass the existing `admin` service-role client as `createTask(input, admin)`.

## Validation

```bash
cd apps/crm && npx vitest run \
  'src/app/(public)/buyer-onboarding/__tests__/actions.test.ts'
```

## Kontrolór

- FAKT: missing scoped client — source read.
- FAKT: `tasks_agency` + `profile_agencies_for_auth` — migration `20260508210000` / `20260419`.
- FAKT: `/api/tasks` already threads scoped client.
- PASS for minimal 1-PR fix; no schema change.
