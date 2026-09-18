# N07 — Public Concierge read-only MVP (M1)

## S2 TASK

Po **N04 PROD PASS + GO-B05-COPY + GO-B06-ROUTING** postav **read-only** Concierge:

- filter ponúk (typ / predaj|prenájom / lokalita) nad tenant-scoped aktívnymi/fresh dátami
- zachytenie callback request podľa N06 (minimum PII)
- AI disclosure z N05 viditeľné
- **žiadny** booking, calendar, potvrdený termín

Ak N00 odporučil Voiceflow ako UI: Revolis dodá len **callback API + kontrakt**,
nie druhý widget. Ak Revolis-hosted UI: public route v dohodnutom write-sete.

Pred štartom over GO písomne v HANDOFF predchádzajúcich uzlov. Chýba-li → BLOCKED.

## S3 TERRITORY

**Write (upresní orchestrátor podľa N00; príklad):**

- `apps/crm/src/app/(public)/concierge/**` **alebo** dokumentovaný Voiceflow handoff +
  `apps/crm/src/app/api/concierge/**` (NOVÉ)
- `apps/crm/tests/verification/smolko-concierge-*.verification.test.ts`
- `docs/reports/YYYY-MM-DD-smolko-concierge-read-mvp.md`

**Forbidden:** `scheduled_events` writes, Google Calendar, migrácie, `PUBLIC_PATHS` bez GO-W3,
dashboard `/revolis-ai` chatbot (ten rieši N01)

## S4 ACCEPTANCE

- Cross-tenant: cudzí `agency_id` nevráti Smolko ponuky (test)
- Stale/inactive skryté podľa `public-visibility` kontraktu
- Callback idempotentný / bez duplicitného leadu v happy-path teste
- Disclosure renderované
- Flag alebo GO-W3 pred produkčným webom

## S5 VALIDATION

```bash
# predpríprava — musia byť true / doložené
rg -n "B04_PROD: PASS|GO-B05-COPY|GO-B06-ROUTING" docs/reports docs/briefs || true

npx vitest run tests/verification/smolko-concierge --reporter=verbose
npm --prefix apps/crm run lint
npx tsc --noEmit -p apps/crm/tsconfig.json 2>&1 | findstr /C:"error TS" | find /C "error TS"
# typecheck count MUST NOT exceed main budget (aktuálne 48)
```

Mutácia (povinná pre matcher): dočasne vypni agency filter → test musí padnúť → restore → `git diff` prázdny na tom súbore voči pred-mutácii.

## S6 FAILURE

- Chýba GO → BLOCKED (neimplementuj „na draft“)
- Voiceflow vs Revolis konflikt → HUMAN
- Typecheck > budget main → REJECT vlastnej práce

## S7 HANDOFF

```text
NODE: N07
RESULT: DONE|BLOCKED|HUMAN
M1: yes|no
UI: voiceflow|revolis_public
API: paths...
GO_W3_SHIP: pending|granted
REPORT: ...
NEXT: N08 only if M1=yes
```
