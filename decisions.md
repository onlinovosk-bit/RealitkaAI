# Decisions

## 2026-06-27 — Smolko leads: verify, clean, capture

- Context: Hotfix ensured lead write path now uses scoped Supabase client and server-derived `agency_id`.
- Action taken: removed temporary diagnostic log from `apps/crm/src/app/api/leads/route.ts`, added SQL script `infra/sql/cleanup-test-leads.sql` to inspect/delete test leads, and recorded this decision.
- Lesson / Scar: Always remove debug logging from hot-path before merge; prefer manual compile verification after merges and avoid automated merge tools without review.
