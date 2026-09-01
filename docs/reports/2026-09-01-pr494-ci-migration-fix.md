# PR #494 CI fix — profiles guard migration columns

**Date:** 2026-09-01  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/494  
**Check:** CI - Revolis.AI / Lint, test, build (job 99817858966)

## ZISTI

CI failed during `supabase db reset` applying migration `20260831233000_profiles_guard_account_tier_ui_role.sql`:

```
ERROR: column "account_tier" of relation "profiles" does not exist (SQLSTATE 42703)
CREATE TRIGGER profiles_guard_account_tier_and_ui_role
  BEFORE UPDATE OF account_tier, ui_role ON public.profiles
```

## Root cause

Migration created a BEFORE UPDATE trigger on `profiles.account_tier` and `profiles.ui_role`, but those columns were never added in the canonical migration chain. They exist in production via manual dashboard drift; local/CI `db reset` starts from baseline only.

`agencies.account_tier` exists (`20260602_agency_billing_and_credits.sql`); profile-level entitlements are separate and used by billing webhooks and `onboard-start` tier gate.

## Fix

Add idempotent column DDL at top of `20260831233000_profiles_guard_account_tier_ui_role.sql`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_tier text,
  ADD COLUMN IF NOT EXISTS ui_role text NOT NULL DEFAULT 'agent';
```

Then create function + trigger unchanged.

## Verifikácia

- [ ] CI green on PR #494 after push
- [ ] Founder: apply same migration in Supabase Dashboard if not already present

## Classification

| Field | Value |
|-------|-------|
| diffRelation | related |
| flakeAssessment | unlikely |
| recommendedAction | fix |
| confidence | high |
