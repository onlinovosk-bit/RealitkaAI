# Smolko Concierge W2 — unblocked (N07 / M1)

**Dátum:** 2026-09-17  
**GOs:** GO-B04-PROD · GO-B05-COPY · GO-B06-ROUTING · GO-W3-SHIP

## Delivered

| Path | Role |
|---|---|
| `apps/crm/src/lib/concierge/*` | agency, search (fail-closed visibility), callback validation |
| `apps/crm/src/app/api/concierge/properties/route.ts` | read-only search |
| `apps/crm/src/app/api/concierge/callback/route.ts` | consent + soft lead |
| `apps/crm/src/proxy.ts` | PUBLIC_PATHS (GO-W3-SHIP) |
| `apps/crm/src/lib/concierge/__tests__/concierge.test.ts` | unit coverage |

## HANDOFF

```text
NODE: N07
RESULT: DONE
MILESTONE: M1 (API-only; Voiceflow UI external)
PUBLIC_PATHS: /api/concierge/properties, /api/concierge/callback (+ freebusy for M2)
```
