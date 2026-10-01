# N10 — SMO-B09 idempotency + notifications (M2)

## S2 TASK

Uzavri tvrdenie „termín je potvrdený“:

- opakovaný request nevytvorí druhý event
- free/busy konflikt → reject
- Google/provider failure → **žiadne** falošné potvrdenie
- notifikácia broker/customer má retry + viditeľný failure (bez reálneho send v CI)

Predpoklad: N08 apply hotový (PROD) + N09 mock/contract PASS.

## S3 TERRITORY

**Write:**

- `apps/crm/src/lib/scheduled-events/**`
- `apps/crm/src/app/api/scheduled-events/**`
- `apps/crm/src/lib/scheduled-events/__tests__/**`
- `apps/crm/tests/verification/*scheduled*idempot*`
- `docs/reports/YYYY-MM-DD-smo-b09-idempotency.md`

**Forbidden:** prod mutácie, reálny e-mail send v testoch

## S4 ACCEPTANCE

- Idempotency key / dedup dôkaz v teste
- Conflict path pokrytý
- Provider failure path pokrytý
- Register B09 môže ísť na PASS **až po** staging/prod smoke (inak CODE_PRESENT)

## S5 VALIDATION

```bash
npx vitest run src/lib/scheduled-events apps/crm/tests/verification --reporter=verbose
# mutácia: vypni idempotency check → test musí padnúť → restore → hash match
```

## S6 FAILURE

- Calendar provider nedostupný v teste → použi mock; neoznač PROD PASS
- Notifikácie vyžadujú secrets → dokumentuj, netvrď PASS

## S7 HANDOFF

```text
NODE: N10
RESULT: DONE|BLOCKED|HUMAN
M2_CODE: yes|no
M2_PROD: unknown|PASS|FAIL
REPORT: ...
MILESTONE: M2 only if M2_PROD=PASS
```
