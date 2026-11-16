-- External subscription capacity — percent snapshots on existing AI Control Tower tables.
-- Idempotent. Do not apply to production from this PR.
-- Service role reads and writes. anon and authenticated stay closed.
-- Does not convert subscription percents to EUR.

alter table if exists public.ai_quota_pools
  add column if not exists quota_window text not null default 'monthly';

alter table if exists public.ai_quota_pools
  drop constraint if exists ai_quota_pools_provider_account_ref_key;

alter table if exists public.ai_quota_pools
  drop constraint if exists ai_quota_pools_provider_account_ref_quota_window_key;

do $$
begin
  if to_regclass('public.ai_quota_pools') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'ai_quota_pools_identity'
        and conrelid = 'public.ai_quota_pools'::regclass
    ) then
      alter table public.ai_quota_pools
        add constraint ai_quota_pools_identity
        unique (provider, account_ref, quota_window);
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'ai_quota_pools_quota_window_check'
        and conrelid = 'public.ai_quota_pools'::regclass
    ) then
      alter table public.ai_quota_pools
        add constraint ai_quota_pools_quota_window_check
        check (quota_window in ('weekly', 'monthly', 'session', 'custom'));
    end if;
  end if;
end
$$;

alter table if exists public.ai_quota_snapshots
  add column if not exists account_ref text not null default 'default';

alter table if exists public.ai_quota_snapshots
  add column if not exists quota_window text not null default 'monthly';

alter table if exists public.ai_quota_snapshots
  add column if not exists used_percent numeric(5, 2);

alter table if exists public.ai_quota_snapshots
  add column if not exists remaining_percent numeric(5, 2);

alter table if exists public.ai_quota_snapshots
  add column if not exists captured_at timestamptz;

alter table if exists public.ai_quota_snapshots
  add column if not exists reset_timezone text;

do $$
begin
  if to_regclass('public.ai_quota_snapshots') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'ai_quota_snapshots_quota_window_check'
        and conrelid = 'public.ai_quota_snapshots'::regclass
    ) then
      alter table public.ai_quota_snapshots
        add constraint ai_quota_snapshots_quota_window_check
        check (quota_window in ('weekly', 'monthly', 'session', 'custom'));
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'ai_quota_snapshots_used_percent_check'
        and conrelid = 'public.ai_quota_snapshots'::regclass
    ) then
      alter table public.ai_quota_snapshots
        add constraint ai_quota_snapshots_used_percent_check
        check (used_percent is null or (used_percent >= 0 and used_percent <= 100));
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'ai_quota_snapshots_remaining_percent_check'
        and conrelid = 'public.ai_quota_snapshots'::regclass
    ) then
      alter table public.ai_quota_snapshots
        add constraint ai_quota_snapshots_remaining_percent_check
        check (remaining_percent is null or (remaining_percent >= 0 and remaining_percent <= 100));
    end if;
  end if;
end
$$;

create unique index if not exists ai_quota_snapshots_pool_captured_idx
  on public.ai_quota_snapshots (pool_id, captured_at)
  where captured_at is not null;

create index if not exists ai_quota_snapshots_identity_captured_idx
  on public.ai_quota_snapshots (provider, account_ref, quota_window, captured_at desc);

alter table if exists public.ai_quota_pools enable row level security;
alter table if exists public.ai_quota_snapshots enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated')
     and to_regclass('public.ai_quota_pools') is not null then
    execute 'drop policy if exists ai_quota_pools_deny on public.ai_quota_pools';
    execute $p$
      create policy ai_quota_pools_deny
        on public.ai_quota_pools
        for all
        to authenticated
        using (false)
        with check (false)
    $p$;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated')
     and to_regclass('public.ai_quota_snapshots') is not null then
    execute 'drop policy if exists ai_quota_snapshots_deny on public.ai_quota_snapshots';
    execute $p$
      create policy ai_quota_snapshots_deny
        on public.ai_quota_snapshots
        for all
        to authenticated
        using (false)
        with check (false)
    $p$;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.ai_quota_pools from anon, authenticated';
    execute 'revoke all on public.ai_quota_snapshots from anon, authenticated';
  end if;
end
$$;

comment on column public.ai_quota_snapshots.used_percent is
  'Subscription used percent 0-100. Not converted to EUR.';
comment on column public.ai_quota_snapshots.quota_window is
  'weekly, monthly, session or custom. Weekly and session are distinct pools.';
