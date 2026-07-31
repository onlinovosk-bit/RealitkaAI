-- Generic AI generation history (listing, email, followup, …)

CREATE TABLE IF NOT EXISTS public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  workflow_type text NOT NULL CHECK (workflow_type IN (
    'listing', 'email', 'followup', 'rescore', 'summary', 'report'
  )),

  input_json jsonb NOT NULL,
  idempotency_key text UNIQUE,

  model_output jsonb,
  rendered_output jsonb,

  prompt_version text,
  prompt_hash text,
  schema_version text,
  model text,
  temperature double precision,

  generation_status text NOT NULL DEFAULT 'draft' CHECK (generation_status IN (
    'draft', 'generated', 'edited', 'copied', 'published', 'archived'
  )),

  selected_variant text,
  edited_text text,
  published_to text[],
  copied_at timestamptz,

  feedback text,
  rating int CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),

  credits_spent int,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_agency_created
  ON public.ai_generations (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_generations_profile_created
  ON public.ai_generations (profile_id, created_at DESC)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_generations_workflow
  ON public.ai_generations (agency_id, workflow_type, created_at DESC);

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_generations_tenant_select" ON public.ai_generations;
CREATE POLICY "ai_generations_tenant_select"
  ON public.ai_generations
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "ai_generations_tenant_insert" ON public.ai_generations;
CREATE POLICY "ai_generations_tenant_insert"
  ON public.ai_generations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "ai_generations_tenant_update" ON public.ai_generations;
CREATE POLICY "ai_generations_tenant_update"
  ON public.ai_generations
  FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL
    )
  );
