# Plan — Pricing Migration v2

**Status:** READY FOR EXPLICIT IMPLEMENTATION GO · runtime / Stripe env not authorized  
**Build Order:** `docs/briefs/BO-pricing-migration-v2.md`  
**Required phrase:** `GO IMPLEMENT PRICING V2`  
**Baseline this plan was written against:** `origin/main` `47ec485275166f00671945ed3fd928fac5271508` (fresh fetch 2026-08-24)

Pred prvým editom znovu fetch a porovnaj SHA. **Nespájať s Action Center V0.**

---

## 1. Outcome

Nový zákazník vidí a checkoutuje 89 / 83 / 79 € s DPH. Starý zákazník ostáva na starom Price ID, kým founder nerozhodne o migrácii predplatného.

## 2. Design locked

- Nové Stripe Price objekty, staré nemazať.  
- Repo SSOT = `PLAN_PRICES_EUR`.  
- Owner Cockpit 349 bez zmeny ceny; do `memory/decisions.md` ide **dôvod**, nie nové číslo.  
- Mojibake v `billing-store.ts:263` v tom istom PR.  
- `credits-billing.ts` a `apps/crm/src/lib/stripe/**` (ak existuje) = stop.

## 3. Implementation slices (až po GO)

1. Founder: potvrdiť zámer 20 % → 11 % volume discount.  
2. Ops: overiť live/sandbox `tax_behavior`; vytvoriť nové Price; **neprepnúť prod env**.  
3. Repo PR (Tier 3): `PLAN_PRICES_EUR` + CRM UI + testy + `pricing-v1.md` + `COMPANY.md` + decision record + mojibake.  
4. Marketing/legal 79 € = **samostatný PR / GO**, kým tento BO nerozšíri scope.  
5. Prod env switch = samostatný founder GO po zelenom Preview.

## 4. Verification commands

```bash
npx vitest run src/lib/__tests__/program-tier-pricing.test.ts \
  src/lib/__tests__/smart-active-program-features.test.ts \
  tests/verification/billing-credits.verification.test.ts
npm run test:smoke
```

## 5. Rollback

Env na staré Price ID. Git revert SSOT. Predplatné nenaťahovať.

## 6. Stop

BO-B § Stop. Bez Stripe dôkazu `inclusive` sa env **neprepína**.
