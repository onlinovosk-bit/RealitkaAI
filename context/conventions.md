# Konvencie

## Repozitár a rozdelenie práce

- **1 PR = 1 logická zmena**; merge po zelenom CI a smoke kontrole (`tests/smoke.spec.ts` alebo ekvivalent).
- Produkčné zmeny dokumentujeme v špecifikáciách v [`/specs`](../specs/) keď ovplyvňujú kontrakt (API, cron, billing, AI správanie).

## Naming a kód

- TypeScript / Next.js v `apps/crm` — štýl zhodný s okolitými súbormi v danom adresári.
- DB: migrácie v `apps/crm/supabase/migrations/` s časovou značkou a zrozumiteľným názvom.

## Agents / orchestrácia (meta)

Pri práci s Cursor agentmi:

- Široké infra/backend úlohy smeruj **Orchestratorovi 1** (pozri [`../agents/orchestrator-1.md`](../agents/orchestrator-1.md)).
- UI/UX, onboarding, notifikácie v produkte smeruj **Orchestratorovi 2** (pozri [`../agents/orchestrator-2.md`](../agents/orchestrator-2.md)).
