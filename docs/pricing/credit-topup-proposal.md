# Credit top-up — návrh (v1, existujúci pricing stack)

**Pre:** Andy · **Dátum:** 2026-07-31 · **Zdroj pravdy:** `apps/crm/docs/pricing-v1.md`, `program-tier-pricing.ts`

---

## Fáza A — Root cause (zistené)

| # | Problém | Dôkaz |
|---|---------|-------|
| 1 | **Zostatok 0 v DB** | Prod Smolko: `credits_balance=0`, `credit_ledger` 0 riadkov |
| 2 | **Grant cron nikdy nepripísal** | 3 seaty × office tier = 60 kr/mes — cron nebežal / nebol triggered |
| 3 | **Stripe env = placeholdery** | `.env.local`: všetky `STRIPE_*` = `xxx` → checkout zlyhá na Stripe API |
| 4 | **Top-up UI nie je na /billing** | Checkout je na `/upgrade`; generátor linkuje na `/billing` (mŕtvy koniec) |
| 5 | **Žiadny widget zostatku** | UI neukazuje aktuálny pool — len „Odpočítané kredity“ po generovaní |
| 6 | **`areTopupCheckoutPricesConfigured()` slabá kontrola** | `price_xxx` prejde ako „nakonfigurované“ → UI ukáže tlačidlá, Stripe zlyhá |

**Local/dev:** checkout nedostupný (placeholdery) + chýba manuálny grant pre testovanie.  
**Prod:** migrácie grant pool OK, ale **žiadny grant/top-up** → balance zostáva 0; Stripe produkty treba overiť vo Vercel env.

---

## Fáza B — Návrh (bez novej schémy)

### 1. Cenník (reuse)

- **Seaty:** SOLO 79 € / 30 kr · TEAM 71 € / 25 kr · OFFICE 63 € / 20 kr (mesačný grant/seat)
- **Spotreba:** unlock 4 · analýza 1 · e-mail 1 · popis 2 kr
- **Top-up:** `TOPUP_PACKAGES` — Štart 50/49 € · Rast 150/129 € ⭐ · Pro 500/379 € · Mega 1500/999 €
- **Pravidlá:** grant expiruje koniec mesiaca · purchased neexpiruje · spend grant→purchase

### 2. UX flow

| Surface | Akcia |
|---------|-------|
| `/billing` | Zostatok + grant/purchased breakdown + top-up CTA (presunúť z `/upgrade`) |
| Low balance banner | Pri ≤20 % mesačného grantu — owner only |
| 402 modal (generátor, AI) | „Nemáte dostatok kreditov“ → `/billing#topup` |
| `/upgrade` | Ponechať seat + starter pack; top-up presunúť pod billing |

### 3. Copy (SK)

- Zostatok: **„Kreditový zostatok: {n} kr“**
- Nula: **„0 kreditov — AI akcie sú pozastavené“**
- CTA: **„Doplniť kredity“** / **„Kúpiť balík Rast (150 kr)“**
- 402: **„Na túto akciu potrebujete {cost} kr. Máte {balance} kr.“**

### 4. Dev workaround (Smolko test bez Stripe)

```sql
-- Jednorazový test grant (service role / SQL Editor)
INSERT INTO credit_ledger (agency_id, delta, reason, ref, idempotency_key, source)
VALUES ('11111111-1111-1111-1111-111111111111', 200, 'manual_dev_grant', '202607', 'manual:smolko:202607', 'purchase');

UPDATE agencies SET purchased_credits_balance = 200, credits_balance = 200, billing_updated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111';
```

Alternatíva: uplatniť starter pack kód cez `/upgrade` (47 kr, neexpiruje).

### 5. Stripe checklist

```
STRIPE_SECRET_KEY=sk_test_… / sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_CREDITS_START=price_…
STRIPE_PRICE_CREDITS_RAST=price_…
STRIPE_PRICE_CREDITS_PRO=price_…
STRIPE_PRICE_CREDITS_MEGA=price_…
NEXT_PUBLIC_APP_URL=https://app.revolis.ai
```

Webhook: `POST /api/billing/webhook` · metadata `checkoutType=credit_topup`.

### 6. Guardrails

- Auto-recharge: opt-in owner, prah 20 % grantu, default Rast, strop 500 €/mes
- Grant expiry: cron `credits-expire` posledný deň mesiaca
- Smolko `manual_plan market_vision` — grandfathered, **nedotýkať sa** ceny; grant riešiť manuálne alebo cron

### 7. Triviálne fixy (1 PR)

1. `ListingGeneratorForm` link `/billing` → `/upgrade` (dočasne) alebo `/billing#topup`
2. `areTopupCheckoutPricesConfigured()` — odmietnuť `price_xxx` / neplatné ID
3. `/api/billing/plan` — pridať `creditsBalance`, `grantBalance`, `purchasedBalance`

**Ďalší krok:** GO na PR „billing credits panel + link fix“ (~1 deň).
