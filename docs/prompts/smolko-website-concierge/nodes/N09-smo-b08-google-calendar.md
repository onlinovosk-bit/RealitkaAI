# N09 — SMO-B08 Google Calendar readiness

## S2 TASK

Priprav Calendar vrstvu **bez OAuth consent kliku**:

- najužšie scopes (freebusy + events insert podľa potreby)
- redirect URI / refresh flow dokumentácia
- Europe/Bratislava, duration, buffer, minimum lead time
- test kolízie (unit / verification s mock providerom)

Reálny consent = GO-B08-OAUTH (Google admin + Smolko).

Predpoklad: B07 tabuľka PROD_READY (inak BLOCKED).

## S3 TERRITORY

**Write:**

- `apps/crm/src/app/api/integrations/google/**` (iba ak treba kontrakt/scopes — minimálny diff)
- `apps/crm/src/lib/**` calendar helper **nový** len v dohodnutom path
- testy mock
- `docs/reports/YYYY-MM-DD-smo-b08-calendar-readiness.md`

**Forbidden:** uloženie client secret do repa, prod OAuth, send notifikácií

## S4 ACCEPTANCE

- Scopes listed + justification
- Mock free/busy conflict → reject
- Timezone Europe/Bratislava v teste
- GO-B08-OAUTH checklist pre admina

## S5 VALIDATION

```bash
rg -n "calendar|freebusy|googleapis" apps/crm/src/app/api/integrations/google apps/crm/src/lib --glob "*.ts" | head
npx vitest run <dotknuté-testy>
```

## S6 FAILURE

- B07 nie je PROD_READY → BLOCKED
- Secret by mal ísť do kódu → STOP

## S7 HANDOFF

```text
NODE: N09
RESULT: DONE|BLOCKED|HUMAN
GO_REQUIRED: GO-B08-OAUTH
SCOPES: ...
REPORT: ...
NEXT: N10
```
