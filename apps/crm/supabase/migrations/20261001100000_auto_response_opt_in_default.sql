-- AUTO-RESPONSE-OPTIN-DEFAULT (2026-10-01)
--
-- Auto-odpoveď leadovi odchádza v mene agentúry. Migrácia 20260713150000 ju zapla predvolene
-- (opt-out): každá nová agentúra by ju dostala zapnutú bez svojho vedomia. Od teraz je opt-in.
--
-- Mení LEN predvolenú hodnotu pre nové riadky. Existujúce riadky sa nedotýkajú — produkčný stav
-- už upravili jednotlivé, schválené zápisy (viď memory/decisions.md, AUTO-RESPONSE-OPTIN).
-- Zapnutie pre konkrétnu agentúru: UPDATE public.agencies SET auto_response_enabled = true
-- WHERE id = '…' — až so súhlasom agentúry.

ALTER TABLE public.agencies
  ALTER COLUMN auto_response_enabled SET DEFAULT false;

COMMENT ON COLUMN public.agencies.auto_response_enabled IS
  'Opt-in: when true, the inbound gateway sends the auto-response for this agency. New agencies start with false; enable only with the agency consent.';
