-- HERO-CAPTURE-SOURCE (2026-10-05)
--
-- Hero formulár na landing stránke (HeroEmailCapture.tsx) posiela source = 'hero_email_capture'.
-- `api/demo/capture-lead` túto hodnotu akceptuje (validSources), ale constraint
-- `leads_demo_source_check` (PROD, baseline 20260925210000) povoľuje iba ai_odhadca,
-- neighborhood_watch a digital_twin. INSERT preto padne na 23514 (check_violation), handler
-- vráti 500 a návštevník vidí „Nepodarilo sa uložiť kontakt." — lead sa neuloží a nepresmeruje
-- sa na /register.
--
-- Mení LEN zoznam povolených hodnôt (pridáva 'hero_email_capture'); riadkov sa nedotýka
-- (PROD leads_demo mal 2026-10-05 0 riadkov). Jeden ALTER TABLE s dvoma akciami: atómový
-- (nevznikne okno bez constraintu) a idempotentný (opakované spustenie, napr. ručne cez
-- Dashboard, skončí v tom istom stave). Tabuľku vytvára baseline 20260925210000
-- (CREATE TABLE IF NOT EXISTS), ktorá je v poradí pred touto migráciou, takže guard
-- `to_regclass` netreba.

ALTER TABLE public.leads_demo
  DROP CONSTRAINT IF EXISTS leads_demo_source_check,
  ADD CONSTRAINT leads_demo_source_check CHECK (
    source = ANY (ARRAY['ai_odhadca'::text, 'neighborhood_watch'::text, 'digital_twin'::text, 'hero_email_capture'::text])
  );
