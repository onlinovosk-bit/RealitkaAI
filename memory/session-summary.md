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
