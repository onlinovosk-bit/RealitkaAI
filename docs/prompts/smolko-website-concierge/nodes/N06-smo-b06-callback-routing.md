# N06 — SMO-B06 callback routing matrix

## S2 TASK

Priprav routing matrix pre handoff záujemcu z Concierge:

- listing broker vs zákazníkom zvolený broker vs fallback
- neprítomnosť / pracovné hodiny / SLA (bez falošného sľubu)
- minimálny PII kontrakt pre callback (čo sa ukladá, kam, ako dlho)
- 10 E2E scenárov (aspoň ako checklist; implementácia testov len vo write-sete)

Bez podpisu p. Smolka → výsledok HUMAN, nie DONE.

## S3 TERRITORY

**Write:** `docs/briefs/smolko-concierge-routing-matrix.md` (NOVÝ)  
Voliteľne: `apps/crm/tests/verification/smolko-concierge-callback.verification.test.ts` (NOVÝ skeleton)  
**Forbidden:** booking/calendar, prod zápisy, odosielanie správ

## S4 ACCEPTANCE

- Matrix tabuľka s rozhodovacími pravidlami
- PII minimálny zoznam polí
- 10 E2E scenárov s expected outcome
- Sekcia `OPEN QUESTIONS FOR SMOLKO` (ak niečo chýba)
- `APPROVED_BY: _pending_` + `GO-B06-ROUTING`

## S5 VALIDATION

```bash
test -f docs/briefs/smolko-concierge-routing-matrix.md
rg -n "fallback|SLA|PII|E2E|GO-B06" docs/briefs/smolko-concierge-routing-matrix.md
```

## S6 FAILURE

- Smolko neodpovedal → HUMAN, matrix ostáva DRAFT
- Tlak stavať N07 bez matrix → odmietni (S0)

## S7 HANDOFF

```text
NODE: N06
RESULT: HUMAN|DONE
MATRIX: docs/briefs/smolko-concierge-routing-matrix.md
GO_REQUIRED: GO-B06-ROUTING
BLOCKS: N07 (until GO)
```
