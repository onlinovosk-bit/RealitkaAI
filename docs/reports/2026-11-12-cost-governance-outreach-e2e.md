# 2026-11-12 — CRM AI email: cost governance + telemetry

## Commit

`6d90088a6586f0282afecd2b8e61465a763d0682` — `fix(crm): ai_email telemetry — model, EUR cost, latency`

## Outcome

- **Outreach paid path:** `generateOutreachEmail` → `completeOutreachLlm` (`@revolis/model-gateway` EUR preflight) → `logAiAction({ strict: true })` before Resend.
- **BLOCK:** `OutreachCostBlockedError`, no provider HTTP, no Resend.
- **Inbound draft path:** `generateAutoReply` exposes `audit` (model, `costEur`, `latencyMs`); `processInboundLead` writes full telemetry to `ai_action_audit`.

## Tests (local)

| Suite | Result |
|-------|--------|
| Vitest (outreach + inbound + audit, 5 files) | 20/20 PASS |
| `npm run model-gateway:test` (root) | 7/7 PASS |
| `apps/crm` lint | clean |

## Prod gap (founder SQL, 10d)

- 22× `ai_suggested` / `email` with `model` NULL, `cost_eur` NULL.
- **Code cause (pre-fix):** `process-lead.ts` logged `ai_email` after Claude without `model`/`cost_eur`/`latency_ms`; gateway BLOCK rows in outreach also logged `ai_suggested` without cost (removed).

## Deploy (needs founder GO)

Vercel Production: `MODEL_GATEWAY_PER_TASK_LIMIT_EUR`, `MODEL_GATEWAY_DAILY_LIMIT_EUR`, `MODEL_GATEWAY_MONTHLY_LIMIT_EUR`; confirm `MODEL_GATEWAY_LEDGER_PATH` / serverless ledger writability.
