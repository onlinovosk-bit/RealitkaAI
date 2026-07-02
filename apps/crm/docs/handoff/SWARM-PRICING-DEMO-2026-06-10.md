# Swarm orchestration — Pricing v1 + Demo v3 (2026-06-10)

## Agenti a vetvy (bez kryžovania)

| Agent / vetva | Branch | Súbory | Závislosť |
|---------------|--------|--------|-----------|
| **Billing PR-1** | `feat/pricing-v1-pr1-stack` | `program-tier-pricing.ts`, tests, `pricing-v1.md` | — |
| **Billing PR-2** | `feat/pricing-v1-pr2-grant-engine` | migration, `credits/grant-engine.ts`, crons | PR-1 merged |
| **Billing PR-3** | `feat/pricing-v1-pr3-token-audit` | migration, `ai-action-audit.ts`, view | PR-1 |
| **Billing PR-4** | `feat/pricing-v1-pr4-stripe-checkout` | `billing-store`, checkout routes, `.env.example` | PR-1 |
| **Demo CRO** | `feat/demo-page-v3` | `apps/marketing/public/revolis-demo-v3.html` | žiadna |
| **Obsidian vault** | externé | `C:\RealitkaAI-Memory\AGENTS-CONTEXT.md` | sync po merge |

## Poradie merge (L99)

1. `feat/pricing-v1-pr1-stack`
2. `feat/demo-page-v3` (paralelne, nezávislé)
3. `feat/pricing-v1-pr2-grant-engine`
4. `feat/pricing-v1-pr3-token-audit`
5. `feat/pricing-v1-pr4-stripe-checkout`

## Stash

Pred swarmom: `git stash` → `wip-pre-pricing-v1-swarm` (P0 billing z predchádzajúcej session).
