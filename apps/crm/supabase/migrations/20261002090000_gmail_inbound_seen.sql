-- GMAIL-PULL-FINISH: pamäť už spracovaných Gmail správ (iba ID, nikdy obsah).
--
-- Prečo: bez nej každý beh pullu znova sťahuje telá všetkých správ zo štítku
-- (zbytočné čítanie cudzích dát v rozpore s minimalizáciou). Lead sa pritom
-- nezdvojí — to drží acquire_dedup_keys — ale čítanie áno.
--
-- Aditívne a vratné (DROP TABLE). Nie je to klientska tabuľka: píše a číta
-- iba service role z cronu. RLS zapnutá bez politík = deny-all pre anon aj
-- authenticated, fail-closed.
-- Retencia: riadky starší než 30 dní maže samotný pull (lookback je najviac 14 dní).

create table if not exists public.agency_gmail_inbound_seen (
  agency_id        uuid        not null references public.agencies(id) on delete cascade,
  gmail_message_id text        not null,
  outcome          text        not null default 'acquired',
  acquired_at      timestamptz not null default now(),
  primary key (agency_id, gmail_message_id)
);

create index if not exists agency_gmail_inbound_seen_acquired_idx
  on public.agency_gmail_inbound_seen (agency_id, acquired_at);

alter table public.agency_gmail_inbound_seen enable row level security;

revoke all on public.agency_gmail_inbound_seen from anon, authenticated;

comment on table public.agency_gmail_inbound_seen is
  'Gmail pull: ID správ, ktoré už prešli /api/acquire/email. Bez obsahu, bez adries. Service role only.';
