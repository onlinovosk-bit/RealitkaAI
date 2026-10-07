-- PRICING-V2 (W2-A, 2026-10-05): aditívne stĺpce na agencies pre cenník v2.
--
-- Marker modelu: pricing_model = 'v2' (NULL = legacy, existujúce riadky ostávajú nedotknuté).
-- pricing_band      pásmo v2 (start/team/office/network), NULL pre legacy.
-- licensed_users    počet povolených používateľov v2 plánu (len sa eviduje, nevynucuje sa).
-- pack_credits      mesačný opakovaný balík kreditov navyše k plánu (0 = bez balíka).
--
-- Len ADD COLUMN IF NOT EXISTS: žiadny DROP, žiadny prepis dát, bezpečné opakovanie.
-- Žiadny backfill: legacy agentúry ostávajú pricing_model NULL a pack_credits 0.

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS pricing_model  text    CHECK (pricing_model IN ('v2')),
  ADD COLUMN IF NOT EXISTS pricing_band   text    CHECK (pricing_band IN ('start', 'team', 'office', 'network')),
  ADD COLUMN IF NOT EXISTS licensed_users integer CHECK (licensed_users IS NULL OR licensed_users >= 1),
  ADD COLUMN IF NOT EXISTS pack_credits   integer NOT NULL DEFAULT 0 CHECK (pack_credits >= 0);

COMMENT ON COLUMN public.agencies.pricing_model IS
  'Cenník: v2 = paušál na kanceláriu (pricing-v2); NULL = legacy seat model. Legacy predplatiteľ sa automaticky nepresúva.';
COMMENT ON COLUMN public.agencies.pricing_band IS
  'Pásmo cenníka v2 (start/team/office/network); NULL pre legacy.';
COMMENT ON COLUMN public.agencies.licensed_users IS
  'Počet povolených používateľov v2 plánu; zatiaľ len evidencia, limit sa pri pozvánkach nevynucuje.';
COMMENT ON COLUMN public.agencies.pack_credits IS
  'Mesačný opakovaný balík kreditov navyše k plánu v2 (0 = bez balíka); súčasť mesačného grantu.';
