-- Legalizácia NOT NULL na leads.agency_id do active migration setu.
--
-- DÔVOD:
--   leads.agency_id je v PROD NOT NULL, ale po `supabase db reset` je
--   NULLABLE. Baseline 20260310_baseline_core_schema.sql ho zakladá ako
--     add column if not exists agency_id uuid
--       references public.agencies(id) on delete set null
--   a žiadna z ďalších migrácií NOT NULL nedoťahuje — v PROD teda vzniklo
--   mimo migrácií.
--
--   Dôsledok drift-u: trg_leads_platform_events emituje lead.created
--   s new.agency_id. V PROD nemôže byť NULL, v CI môže. Test event spine
--   by sa teda v CI správal inak než PROD, čo je presne ten druh falošného
--   dôkazu, kvôli ktorému sa substrát legalizuje.
--
-- ROZSAH:
--   Nemení kontrakt, dorovnáva CI na PROD. Guardované: v PROD je stĺpec
--   už NOT NULL, takže sa ALTER nevykoná — žiadny zámok na leads.
--   Žiadny backfill: ak by niekde NULL riadky existovali, migrácia má
--   spadnúť nahlas, nie ticho prepisovať dáta.
--
-- ZNÁMY ROZPOR V PROD, NEOPRAVENÝ TU:
--   leads_agency_id_fkey je FOREIGN KEY (agency_id) REFERENCES agencies(id)
--   ON DELETE SET NULL, pričom stĺpec je NOT NULL. Tieto dve veci si
--   protirečia: zmazanie agentúry, ktorá má leady, sa pokúsi nastaviť
--   agency_id na NULL a zlyhá na NOT NULL. Zmazanie agentúry s leadmi je
--   teda dnes nemožné. Táto migrácia rozpor NEVYTVÁRA — verne reprodukuje
--   stav PROD. Jeho vyriešenie (CASCADE, RESTRICT, alebo zrušenie NOT NULL)
--   je zmena kontraktu a patrí do samostatnej brány.

do $$ begin
  if exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'leads'
      and a.attname = 'agency_id'
      and a.attnum > 0
      and not a.attisdropped
      and not a.attnotnull
  ) then
    alter table public.leads alter column agency_id set not null;
  end if;
end $$;
