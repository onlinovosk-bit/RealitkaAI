## Session 2026-09-03
### Dokončené
- #513 GO P0 HONEST UNKNOWN MAPPING merged (`Neznáme`)
- #481 checkout agency_id merged
- Launch Pack V0 na #514 (flag off) + gap fix: payload remap, skip LLM, no Predaj fog
### Rozpracované / Pending
- Merge #514 po CI
- Oficiálny číselník od Realvie (`docs/reports/2026-09-03-realvia-ciselnik-request.md`)
- Backfill 132 riadkov — samostatné GO
### Kľúčové súbory zmenené
- `apps/crm/src/lib/capabilities/property-launch-pack/*`
- `apps/crm/src/app/api/ai/property-launch-pack/route.ts`
### Ďalší krok
Founder merge #514; flag `PROPERTY_LAUNCH_PACK_V0=1` len pre Smolko preview/pilot.

## Session 2026-09-04 (TASK-RLS-ONBOARDING-SESSION)
### Dokončené
- Path B PR #534: API /api/onboarding/session + client switch + migration prepared (NOT applied)
### Rozpracované / Pending
- Founder: Preview OK → merge GO → apply 20260904220000_drop_onboarding_sessions_anon_all.sql
### Kľúčové súbory zmenené
- pps/crm/src/app/api/onboarding/session/route.ts: service-role get/upsert
- pps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql: DROP anon ALL (prepared)
### Ďalší krok
Preview smoke onboarding Network (/api/onboarding/session); founder applies migration after merge GO.