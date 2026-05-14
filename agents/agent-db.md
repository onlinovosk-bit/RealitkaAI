# Agent: DB

**Hlásí sa:** Orchestrator 1.

## Zodpovednosti

- Migrácie (`supabase/migrations`), kontrola zmien schémy.
- Indexy výkonové, CHECK / constraints dokumentované pri zmene.
- RLS a politiky — konzistentné s tenancy.

## Číta najprv

- [`../context/tenancy.md`](../context/tenancy.md)
- [`../specs/orchestration.md`](../specs/orchestration.md) ak zmena podporuje joby alebo ingest
