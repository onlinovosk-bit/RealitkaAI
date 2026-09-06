# Smolko CRM chatbot MVP — internal assistant slice

**Date:** 2026-09-06  
**Branch:** `cursor/smolko-chatbot-dabc`  
**User GO:** "Go Chatbot pre Smolka."

## Verdict

**BUILD completed for an internal CRM assistant MVP.**

This is **not** the public Website Concierge. The public Smolko website chatbot
remains blocked by the existing gates in
`docs/reports/2026-09-06-smolko-chatbot-status.md`:

- SMO-B04 — PROD cross-tenant negative test + active/freshness contract;
- SMO-B05 — AI disclosure, privacy/retention text, approved FAQ, human fallback;
- SMO-B06 — callback handoff routing;
- SMO-B07–SMO-B09 — booking storage, calendar, idempotency/notification gates.

## What changed

- Added deterministic assistant logic:
  - `apps/crm/src/lib/smolko-chatbot.ts`
- Added authenticated API endpoint:
  - `apps/crm/src/app/api/ai/smolko-chat/route.ts`
- Added dashboard chat panel:
  - `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx`
- Embedded the panel in:
  - `apps/crm/src/app/(dashboard)/revolis-ai/RevolisAIClient.tsx`
- Added tests:
  - `apps/crm/src/lib/__tests__/smolko-chatbot.test.ts`
  - `apps/crm/tests/verification/smolko-chatbot.verification.test.ts`

## Safety boundaries

- No OpenAI/Claude call for question answering.
- No embeddings.
- No public widget.
- No `scheduled_events` writes.
- No `portal_listings` writes.
- No booking or Google Calendar integration.
- Answers are generated from tenant-scoped `listLeads` and `listTasks` data.
- Unknown/out-of-scope questions return a bounded fallback instead of a guessed
  answer.

## Constitution / data-source gate

- **Customer value:** Helps the broker answer "komu volať a čo zachrániť dnes"
  from existing CRM data.
- **Data source:** Own CRM data (`leads`, `tasks`) — Master Data Sourcing Map
  Zhluk 1. No new external source.
- **GDPR posture:** No new external processor for chat content in this slice.
  Personal data stays inside the authenticated tenant session and Supabase RLS
  path. Public Concierge still needs SMO-B05 before launch.
- **Timing:** Correct only as internal MVP. Public chatbot timing remains gated.

## Verification

```text
npm run test -- src/lib/__tests__/smolko-chatbot.test.ts tests/verification/smolko-chatbot.verification.test.ts
→ 2 files / 6 tests passed

npm run lint
→ passed

npm run build
→ passed
```

## Remaining risk

This MVP depends on existing tenant scoping in `listLeads` / `listTasks` and does
not prove public Realvia inventory freshness or cross-tenant isolation for
Website Concierge. Do not present it as the public replacement for the broken
Realvia website chatbot.

## Next gate

**GO REQUIRED:** If the goal is the public Smolko website chatbot, run SMO-B04
first: PROD cross-tenant negative test + active/freshness contract for the
property lookup path. Do not add booking/OAuth until SMO-B07–SMO-B09 are closed.
