# Infraštruktúra

**Owner v rámci agent setupu:** Orchestrator 1 (`queues`, nasadenie API, závislosti medzi službami).

## Produkcia (orientácia)

- **Hosting:** napr. Vercel pre `apps/crm` (build, env, cron).
- **Dáta:** Supabase (URL, service role len server-side).

## Cron a tajné kľúče

- Cron endpointy chráňte zdieľaným tajomstvom (`CRON_SECRET` / Authorization bearer), ak je to tak v projekte nastavené.
- Env premenné držte v dokumentácii aplikácie (`.env.local.example`) a v špecifikácii v [`specs/`](../specs/), nie v tomto súbore s reálnymi hodnotami.

## Queues / background

Worker/cron vzory a poradie spracovania patria do [`specs/orchestration.md`](../specs/orchestration.md).
