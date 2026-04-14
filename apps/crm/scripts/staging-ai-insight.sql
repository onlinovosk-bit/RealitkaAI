alter table public.leads
  add column if not exists ai_insight text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leads'
      and column_name = 'sofia_insight'
  ) then
    update public.leads
    set ai_insight = sofia_insight
    where ai_insight is null
      and sofia_insight is not null;
  end if;
end
$$;
