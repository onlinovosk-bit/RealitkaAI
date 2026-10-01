-- Optional agency contact columns for Reply-To / template phone (prod drift fix).

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.agencies.email IS
  'Public inbound Reply-To when set; otherwise owner profile email fallback.';

COMMENT ON COLUMN public.agencies.phone IS
  'Optional agency phone line in inbound auto-response template.';
