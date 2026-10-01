-- Broker ingest: prijímacia adresa môže patriť konkrétnemu maklérovi, nielen agentúre.
-- Aditívne a vratné: nullable stĺpec, žiadny backfill, žiadna zmena existujúcich riadkov.
-- NULL = adresa celej agentúry (doterajšie správanie, napr. office@).

alter table public.inbound_mailboxes
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

comment on column public.inbound_mailboxes.profile_id is
  'Maklér, ktorému táto prijímacia adresa patrí. NULL = adresa agentúry (lead ostáva nepriradený).';

-- Vyhľadávanie pri každom prijatom maili je (agency_id, email); index to drží konštantné.
create index if not exists inbound_mailboxes_agency_email_idx
  on public.inbound_mailboxes (agency_id, email);

create index if not exists inbound_mailboxes_profile_id_idx
  on public.inbound_mailboxes (profile_id)
  where profile_id is not null;
