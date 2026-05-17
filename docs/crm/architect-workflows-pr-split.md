# Rozdelenie na PR (L99 — 1 PR = 1 logická zmena)

## Odporúčané vetvy / poradie merge

| PR | Názov | Obsah |
|----|--------|--------|
| **PR-1** | DB — lead stĺpce pre W1/W2 | `supabase/migrations/*_architect_workflows_leads_columns.sql` |
| **PR-2** | W1 — AI triáž | `lead-ai-priority.ts`, `lead-triage-batch.ts`, `api/cron/lead-ai-triage`, `TodaysTenLeads.tsx`, zmeny v `dashboard/page.tsx`; časť zmien `leads-store`, `mock-data`, PATCH `api/leads/[id]` súvisiaca s `ai_*` poľami |
| **PR-3** | W2 — follow-up sweep | `open-followup-generator.ts`, `api/cron/follow-up-sweep`; env `FOLLOWUP_*`; `vercel.json` len riadok `follow-up-sweep` (po PR-4 treba konsolidovať `vercel` v jednom commite alebo zmazeť dvojchyby) |
| **PR-4** | W3 — call → CRM + Whisper | `call-analysis-persist.ts`, `api/ai/call/analyze`, `transcribe`, `call-analyzer-client.tsx`; `OPENAI_API_KEY` v `.env.local.example` |
| **PR-5** | W4 — deal health | `forecasting-store.ts`, `deal-health-panel.tsx`, `forecasting/page.tsx` |

**Realita jedného monolitu:** `leads-store.ts` a `vercel.json` sú zdieľané — buď **jeden integračný PR** po PR-1, alebo **cherry-pick** commitov a resolve konfliktov.

## Smoke po každom PR

- PR-1: `supabase migration` aplikovaná na staging.
- PR-2: `GET /api/cron/lead-ai-triage` + Bearer `CRON_SECRET`.
- PR-3: `GET /api/cron/follow-up-sweep` + `FOLLOWUP_MODE=draft`.
- PR-4: `POST /api/ai/call/analyze` s `persist_to_crm`; transkript s nahraným audio ak je `OPENAI_API_KEY`.
- PR-5: stránka Forecasting — sekcia Deal health.
