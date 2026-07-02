# OVERNIGHT MASTER BRIEF 13 — Routine Engine
**Dátum:** 2026-06-16 · **Status:** in-progress (Wave A delivered)

## Wave A — Seller Rescue (delivered)
- Routine logic now uses only available signals:
  - days without contact (`last_contact`, fallback `created_at`)
  - lead status
  - activity count per lead
- Added on-demand endpoint mode for owner role via `POST /api/cron/seller-rescue`.
- Daily cron path (`GET`) remains available behind cron secret and processes all agencies.
- Creates real task records for each selected lead (`lead_id` required).
- Generates follow-up draft from existing rescue message generator.
- Sends routine notification with honest v1 scope note:
  - seller-only filtering is pending until explicit intent field exists.
- Honest empty state response:
  - `Žiadne leady bez kontaktu nad N dní — dobrá práca.`

## Guardrails kept
- No fake probability metrics in Seller Rescue output.
- No hardcoded fake lead names/percentages.
- Empty-state behavior tested explicitly.

## Verification
- `src/lib/routines/__tests__/seller-rescue.test.ts`
- `tests/verification/seller-rescue-guard.verification.test.ts`

## Next wave
- Wave B: CEO Command aggregate sections (live vs pending labeling by data reality).

