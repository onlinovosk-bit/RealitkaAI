# Report — GO IMPLEMENT Property Launch Pack V0

**Dátum:** 2026-09-03  
**Depends on:** `GO P0 HONEST UNKNOWN MAPPING` (#513)  
**Flag:** `PROPERTY_LAUNCH_PACK_V0=1` (default off)

## Čo je v kóde

| Časť | Cesta |
|---|---|
| Facts + export allowlist | `apps/crm/src/lib/capabilities/property-launch-pack/facts.ts` |
| Orchestrátor KF1 + Guardian | `apps/crm/src/lib/capabilities/property-launch-pack/build.ts` |
| API | `POST /api/ai/property-launch-pack` |
| Tests | `__tests__/build.test.ts` + verification |

## Správanie

1. Vstup: `sourceId` (Realvia `properties`) **alebo** manuálny `property`.
2. Ak `type`/`transaction_type` = `Neznáme` → treba `taxonomyConfirm` od makléra.
3. Generácia kanálov cez `generateListingContent`.
4. Guardian pass → `exportPayload` JSON (bez `payload_raw` / broker PII).
5. **Žiadny** write do `portal_listings`. Pack meta `publishBlocked: true`.

## Pilot

Fixture `13303557` + maklér confirm type/txn. Ďalšie 4 source_id z Prešov dodávky pri manuálnom smoke.
