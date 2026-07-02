-- PR-2: Rozlíšenie grant vs purchase v credit_ledger + split balance na agencies

ALTER TABLE public.credit_ledger
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'grant'
    CHECK (source IN ('grant', 'purchase'));

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS grant_credits_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_credits_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cockpit_tier text,
  ADD COLUMN IF NOT EXISTS owner_cockpit_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_auto_recharge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_auto_recharge_cap_eur integer NOT NULL DEFAULT 500;

-- Backfill: existujúci credits_balance → grant pool (bez straty)
UPDATE public.agencies
SET grant_credits_balance = credits_balance
WHERE grant_credits_balance = 0 AND credits_balance > 0;
