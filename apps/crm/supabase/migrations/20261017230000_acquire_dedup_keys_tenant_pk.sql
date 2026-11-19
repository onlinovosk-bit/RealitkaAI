-- acquire_dedup_keys: uniqueness must be per-tenant.
--
-- Predtým bol PRIMARY KEY len na `key` (hash obsahu dopytu bez agency_id).
-- Dve kancelárie s rovnakým portálovým dopytom (rovnaký listing + kontakt + deň)
-- zdieľali jeden nárok: druhá dostala NOT_A_LEAD/duplicate a lead nikdy nevznikol.
-- `agency_id` v tabuľke bolo, ale neviazalo unikátnosť.
--
-- Composite PK (agency_id, key) = každá kancelária má vlastný nárok na ten istý obsah.

alter table public.acquire_dedup_keys
  drop constraint if exists acquire_dedup_keys_pkey;

alter table public.acquire_dedup_keys
  add primary key (agency_id, key);
