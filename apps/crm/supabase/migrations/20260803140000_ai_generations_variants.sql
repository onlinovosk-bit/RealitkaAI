-- Štyri štýlové varianty inzerátu + záznam, ktorý si maklér vybral.
--
-- Výber je moat signál: pri jednom texte vieš len či ho maklér upravil,
-- pri štyroch vieš, ktorý ŠTÝL na jeho trhu vyhráva. Po stovke inzerátov
-- vieš, že v Prešove funguje iný štýl než v Bratislave — a to konkurencia
-- nemá, lebo ten výber nezbiera.

ALTER TABLE public.ai_generations
  -- všetky vygenerované varianty: { conversion: {...}, facts: {...}, story: {...}, honest: {...} }
  ADD COLUMN IF NOT EXISTS variants jsonb,
  -- z ktorého variantu pochádza ktoré pole: { portal_text: "story", fb_ad_copy: "facts", ... }
  ADD COLUMN IF NOT EXISTS chosen_variants jsonb,
  -- prevažujúci variant (najčastejšia hodnota v chosen_variants) — na rýchle agregácie
  ADD COLUMN IF NOT EXISTS primary_variant text;

COMMENT ON COLUMN public.ai_generations.variants IS
  'Všetky vygenerované štýlové varianty. Nikdy sa neprepisujú.';
COMMENT ON COLUMN public.ai_generations.chosen_variants IS
  'Mapa pole -> variant. Zaznamenáva, čo si maklér z ktorého variantu vybral. Moat signál.';
COMMENT ON COLUMN public.ai_generations.primary_variant IS
  'Prevažujúci variant pre agregácie typu "ktorý štýl vyhráva v okrese X".';

CREATE INDEX IF NOT EXISTS ai_generations_primary_variant_idx
  ON public.ai_generations (agency_id, primary_variant)
  WHERE primary_variant IS NOT NULL;
