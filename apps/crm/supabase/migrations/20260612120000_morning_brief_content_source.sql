-- Morning brief: track LLM vs fallback content on each send
ALTER TABLE public.morning_briefs
  ADD COLUMN IF NOT EXISTS content_source TEXT
    CHECK (content_source IS NULL OR content_source IN ('llm', 'fallback')),
  ADD COLUMN IF NOT EXISTS content_source_reason TEXT;

COMMENT ON COLUMN public.morning_briefs.content_source IS
  'llm = Claude generated body; fallback = deterministic or delivery fallback';
COMMENT ON COLUMN public.morning_briefs.content_source_reason IS
  'When content_source=fallback: timeout | api_error | empty_response | delivery_fallback';
