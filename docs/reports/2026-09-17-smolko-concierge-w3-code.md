# Smolko Concierge W3 — code path (N08–N10 / M2)

**Dátum:** 2026-09-17  
**GOs:** GO-B07-DB · GO-B08-OAUTH (recorded; no prod write by worker)

## Delivered (CODE)

| Piece | Status |
|---|---|
| N08 preflight | GO stamped; apply = ops only |
| N09 freebusy | `fetchConciergeFreeBusy` + public route; `oauth_missing` without token |
| N10 booking | `conciergeBookingIdempotencyKey` → scheduled_events key |

## Not done by worker

- Prod migration apply (`GO-B07-DB` = authorize ops, not agent)
- OAuth token mint / store (`GO-B08-OAUTH` = authorize wiring)

## HANDOFF

```text
NODE: N09/N10
RESULT: DONE_CODE
M2_PROD: BLOCKED_ON_OPS (table + OAuth env)
```
