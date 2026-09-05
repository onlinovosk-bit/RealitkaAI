# Lane E — Pricing experiment

## Decisions
1. **Anchor on existing code prices** (program-tier-pricing.ts / pricing-v1.md) — do not invent new list tonight.
2. **Pilot hypothesis price for 5–10 broker office:** Team seats (71 EUR) × N + optional Owner Cockpit 349 EUR — label **HYPOTHESIS**; credit against subscription if founder chooses paid pilot.
3. **Outcome pricing deferred** — attribution not proven; seat+usage clearer for first pilots.
4. **Competitive steelman:** backOFFICE headline 95 EUR/year understates total (ZRKS+portals); Revolis monthly seat stack is higher cash — must sell time-to-lead / retention outcomes.

## Calculations (ex-VAT; Stripe/DPH NOT assumed configured)

| Seats | Tier | Seat subtotal | + Owner Cockpit 349 | Notes |
|---|---|---:|---:|---|
| 5 | team@71 | 355 | 704 | team minSeats=3 OK |
| 10 | office@63 | 630 | 979 | office minSeats=10 |
| 10 | team@71 | 710 | 1059 | if staying team tier |
| 20 | office@63 | 1260 | 1609 | |

Credits: monthly grants per pricing-v1; top-ups separate. Cockpit Lite 0 at 3+ seats.

Founder pool Owner Cockpit 249 noted in docs — special, not default list.

## Sensitivity
- If prospect already pays ZRKS+UC portals, incremental CRM budget may be 50–150 EUR/mo — **UNKNOWN**, needs discovery.
- If Revolis replaces labor of dual entry, WTP may exceed seat math — unproven.

## Evidence
- apps/crm/src/lib/program-tier-pricing.ts
- apps/crm/docs/pricing-v1.md
- Lane B competitor public prices

## Assumptions
- send_invoice / env price IDs may be unset in prod (PROD_UNKNOWN)

## Unknowns
- Actual collected ARPU reference client
- DPH treatment in quotes
- Whether cockpit enabled in Stripe

## Experiments
- Offer 4-week paid pilot: Team×5 + Cockpit Lite only; price HYPOTHESIS 355 EUR/mo credited 100% to year-1 subscription if convert; kill if <2 weekly active brokers.

## Product Implications
- No billing code changes tonight
- Pilot script must disclose hypothesis + credit rule

## Decision Memory Payload (DRAFT)
- 2026-09-05: Pricing experiment = existing seat stack; pilot HYPOTHESIS Team×N; no outcome pricing yet.