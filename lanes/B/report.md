# Lane B — report (TASK-0101)

## Najprv som hľadal

- `apps/crm/scripts/check-api-contract.mjs` — ratchet vzor (`--ci` / `--write-baseline` / baseline JSON); skopírovaný model pre `bus-validate.mjs`.
- `.ai/bus/message.schema.md` + `AGENT_PROTOCOL.md` — pred zmenou chýbala väčšina envelope polí; lifecycle bol chudobný.
- `.ai/bus/tasks/*.md` — legacy `status: done|blocked`; **neprepisované**, idú do baseline.
- `apps/crm/src/lib/ai/rescue-message.ts` ~L57 — `leadName` / `lastNote` interpolované raw do `userPrompt`.
- `apps/crm/src/lib/ai/sanitize.ts` — PII only; **nezmenené**.
- `.ai/bus/ledger/2026-09.jsonl` — append-only JSONL (Lane A runy).

## Čo som zmenil

1. **B-1** Envelope v1 + 9-stavový lifecycle v `message.schema.md` a `AGENT_PROTOCOL.md`.
2. **B-2** `bus-validate.mjs` + `bus-validate-baseline.json` (275 legacy findings).
3. **B-3** `ledger-report.mjs` nad `ledger/*.jsonl` (tabuľka + súhrn + nečitateľné).
4. **B-4** `prompt-guard.ts` → zapojené len v `rescue-message.ts` (`leadName`, `lastNote`) + vitest.

## Amendment write-setu

Jeden povolený amendment: `prompt-guard.ts` + `rescue-message.ts` (+ test). Disjoint s lane A/C.

## Dôkaz

- `node apps/crm/scripts/bus-validate.mjs --ci` → exit 0
- `npm --prefix apps/crm test -- prompt-guard` → 6/6 PASS
- Judge (`--base origin/chore/w0-engineering-gate`): **ACCEPT** — 5 kontrol PASS, risk=medium
- run_id: `RUN-20260915125804-TASK-0101`
- surový výstup: `lanes/B/judge-output.txt`

## Zostávajúce riziká

- Prompt-guard je heuristika (regex), nie modelový classifier — obídenie novými frázami možné.
- Zapojený len na rescue-message; ostatné AI call sites stále raw.
- Legacy bus tasky ostávajú v baseline (8 starých bez envelope).
- PR base musí byť `chore/w0-engineering-gate`, nie `main`.
