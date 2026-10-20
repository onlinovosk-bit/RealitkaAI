# Trial bez karty a ceny v Stripe live — čo musí urobiť founder

**Bod 10 zadania 2026-10-15.** Kampaň stojí na dvoch veciach: na 14-dňovej
skúšobnej dobe bez karty a na cenníku Start 25 / Team 60 / Kancelária 149 /
Sieť od 349 € bez DPH. Tento dokument je postupnosť krokov pre teba — kód je
pripravený, ale tri veci sa z repozitára urobiť nedajú.

## Čo už platí bez tvojho zásahu

| Vec | Stav | Dôkaz |
|---|---|---|
| Schéma trialu na PROD | hotová | `agencies.trial_ends_at`, `agencies.created_via`, `account_signups`, `bootstrap_self_serve_agency`, trigger `agencies_guard_protected_columns` — všetkých 5 existuje (dotaz 2026-10-15) |
| Dĺžka trialu 14 dní | platí | `APP_TRIAL_DAYS` nie je v žiadnom Vercel prostredí nastavené → default 14 v `selfServeTrialDays()` a `getTrialDays()` |
| Registrácia nezakladá nič v Stripe | platí | `bootstrap_self_serve_agency` nepíše `stripe_customer_id`, `stripe_subscription_id` ani `subscription_status`; plán necháva na `Free`. Pinuje to test `trial-no-card.test.ts` |
| Vypnutie po 14 dňoch | platí | `trialGraceFrom()` → `limited` → `accessLevelFrom` → `read_only`; dáta zostávajú čitateľné a exportovateľné |
| Ceny v kóde | platia | `pricing-v2.ts`: 2500 / 6000 / 14900 / 34900 centov bez DPH |

## Krok 1 — skontroluj, či je samoobslužná registrácia naozaj zapnutá

`SELF_SERVE_SIGNUP_ENABLED` v projekte `realitka-ai` existuje pre Production,
ale je uložené ako *sensitive*, takže jeho hodnotu nevie prečítať nikto vrátane
mňa. Zapína len výslovné `true` / `1` / `on`.

Over to tak, že otvoríš `https://app.revolis.ai/register`. Ak je vlajka zapnutá,
v podnadpise je veta „14 dní zadarmo, bez platobnej karty…“ a formulár pýta
názov kancelárie a súhlas. Ak tam je stará veta o owner/agent, vlajka je
vypnutá a kampaň nemá kam posielať ľudí.

## Krok 2 — ceny v Stripe live

Produkty a ceny v live režime neexistujú (nemerané z môjho miesta — nemám a
nechcem mať live kľúč). Zakladá ich tento skript a **spúšťaš ho ty**:

```bash
# 1. pozri, čo by sa založilo (bez siete, bez kľúča)
python3 scripts/ops/stripe-v2/stripe_live_catalog.py

# 2. zisti ID účtu a či je naozaj live
STRIPE_LIVE_SECRET_KEY=... python3 scripts/ops/stripe-v2/stripe_live_catalog.py --inspect-account

# 3. založ chýbajúcich 10 produktov a 14 cien
STRIPE_LIVE_SECRET_KEY=... python3 scripts/ops/stripe-v2/stripe_live_catalog.py \
  --apply --yes-live \
  --expect-account acct_XXXXXXXX \
  --plan-tax-code txcd_XXXXXXXX --credit-tax-code txcd_XXXXXXXX \
  --output live-price-ids.json
```

Poistky, aby sa nedalo nič pokaziť: skript prijme výlučne `sk_live_` kľúč,
overí, že Stripe hlási `livemode` aj `charges_enabled`, porovná ID účtu s tým,
čo si zadal, a **nič existujúce nemení ani nemaže** — zakladá len to, čo chýba
(idempotentne podľa `lookup_key`). Keď nájde cenu s rovnakým `lookup_key`, ale
inou sumou, zastaví sa a nezmení nič.

Daňové kódy (`txcd_…`) si vyber v Stripe → Tax → Product tax codes: jeden pre
plány (softvér ako služba), jeden pre kredity. Bez nich skript nepokračuje,
lebo sumy sú bez DPH (`tax_behavior=exclusive`) a daň počíta Stripe.

## Krok 3 — Price ID do Vercelu

Skript na konci vypíše dvojice `STRIPE_PRICE_V2_* = price_…`. Nastav ich v
projekte `realitka-ai` pre Production. **Až keď sú nastavené všetky**, zapni
`PRICING_V2_ENABLED=true`. Opačné poradie znamená cenník v UI bez funkčného
tlačidla.

## Krok 4 — čo si overiť na živo (10 minút)

1. Registrácia na `/register` cez skutočnú adresu → príde potvrdzovací e-mail.
2. Po potvrdení: v SQL `select trial_ends_at, created_via, plan from agencies
   order by created_at desc limit 1;` → `trial_ends_at` ≈ dnes + 14 dní,
   `created_via = 'self_serve'`, `plan = 'Free'`.
3. V Stripe → Customers: **nový účet tam nesmie byť**. To je celý dôkaz
   k vete „nič sa neúčtuje automaticky“.
4. `/upgrade` → cenník ukazuje 25 / 60 / 149 / 349 € bez DPH.

## Čo zostáva nemerané

- Či je `SELF_SERVE_SIGNUP_ENABLED` naozaj `true` (hodnota je sensitive).
- Stav Stripe live katalógu (bez live kľúča sa opýtať nedá).
- `app.revolis.ai` je z môjho prostredia nedostupné (403 na CONNECT, a Vercel
  deployment vracia 401 — Vercel Authentication), takže HTTP overenie krokov
  1 a 4 patrí tebe.
