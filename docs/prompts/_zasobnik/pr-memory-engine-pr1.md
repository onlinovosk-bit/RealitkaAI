# CURSOR ZADANIE — PR-1 Memory Engine: základná migrácia

**Cieľová cesta:** `docs/prompts/pr-memory-engine-pr1.md`
**Zdroj:** `docs/architecture/adr-2026-07-28-memory-engine.md` §4.1–4.2
**Riziko:** LOW — čisto aditívne, nedotýka sa existujúceho kódu ani dát
**Termín:** merge do 8.8.2026 *(kill kritérium D-2026-08-06-02)*
**Poradie:** až PO valuačných PR — kalibrácia má prednosť

---

## Dôležité rozlíšenie

**Merge ≠ nasadenie migrácie na PROD.** Toto PR sa dá zmergovať dnes lacno;
aplikáciu migrácie na produkciu urob v pokoji, nie medzi telefonátmi.
Migrácia je aditívna, takže odklad aplikácie nič nerozbíja.

---

```
KONTEXT
Repo RealitkaAI, monorepo. Prečítaj brain/identity/FOUNDER.md, COMPANY.md,
CONSTITUTION.md a docs/architecture/adr-2026-07-28-memory-engine.md.
Overené cesty: docs/architecture/repo-inventory-2026-08-05.md
Migrácie sú v apps/crm/supabase/migrations/ (92 súborov),
konvencia YYYYMMDDHHMMSS_snake_case.sql, posledná 20260731220000_system_usage_agency.sql.

CIEĽ
Vytvoriť základnú schému Memory Engine podľa ADR §4.1-4.2. Čisto aditívne:
nové tabuľky, RLS, indexy. Žiadna zmena existujúcich tabuliek, žiadna zmena
aplikačného kódu okrem typov.

NAJPRV ZISTI (napíš mi, kým začneš písať SQL)
1. Presný tvar vzorovej RLS politiky na leads
   (20260507160000_rls_leads_activities.sql:5-19) — funkcia
   public.profile_agencies_for_auth() a jej signatúra.
2. Je v projekte zapnuté rozšírenie vector (pgvector)? Ak nie, NEZAPÍNAJ ho
   v tomto PR — embedding stĺpec vynechaj a napíš mi to.
3. Ako sa generujú DB typy (apps/crm/src/types/database.ts?) a robí to CI?
4. Existuje už tabuľka s podobným účelom (event log, audit log)? Ak áno, napíš mi to
   PRED písaním — nechceme druhý event store.

ÚLOHA — jedna migrácia, tri tabuľky

Súbor: apps/crm/supabase/migrations/<timestamp>_memory_engine_core.sql

1) memory_events — append-only event log
   Stĺpce podľa ADR §4.1: id bigserial PK, event_uuid uuid unique default gen_random_uuid(),
   agency_id uuid not null references agencies(id) on delete cascade,
   occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
   actor_type text not null check (actor_type in ('human','system','ai')),
   actor_id text, agent_id text,
   event_type text not null, subject_type text not null, subject_id text not null,
   payload jsonb not null, schema_version int not null default 1,
   dedupe_key text, consent_basis text,
   retention_class text not null default 'standard'
     check (retention_class in ('raw_ttl','standard','permanent')),
   processed_at timestamptz, process_error text

   Invarianty priamo v DB:
   - K3: constraint occurred_at <= recorded_at + interval '5 minutes'
   - K7: unique index (agency_id, event_type, subject_id, dedupe_key)
         where dedupe_key is not null
   - APPEND-ONLY: REVOKE UPDATE, DELETE on memory_events FROM authenticated;
     (zápis aj tak pôjde len cez service role)

   Indexy: (agency_id, occurred_at desc) · (id) where processed_at is null ·
           (agency_id, subject_type, subject_id)

2) memory_facts — bi-temporálne fakty
   Podľa ADR §4.2 vrátane valid_from / valid_to (fakt sa NEMAŽE, invaliduje sa),
   confidence numeric(3,2), origin check ('human','system','ai'),
   canonical boolean default false, layer check
   ('raw','summary','concept','knowledge','playbook'),
   source_event bigint not null references memory_events(id) on delete cascade.

   K6 ako DB constraint:
   check (not (origin = 'ai' and canonical = true and confidence >= 1.00))

   Indexy: (agency_id, subject_type, subject_id) where valid_to is null ·
           (agency_id, predicate) where valid_to is null
   Embedding stĺpec IBA ak je pgvector zapnutý (viď zisti #2).

3) entity_edges — hrany, bi-temporálne
   Podľa ADR §4.2. Indexy na src aj dst, obe where valid_to is null.

RLS — pre všetky tri tabuľky
- ENABLE ROW LEVEL SECURITY
- Politika kopíruje VZOR z leads_tenant, nevymýšľaj druhý:
  agency_id IN (SELECT public.profile_agencies_for_auth())
- Zápis do memory_facts a entity_edges výhradne service role.

ČO NEROBIŤ V TOMTO PR
- Žiadny aplikačný kód (memory.ingest() je PR-2).
- Žiadny zápis do nových tabuliek odnikiaľ.
- Žiadna zmena existujúcich tabuliek ani ich RLS.
- Žiadna nová npm závislosť.
- Nezapínaj pgvector, ak nie je zapnutý.

TESTY (Ústava Čl. 7)
1. Migrácia prejde na čistej lokálnej Supabase (CI to už robí
   v saas-grade-pipeline.yml).
2. CROSS-TENANT RLS TEST pre všetky tri tabuľky: používateľ agentúry A
   nevidí ani jeden riadok agentúry B. Toto je existenčný test multi-tenant
   produktu — bez neho sa PR nemerguje.
3. Test append-only: pokus o UPDATE alebo DELETE na memory_events
   pod rolou authenticated zlyhá.
4. Test K3: insert s occurred_at o hodinu v budúcnosti zlyhá.
5. Test K7: dva inserty s rovnakým (agency_id, event_type, subject_id, dedupe_key)
   → druhý zlyhá.
6. Test K6: insert AI faktu s canonical=true a confidence=1.0 zlyhá.

PR DESCRIPTION
- "Nové závislosti: žiadne"
- "Rollback: drop tabuliek, žiadne existujúce dáta sa nemenia"
- Odkaz na ADR: adr-2026-07-28-memory-engine
- Riziko: LOW, aditívna migrácia
```

---

## Po merge — nezabudni

Aplikáciu migrácie na PROD urob **vedome a v pokoji**, nie automaticky pri deploye.
Pravidlo atomicity z `.cursor/rules/architecture.mdc`: migrácia sa nasadzuje
**pred** kódom, ktorý ju používa — a keďže žiadny kód ju zatiaľ nepoužíva,
môže ležať nasadená bez efektu, kým nepríde PR-2.
