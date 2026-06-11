# Revolis Pricing Stack v1.0

**Stav:** implementácia (PR-1 → PR-4) · **Zdroj pravdy pre kód:** `apps/crm/src/lib/program-tier-pricing.ts`

---

## Vrstva 1 — Seaty (per maklér/mes, `send_invoice`)

| Tier   | Cena | Min. seatov | Mesačný grant kreditov/seat |
|--------|------|-------------|------------------------------|
| SOLO   | 79 € | 1           | 30                           |
| TEAM   | 71 € | 3           | 25                           |
| OFFICE | 63 € | 10          | 20                           |

Env: `STRIPE_PRICE_SOLO_SEAT`, `STRIPE_PRICE_TEAM_SEAT`, `STRIPE_PRICE_OFFICE_SEAT`

---

## Vrstva 2 — Cockpit (per agentúra/mes, agency entitlement)

| Produkt           | Cena  | Grant | Podmienka                         |
|-------------------|-------|-------|-----------------------------------|
| COCKPIT LITE      | 0 €   | —     | automaticky pri 3+ seatoch        |
| OWNER COCKPIT     | 349 € | 100   | vyžaduje 3+ aktívne seaty         |
| OWNER COCKPIT PRO | 499 € | 200   | **disabled** — čaká legal + build |

- **LITE** = morning-brief e-mail + základné KPI (existujúci cron).
- **COCKPIT** = plný dashboard, pipeline, výkon/maklér, forecasting, AI odporúčania, kreditový monitoring.
- Cockpit features **nemíňajú** kredity.
- **Founder pool:** Owner Cockpit **249 €/mes** navždy (`FOUNDER_KANCELARIE_POOL_*`).

Env: `STRIPE_PRICE_OWNER_COCKPIT` (recurring, qty 1, `send_invoice`)

---

## Vrstva 3 — Kredity (agency pool, 1 kredit ≈ 1 € mentálny model)

### Spotrebný cenník

| Akcia                 | Kredity |
|-----------------------|---------|
| Lead unlock           | 4       |
| AI analýza leadu      | 1       |
| AI e-mail             | 1       |
| AI popis nehnuteľnosti| 2       |

### Top-up balíčky (one-time, karta cez Checkout)

| Balíček | Kredity | Cena  | Stripe env                      |
|---------|---------|-------|---------------------------------|
| Štart   | 50      | 49 €  | `STRIPE_PRICE_CREDITS_START`    |
| Rast    | 150     | 129 € | `STRIPE_PRICE_CREDITS_RAST` ⭐   |
| Pro     | 500     | 379 € | `STRIPE_PRICE_CREDITS_PRO`      |
| Mega    | 1500    | 999 € | `STRIPE_PRICE_CREDITS_MEGA`     |

### Pravidlá

- **Grantované** kredity expirujú posledný deň kalendárneho mesiaca.
- **Kúpené** kredity neexpirujú.
- Poradie míňania: najprv grant, potom kúpené (FIFO v rámci typu).
- **Agency pool** — žiadne per-seat zostatky.
- **Auto-recharge:** OPT-IN owner; prah 20 % mesačného grantu; default balík Rast; strop 500 €/mes.
- Pri 20 % zostatku: notifikácia ownerovi (e-mail + Cockpit).

---

## Vrstva 4 — Add-ony (purchasable)

- `crmSync` 49 €/mes · `whiteLabel` 299 €/mes
- Legacy add-ony (`leadsEngine`, `marketIntelligence`, `protocolAI`, `activeForceCalls`) mimo predajného UI.

---

## Guardrails

| Pravidlo | Detail |
|----------|--------|
| Metriky | Cockpit attach >40 %, NRR >110 %, credit revenue 10–25 % — mimo pásma = pricing review |
| Smolko | `manual_plan market_vision 199 €` grandfathered — **NEDOTÝKAŤ SA** |
| Verejná zmena cien | landing + demo + Stripe + kód v **jednom** release |
| White Label / Marketplace | roadmapa, nie tento release |
| NEDOTÝKAŤ SA | `canUseFullApp`, auth, existujúce Smolko billing flows |

---

## Grant Engine (PR-2)

- **Crons (handler v kóde):** `GET /api/cron/credits-grant` (1. deň mesiaca 06:00 UTC), `GET /api/cron/credits-expire` (1. deň mesiaca 05:00 UTC — sweep grantov predchádzajúceho mesiaca).
- **Idempotencia:** `grant:{agency_id}:{YYYYMM}` a `grant_expiry:{agency_id}:{YYYYMM}` v `credit_ledger.idempotency_key`.
- **SQL:** `spend_credits(agency, amount, reason, idempotency_key)` — atomicky míňa grant pool pred purchase pool; migrácia `20260611000003_spend_credits.sql`.
- **Ledger source:** `grant` | `purchase`; legacy riadky (mimo `monthly_grant` / `grant_expiry`) backfill `purchase`.

## PR mapa

| PR | Scope |
|----|-------|
| PR-1 | `program-tier-pricing.ts` + unit testy + tento dokument |
| PR-2 | `credit_ledger.source`, grant crons, `spend_credits`, testy idempotencie |
| PR-3 | `ai_action_audit` cost + denný agregát |
| PR-4 | Stripe checkout (seat, cockpit, top-up) + Andy runbook |

---

## Andy — manuálne kroky (PR-4)

1. **Stripe Dashboard** — vytvoriť produkty (archivovať legacy len po smoke):
   - 3× Seat recurring (79/71/63 per unit/month)
   - 1× Owner Cockpit recurring 349 €/mes
   - 4× Credit top-up one-time (49/129/379/999)
2. **Vercel env** (Production + Preview):
   - `STRIPE_PRICE_SOLO_SEAT`, `TEAM_SEAT`, `OFFICE_SEAT`
   - `STRIPE_PRICE_OWNER_COCKPIT`
   - `STRIPE_PRICE_CREDITS_START|RAST|PRO|MEGA`
3. **Supabase migrácie** (poradie):
   - `20260602_agency_billing_and_credits.sql` (ak ešte nie)
   - `20260611000001_credit_ledger_source.sql` (PR-2)
   - `20260611000003_spend_credits.sql` (PR-2)
   - `20260611000002_ai_action_audit_cost.sql` (PR-3)
4. **Smoke:** seat checkout → webhook → `agencies.seats` + grant cron 1. deň mesiaca.
