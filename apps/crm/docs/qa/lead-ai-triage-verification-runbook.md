# Lead AI Triage Verification Runbook

## Goal

Provide a reproducible, low-risk verification path for `GET /api/cron/lead-ai-triage` that covers both:

- cron route execution,
- persisted DB side effects (`ai_priority`, `ai_reason`, `ai_triage_at`).

## Preconditions

- Deployed CRM environment with reachable `APP_URL`.
- `CRON_SECRET` matches the target environment.
- Migration `20260604120000_leads_imported_to_novy.sql` applied (status `imported` → `Nový`).
- For DB assertions: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and one open lead id in `TRIAGE_TEST_LEAD_ID`.
- The target lead should have `ai_priority_manual_at IS NULL` and `ai_triage_at IS NULL` so the cron can update it.

## Backfill 439 importovaných leadov (Smolko)

1. Aplikuj migráciu (status `Nový`).
2. Nastav `TRIAGE_AGENCY_ID=<smolko agency uuid>` a `TRIAGE_LEAD_LIMIT=500` na Vercel.
3. Spusti cron 1–3× (`GET /api/cron/lead-ai-triage` + Bearer), kým `processed` klesne na 0.
4. Import bez kontextu dostane `ai_priority=Nízka` (heuristika), nie fiktívnu „Stredná“.

## Commands

Dry-run config check:

```bash
npm run smoke:lead-ai-triage -- --dry-run
```

Route smoke only:

```bash
npm run smoke:lead-ai-triage
```

Route + DB assertions:

```bash
TRIAGE_TEST_LEAD_ID=<uuid> npm run smoke:lead-ai-triage
```

## Expected Assertions

- HTTP response is 2xx with `ok: true`.
- `processed` and `updated` are non-negative integers.
- When `TRIAGE_TEST_LEAD_ID` is set:
  - `ai_triage_at` is non-null,
  - `ai_priority` is one of `Vysoká | Stredná | Nízka`,
  - `ai_reason` is non-empty.

## Failure Triage

- `401 Unauthorized`: invalid or missing `CRON_SECRET`.
- `500` from route: inspect app logs for `lead-ai-triage` and model/supabase error detail.
- DB assertion failure: confirm lead status is in open statuses (`Nový`, `Teplý`, `Horúci`, `Obhliadka`, `Ponuka`) and `ai_priority_manual_at` is null.
