-- Normalizácia Realvia identifikátorov aj v stĺpci agencies (časté vloženie s [] z UI).
-- Incoming headers už v app strihajú zátvorky; DB mala [rv_...] → žiadny zhodný riadok pri RPC .eq.

CREATE OR REPLACE FUNCTION public.realvia_ident_normalized(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := trim(both from coalesce(raw, ''));
BEGIN
  WHILE length(s) >= 2 AND left(s, 1) = '[' AND right(s, 1) = ']' LOOP
    s := trim(both from substring(s from 2 for length(s) - 2));
  END LOOP;
  RETURN s;
END;
$$;

REVOKE ALL ON FUNCTION public.realvia_ident_normalized(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.realvia_ident_normalized(text) TO service_role;

COMMENT ON FUNCTION public.realvia_ident_normalized(text) IS
  'Odstráni obalujúce znaky [ ] z Realvia identifikátora (aj viacnásobne vnorené).';

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
  WHERE lower(btrim(public.realvia_ident_normalized(a.realvia_identifikator))) =
        lower(btrim(public.realvia_ident_normalized(COALESCE(p_ident1, ''))))
    AND lower(btrim(public.realvia_ident_normalized(a.realvia_identifikator2))) =
        lower(btrim(public.realvia_ident_normalized(COALESCE(p_ident2, ''))))
    AND btrim(public.realvia_ident_normalized(COALESCE(a.realvia_identifikator, ''))) <> ''
    AND btrim(public.realvia_ident_normalized(COALESCE(a.realvia_identifikator2, ''))) <> ''
  ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC NULLS LAST
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.resolve_agency_id_for_realvia(text, text) IS
  'Maps Realvia identifikator pair to agencies.id; toleruje [] v DB aj v parametroch.';

-- Jednorazové zjednotenie už uložených hodnôt (iba kde stĺpec nie je NULL — neprepisovať prázdne páry).
UPDATE public.agencies
SET
  realvia_identifikator = public.realvia_ident_normalized(realvia_identifikator),
  realvia_identifikator2 = public.realvia_ident_normalized(realvia_identifikator2),
  updated_at = coalesce(updated_at, now())
WHERE
  (realvia_identifikator IS NOT NULL AND public.realvia_ident_normalized(realvia_identifikator) IS DISTINCT FROM realvia_identifikator)
  OR (
    realvia_identifikator2 IS NOT NULL AND public.realvia_ident_normalized(realvia_identifikator2) IS DISTINCT FROM realvia_identifikator2
  );
