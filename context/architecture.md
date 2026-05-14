# Architektúra (Revolis CRM)

Účel tohto dokumentu je udržiavať jednotný pohľad na vrstvy systému a na to, **ktorý orchestrátor** úlohu vlastní.

## Vrstvy (orientačne)

| Vrstva      | Čo sem patrí                                                | Primárny orchestrátor |
| ----------- | ----------------------------------------------------------- | --------------------- |
| Runtime API | Route handlery, business logika, integrácie                | Orchestrator 1        |
| Dáta        | Postgres / Supabase, migrácie, RPC, politiky               | Orchestrator 1        |
| Asynchróna  | Cron, queue, webhook ingest, retry                          | Orchestrator 1        |
| Prezentácia | Dashboard, formuláre, onboarding, UX prúdy                 | Orchestrator 2        |
| Observabilita CRM | Analytics eventy, notifikácie v produkte           | Orchestrator 2        |

Podrobnosti infra a tenancy: pozri [`infra.md`](infra.md), [`tenancy.md`](tenancy.md).
