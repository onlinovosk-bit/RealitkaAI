-- Rate limit buckets — distributed sliding-window counter
-- Nahrádza in-process Map, funguje v serverless/edge prostredí.

create table if not exists rate_limit_buckets (
  key        text        not null,
  window_end timestamptz not null,
  count      int         not null default 1,
  primary key (key, window_end)
);

create index if not exists idx_rlb_window on rate_limit_buckets (window_end);

-- RLS: tabuľka je len pre service role (žiadny priamy prístup cez anon/user)
alter table rate_limit_buckets enable row level security;
-- žiadne RLS policy = service_role má vždy prístup, anon/user NIE

-- Atomický upsert + vracia nový count
-- Vracia count PO inkremente (nie pred).
create or replace function rate_limit_increment(
  p_key        text,
  p_window_end timestamptz,
  p_max        int
)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into rate_limit_buckets (key, window_end, count)
  values (p_key, p_window_end, 1)
  on conflict (key, window_end)
  do update set count = rate_limit_buckets.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

-- Automatické čistenie starých okien (pg_cron, ak dostupné)
-- select cron.schedule('rl-cleanup','0 * * * *',
--   $$delete from rate_limit_buckets where window_end < now() - interval '10 minutes'$$);
