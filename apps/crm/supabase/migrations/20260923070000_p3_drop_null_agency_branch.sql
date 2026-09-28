-- ─────────────────────────────────────────────────────────────────────────────
-- P-3: definitívne uzavretie vetvy `agency_id IS NULL` v tenantných policies
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Tri policies v PROD sprístupňovali KAŽDÉMU prihlásenému používateľovi riadky
-- s agency_id IS NULL (osirené eventy / audit záznamy):
--
--   platform_events.platform_events_select_tenant      (SELECT)
--   ai_action_audit.ai_action_audit_select_tenant      (SELECT)
--   ai_action_audit.ai_action_audit_insert_tenant      (INSERT)
--
-- Vetva bola vedomý dočasný stav (viď 20260921000000, sekcia "ZÁMERNE
-- NEOPRAVENÉ"). Bola tolerovateľná len dovtedy, kým NULL riadky reálne
-- existovali. Meranie proti PROD tesne pred touto migráciou:
--
--   platform_events : 1420 riadkov, z toho agency_id IS NULL = 0
--   ai_action_audit :  186 riadkov, z toho agency_id IS NULL = 0
--
-- Nula na oboch stranách => vetva nechráni žiadny existujúci riadok a jej
-- jediný efekt je budúca diera. Týmto sa zatvára natrvalo.
--
-- Zvyšok výrazu zostáva BAJT NA BAJT rovnaký. Nemení sa cmd, roles, ani tvar
-- poddotazu — zámerne sa nepresúva na public.profile_agencies_for_auth(),
-- hoci je to inde v repe zavedený helper. Táto brána odstraňuje vetvu, nič iné.
--
-- ── Rozdiel CI vs PROD na ai_action_audit (dôležité pre čítanie tohto súboru) ──
-- Repo migrácia 20260616123000_rls_wave_a_hardening.sql obe menované policies
-- DROPuje a nahrádza jedinou `ai_action_audit_tenant` (FOR ALL,
-- profile_agencies_for_auth). Tá migrácia však v PROD nikdy nebežala — je jednou
-- zo 60 neaplikovaných. Preto:
--   - v CI (čistý db reset) menované policies NEEXISTUJÚ  -> guard preskočí
--   - v PROD existujú s NULL vetvou                       -> guard ich prepíše
-- Bezpodmienečný CREATE by v CI pridal policies, ktoré tamojší wave-A model
-- nemá, a permisívne policies sa OR-ujú — teda by prístup rozšíril. Preto guard.
-- Tá CI/PROD divergencia je staršia než táto brána a nie je jej predmetom.
--
-- Žiadna zmena schémy, žiadna zmena dát, žiadny app kód.

-- ── platform_events ─────────────────────────────────────────────────────────
-- Existuje v CI aj v PROD v rovnakom tvare (legalizované 20260921000000),
-- preto bezpodmienečná konvergencia.

drop policy if exists platform_events_select_tenant on public.platform_events;

create policy platform_events_select_tenant
  on public.platform_events
  for select
  to authenticated
  using (
    agency_id in (
      select p.agency_id
      from public.profiles p
      where p.auth_user_id = auth.uid()
        and p.agency_id is not null
    )
  );

-- ── ai_action_audit ─────────────────────────────────────────────────────────
-- Len tam, kde policy reálne existuje (PROD). V CI no-op, viď hlavička.

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'ai_action_audit'
      and policyname = 'ai_action_audit_select_tenant'
  ) then
    execute 'drop policy ai_action_audit_select_tenant on public.ai_action_audit';
    execute $p$
      create policy ai_action_audit_select_tenant
        on public.ai_action_audit
        for select
        to authenticated
        using (
          agency_id in (
            select p.agency_id
            from public.profiles p
            where p.auth_user_id = auth.uid()
              and p.agency_id is not null
          )
        )
    $p$;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'ai_action_audit'
      and policyname = 'ai_action_audit_insert_tenant'
  ) then
    execute 'drop policy ai_action_audit_insert_tenant on public.ai_action_audit';
    execute $p$
      create policy ai_action_audit_insert_tenant
        on public.ai_action_audit
        for insert
        to authenticated
        with check (
          agency_id in (
            select p.agency_id
            from public.profiles p
            where p.auth_user_id = auth.uid()
              and p.agency_id is not null
          )
        )
    $p$;
  end if;
end $$;
