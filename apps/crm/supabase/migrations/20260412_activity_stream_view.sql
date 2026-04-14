-- Pohľad pre /api/activities (dashboard „Posledné aktivity“).
begin;

create or replace view public.activity_stream as
select
  a.id,
  a.type,
  coalesce(nullif(trim(a.title), ''), a.type) as title,
  a.text,
  a.actor_name,
  a.lead_id,
  a.created_at
from public.activities a;

comment on view public.activity_stream is
  'Zjednodušený stream aktivít pre AI Activity Feed na dashboarde.';

commit;
