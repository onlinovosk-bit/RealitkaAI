-- Perzistencia AI generovaného obsahu (KF1 Inzerát Generátor).
--
-- Doteraz POST /api/ai/listing-content vygeneroval texty a vrátil ich do JSON.
-- Maklér ich musel skopírovať skôr, než zavrel tab — inak boli preč. Rovnaká
-- trieda chyby ako I-03 v .cursor/rules/revolis-incidents.mdc (vypočítať a zahodiť).
--
-- Tabuľka drží aj pôvodný výstup AI, aj ručne upravenú verziu makléra. Rozdiel
-- medzi nimi je moat dáta: hovorí, čo AI píše zle a ako to maklér opravuje.

CREATE TABLE IF NOT EXISTS public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  profile_id uuid,
  property_id uuid,

  kind text NOT NULL DEFAULT 'listing_content',
  persona text,

  -- vstup, z ktorého sa generovalo (aby sa dal beh zopakovať)
  input jsonb NOT NULL,

  -- pôvodný výstup AI, nikdy sa neprepisuje
  output jsonb,
  -- ručne upravená verzia makléra; NULL = neupravené
  edited_output jsonb,

  model text,
  latency_ms integer,
  cost_eur numeric(10, 5),
  credits_spent integer,

  status text NOT NULL DEFAULT 'draft',   -- draft | edited | published | discarded
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_generations IS
  'AI generovaný obsah (KF1 Inzerát Generátor). output = pôvodné AI, edited_output = úprava makléra.';
COMMENT ON COLUMN public.ai_generations.edited_output IS
  'Rozdiel voči output je moat dáta — ukazuje, čo AI píše zle.';

CREATE INDEX IF NOT EXISTS ai_generations_agency_created_idx
  ON public.ai_generations (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generations_property_idx
  ON public.ai_generations (property_id) WHERE property_id IS NOT NULL;

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_generations_service_role_all" ON public.ai_generations;
CREATE POLICY "ai_generations_service_role_all"
  ON public.ai_generations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Tenant izolácia podľa vzoru leads: profil vidí a mení len záznamy vlastnej agentúry.
DROP POLICY IF EXISTS "ai_generations_tenant_select" ON public.ai_generations;
CREATE POLICY "ai_generations_tenant_select"
  ON public.ai_generations FOR SELECT TO authenticated
  USING (agency_id IN (SELECT p.agency_id FROM public.profiles AS p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "ai_generations_tenant_update" ON public.ai_generations;
CREATE POLICY "ai_generations_tenant_update"
  ON public.ai_generations FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT p.agency_id FROM public.profiles AS p WHERE p.id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT p.agency_id FROM public.profiles AS p WHERE p.id = auth.uid()));

REVOKE ALL ON TABLE public.ai_generations FROM anon;
GRANT SELECT, UPDATE ON TABLE public.ai_generations TO authenticated;
GRANT ALL ON TABLE public.ai_generations TO service_role;

CREATE OR REPLACE FUNCTION public.touch_ai_generations_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS ai_generations_touch ON public.ai_generations;
CREATE TRIGGER ai_generations_touch
  BEFORE UPDATE ON public.ai_generations
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_generations_updated_at();
