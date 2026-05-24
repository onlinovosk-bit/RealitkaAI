-- Resolve agency UUID from Realvia header pair with whitespace + case tolerant match.
-- Supabase REST .eq uses raw column equality only; pasted credentials often differ by trim/case.

CREATE OR REPLACE FUNCTION public.resolve_agency_id_for_realvia(
  p_ident1 text,
  p_ident2 text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id
  FROM public.agencies a
  WHERE lower(btrim(a.realvia_identifikator)) = lower(btrim(COALESCE(p_ident1, '')))
    AND lower(btrim(a.realvia_identifikator2)) = lower(btrim(COALESCE(p_ident2, '')))
    AND btrim(COALESCE(a.realvia_identifikator, '')) <> ''
    AND btrim(COALESCE(a.realvia_identifikator2, '')) <> ''
  ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC NULLS LAST
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.resolve_agency_id_for_realvia(text, text) IS
  'Maps trimmed case-insensitive Realvia identifikator pair to agencies.id for webhook ingestion.';

REVOKE ALL ON FUNCTION public.resolve_agency_id_for_realvia(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_agency_id_for_realvia(text, text) TO service_role;
