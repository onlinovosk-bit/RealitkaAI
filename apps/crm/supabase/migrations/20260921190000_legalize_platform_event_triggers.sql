-- Legalizácia producentov platform_events do active migration setu.
--
-- DÔVOD:
--   Migrácia 20260921000000 legalizovala tabuľky platform_events a ai_jobs,
--   ale ich PRODUCENT zostal mimo active setu. emit_platform_event() a oba
--   triggery existujú v PROD, no v repo len v migrations-archive/, ktorá sa
--   neaplikuje. CI teda po `supabase db reset` má prázdne tabuľky bez toho,
--   kto do nich píše — akýkoľvek test event spine by v CI nenašiel nič
--   a bol by rovnako bezcenný ako pred legalizáciou tabuliek.
--
-- ROZSAH:
--   Nemení kontrakt. Reprodukuje presne nameraný PROD tvar: telá funkcií,
--   plpgsql, SECURITY DEFINER, search_path=public, a definície oboch
--   triggerov (AFTER, FOR EACH ROW, bez WHEN klauzuly).
--
-- DOPAD NA PROD:
--   - Triggery sú vytvorené IBA ak chýbajú. V PROD existujú, takže sa ich
--     migrácia nedotkne — žiadny DROP/CREATE nad živým write-path na
--     leads a activities, žiadny zámok na týchto tabuľkách.
--   - Funkcie idú cez CREATE OR REPLACE. Telá sú sémanticky identické
--     s PROD; jediný rozdiel je koniec riadku (PROD nesie CRLF zdedené
--     z archívneho súboru, tu LF). OID, práva aj závislosti zostávajú.
--
-- ZÁMERNE NEOPRAVENÉ (legalizujeme substrate as-is):
--   - emit_platform_event je SECURITY DEFINER a má EXECUTE pre PUBLIC
--     (vrátane anon a authenticated). Ktokoľvek ju teda vie zavolať
--     s ľubovoľným agency_id a ľubovoľným payloadom.
--   - trg_activities_platform_events odvodzuje agency cez SELECT ... INTO;
--     pri neexistujúcom lead_id by v_agency zostalo NULL. FK
--     activities_lead_id_fkey je validated a oba triggery sú AFTER,
--     takže táto vetva je dnes nedosiahnuteľná.
--   Oboje patrí do samostatnej brány, nie sem.

-- ── emit_platform_event ───────────────────────────────────────────────────────

create or replace function public.emit_platform_event(
  p_agency uuid,
  p_type text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.platform_events (agency_id, event_type, payload)
  values (p_agency, p_type, coalesce(p_payload, '{}'::jsonb));
end;
$function$;

-- ── leads → lead.created / lead.status_changed ────────────────────────────────

create or replace function public.trg_leads_platform_events()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    perform public.emit_platform_event(
      new.agency_id,
      'lead.created',
      jsonb_build_object(
        'lead_id', new.id,
        'name', new.name,
        'status', new.status
      )
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform public.emit_platform_event(
      new.agency_id,
      'lead.status_changed',
      jsonb_build_object(
        'lead_id', new.id,
        'from', old.status,
        'to', new.status
      )
    );
  end if;
  return new;
end;
$function$;

-- ── activities → integration.activity ─────────────────────────────────────────

create or replace function public.trg_activities_platform_events()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_agency uuid;
begin
  if new.lead_id is null then
    return new;
  end if;

  select l.agency_id into v_agency from public.leads l where l.id = new.lead_id limit 1;

  if new.source in ('integrations', 'email', 'imap', 'gmail', 'outreach')
     or new.type ilike '%email%'
     or new.type ilike '%sync%' then
    perform public.emit_platform_event(
      v_agency,
      'integration.activity',
      jsonb_build_object(
        'activity_id', new.id,
        'lead_id', new.lead_id,
        'type', new.type,
        'source', new.source,
        'title', left(coalesce(new.title, ''), 200)
      )
    );
  end if;

  return new;
end;
$function$;

-- ── triggery ──────────────────────────────────────────────────────────────────
-- Vytvorené iba ak chýbajú, aby sa v PROD nesiahalo na živý write-path.

do $$ begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and c.relname = 'leads'
      and t.tgname  = 'trg_leads_platform_events'
  ) then
    create trigger trg_leads_platform_events
      after insert or update on public.leads
      for each row execute function public.trg_leads_platform_events();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and c.relname = 'activities'
      and t.tgname  = 'trg_activities_platform_events'
  ) then
    create trigger trg_activities_platform_events
      after insert on public.activities
      for each row execute function public.trg_activities_platform_events();
  end if;
end $$;
