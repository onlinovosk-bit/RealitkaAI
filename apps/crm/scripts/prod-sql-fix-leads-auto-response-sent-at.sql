ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS auto_response_sent_at timestamptz;
