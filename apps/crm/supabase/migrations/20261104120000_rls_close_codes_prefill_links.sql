-- DRAFT (neaplikované). Uzatvára rls_disabled_in_public / sensitive_columns_exposed
-- pre tabuľky, ktorým v migráciách chýba ENABLE ROW LEVEL SECURITY.
-- Všetok aplikačný prístup ide cez service_role (obchádza RLS), preto deny-all
-- pre anon/authenticated nerozbije existujúci tok.
begin;

alter table if exists public.credit_redemption_codes enable row level security;
revoke all on table public.credit_redemption_codes from anon, authenticated;
drop policy if exists credit_redemption_codes_deny_all on public.credit_redemption_codes;
create policy credit_redemption_codes_deny_all on public.credit_redemption_codes
  as restrictive for all to anon, authenticated using (false) with check (false);

alter table if exists public.demo_prefill_links enable row level security;
revoke all on table public.demo_prefill_links from anon, authenticated;
drop policy if exists demo_prefill_links_deny_all on public.demo_prefill_links;
create policy demo_prefill_links_deny_all on public.demo_prefill_links
  as restrictive for all to anon, authenticated using (false) with check (false);

commit;

-- Overenie po aplikácii (len čítanie):
-- select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
--  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
