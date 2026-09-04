# Rollback: open anon RLS policies

**Použiť iba ak** po aplikovaní `*_drop_open_anon_policies.sql` niečo v CRM prestane fungovať
a founder rozhodne vrátiť predchádzajúci (nezabezpečený) stav.

**Varovanie:** tento rollback **znovu otvára** diery (vrátane `integration_settings` /
`imap_password` a `activities` DELETE pre `anon`). Je to emergency net, nie cieľový stav.

Spustiť v SQL editore produkcie (alebo cez schválený migrate path) **až po explicitnom GO**.

```sql
BEGIN;

-- integration_settings (restore demo open)
DROP POLICY IF EXISTS "demo_select_integration_settings" ON public.integration_settings;
CREATE POLICY "demo_select_integration_settings"
  ON public.integration_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "demo_insert_integration_settings" ON public.integration_settings;
CREATE POLICY "demo_insert_integration_settings"
  ON public.integration_settings FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "demo_update_integration_settings" ON public.integration_settings;
CREATE POLICY "demo_update_integration_settings"
  ON public.integration_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "demo_delete_integration_settings" ON public.integration_settings;
CREATE POLICY "demo_delete_integration_settings"
  ON public.integration_settings FOR DELETE TO anon, authenticated USING (true);

-- activities anon
DROP POLICY IF EXISTS "activities_anon_legacy_all" ON public.activities;
CREATE POLICY "activities_anon_legacy_all"
  ON public.activities FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "activities_anon_insert" ON public.activities;
CREATE POLICY "activities_anon_insert"
  ON public.activities FOR INSERT TO anon WITH CHECK (true);

-- properties anon insert
DROP POLICY IF EXISTS "properties_anon_insert" ON public.properties;
CREATE POLICY "properties_anon_insert"
  ON public.properties FOR INSERT TO anon WITH CHECK (true);

-- lead_property_matches anon
DROP POLICY IF EXISTS "matches_anon_legacy_all" ON public.lead_property_matches;
CREATE POLICY "matches_anon_legacy_all"
  ON public.lead_property_matches FOR ALL TO anon USING (true) WITH CHECK (true);

-- pipeline_moves: remove tenant replacements, restore demo
DROP POLICY IF EXISTS "pipeline_moves_tenant_select" ON public.pipeline_moves;
DROP POLICY IF EXISTS "pipeline_moves_tenant_write" ON public.pipeline_moves;

DROP POLICY IF EXISTS "demo_select_pipeline_moves" ON public.pipeline_moves;
CREATE POLICY "demo_select_pipeline_moves"
  ON public.pipeline_moves FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "demo_insert_pipeline_moves" ON public.pipeline_moves;
CREATE POLICY "demo_insert_pipeline_moves"
  ON public.pipeline_moves FOR INSERT TO anon, authenticated WITH CHECK (true);

COMMIT;
```

Politiky **nedotknuté** migráciou (`Allow anon access`, `demo_*_lead_assignment_rules`)
rollback nepotrebujú.
