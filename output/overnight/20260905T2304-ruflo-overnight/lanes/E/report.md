# Lane E — Pricing experiment

**RUN_ID:** `20260905T2304-ruflo-overnight`  
**Lane:** E  
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`  
**Depends on:** A (repo/billing reuse), B (competitor public prices), C (portal UC — commercial fees UNKNOWN)  
**Scope:** research_and_specs only — **no billing code changes**  
**Status:** `PASS_WITH_CONDITIONS`

All EUR figures below are **list math from repo SSOT** (`program-tier-pricing.ts` / `pricing-v1.md`), **ex-VAT unless noted**. They are **not** market-proven WTP. Stripe Production price IDs remain **PROD_UNKNOWN** (Lane A).

---

## Decisions

1. **Anchor on existing `PLAN_PRICES_EUR`** — solo **79**, team **71**, office **63** EUR/seat/mo. Do **not** invent a new public list overnight.
2. **Natural tier for ICP sizes:** 5 → **team** (minSeats=3); 10 / 20 → **office** (minSeats=10). Alt: stay on team at 10/20 for richer credit grant (25 vs 20 /seat).
3. **Primary commercial unit for pilots = seat + agency cockpit + optional credit top-up** (agency+usage). **Outcome / success-fee pricing = deferred** until attribution is proven (Lane A gaps on portal publish; Lane C UC blocked).
4. **One pilot offer marked HYPOTHESIS** (below): Team×5 + Cockpit Lite = **355 EUR/mo**, with **credit vs subscription**, narrow support, and **stop limit**. Not a permanent SKU change.
5. **Cost floor ≠ market-proven price.** Internal credit retail mirror (~0,86 €/kr in cost views) and LLM cost logs are accounting guards, **not** proof that agencies will pay list seats.
6. **Competitive steelman (Lane B):** backOFFICE software ~**95 EUR/year** (+ mandatory ZRKS API **415–554 EUR/year**) undercuts “monthly SaaS is normal.” Revolis seat stacks (**355 / 630 / 1260** at Lite) must sell a **job** (CRM + retention / time-to-lead), not “cheaper software.” Realsys public **210–349 EUR/mo** and AutoCRM **od 129 EUR/mo** are existence anchors only — **not** Revolis WTP.
7. **Smolko grandfather** `manual_plan market_vision 199 €` — **do not touch** (pricing-v1 guardrail).
8. **Lane verdict: PASS_WITH_CONDITIONS** — full 5/10/20 math computable from SSOT; conditions = Stripe PROD unverified, WTP unproven, portal commercial fees UNKNOWN, outcome pricing not ready.

---

## Explicit scenarios (monthly, agency total)

**Constants from SSOT**

| Component | EUR |
|---|---:|
| Solo / Team / Office seat | 79 / 71 / 63 |
| Cockpit Lite (≥3 seats) | 0 |
| Owner Cockpit | 349 (founder pool 249 if eligible) |
| Owner Cockpit Pro | 499 (**disabled**) |
| Credit grant /seat | solo 30 / team 25 / office 20 |
| Featured top-up “Rast” | 129 for 150 credits (one-time; usage layer) |

### Scenario A — Seat + Cockpit Lite (default list floor)

| Brokers (N) | Tier @ EUR/seat | Seats EUR | Cockpit | **Full price EUR/mo** | Monthly credit grant |
|---:|---|---:|---:|---:|---:|
| **5** | team @ 71 | 355 | Lite 0 | **355** | 125 |
| **10** | office @ 63 | 630 | Lite 0 | **630** | 200 |
| **20** | office @ 63 | 1260 | Lite 0 | **1260** | 400 |

### Scenario B — Seat + Owner Cockpit 349 (agency+analytics attach)

| N | Seats | + Owner 349 | **Full EUR/mo** | Grant (seats + 100) |
|---:|---:|---:|---:|---:|
| **5** | 355 | 349 | **704** | 225 |
| **10** | 630 | 349 | **979** | 300 |
| **20** | 1260 | 349 | **1609** | 500 |

Founder Owner Cockpit 249 (if pool eligible): **604 / 879 / 1509** for N=5/10/20.

### Scenario C — Agency + usage (Lite + one Rast top-up in the month)

Illustrative **upper cash** if grant is burned and owner buys featured top-up once (not automatic):

| N | Lite seats | + Rast 129 | **Full EUR that month** |
|---:|---:|---:|---:|
| **5** | 355 | 129 | **484** |
| **10** | 630 | 129 | **759** |
| **20** | 1260 | 129 | **1389** |

Auto-recharge default cap 500 EUR/mo (opt-in) is a **stop rail**, not expected ARPU.

### Scenario D — Outcome / success fee

**DEFERRED — not offered.** No verified attribution path for “closed deal → Revolis fee” while outbound UC publish is blocked (Lane C) and portal commercial fees are UNKNOWN. Any outcome number tonight would be fiction.

### Alt tier (stay on team at 10/20)

| N | team@71 seats | + Owner 349 |
|---:|---:|---:|
| 10 | 710 | 1059 |
| 20 | 1420 | 1769 |

Landing SKU check: `LANDING_ENTERPRISE_TEAM_PACK_EUR` = **355** = 5 × 71 (aligned with Scenario A @ N=5).

---

## Unit comparison vs Lane B competitors

| Stack | Public unit | Approx monthly cash (software only) | vs Revolis Lite 5/10/20 |
|---|---|---|---|
| backOFFICE standard | 95 EUR/yr (+VAT→116,85) | ~8 EUR/mo | Revolis **~45–160×** higher software cash at Lite |
| backOFFICE + ZRKS API non-member | 95 + 554 = 649 EUR/yr | ~54 EUR/mo | Revolis Lite still **~6.5× / 11.6× / 23×** (5/10/20) |
| Realsys Professional / Enterprise / Web Pro | 210 / 270 / 349 EUR/mo | agency flat | Revolis Lite 355 sits **above** Pro, **near** Web Pro at N=5; at N=10/20 Revolis is **higher** |
| AutoCRM | od 129 EUR/mo unlimited users | agency flat | Revolis Lite 355+ is **higher**; AutoCRM not evidenced as SK portal stack |
| Realman Master (CZ Kč) | 2378 Kč/mo ex-VAT | ~90–100 EUR/mo **CZ only** | Per-seat SaaS culture exists in CZ; **SK availability UNKNOWN** — do not use as SK list proof |
| Excel + Admin | ~0 software | portal fees UNKNOWN | Rational stay path; Revolis must beat **switching cost** |

**Per-broker Revolis Lite:** 71 (N=5) / 63 (N=10,20) EUR/broker/mo.

**Implication:** list seats are a **premium hypothesis**, not a cost-floor or incumbent-match price. Message must clear the backOFFICE+ZRKS steelman or lose on price alone.

---

## Model comparison (seat vs agency+usage vs outcome)

| Model | Fit for first pilots | Risk |
|---|---|---|
| **Seat** | Clear, matches SSOT + landing 355 pack | Looks expensive vs backOFFICE annual floor |
| **Agency + usage** (seats + grants + top-ups) | Matches code (agency credit pool); usage upside without rewriting billing | Variable bill → trust risk; Stripe top-ups PROD_UNKNOWN |
| **Outcome** | Attractive narrative | **Blocked** — attribution + portal truth unproven |

**Recommendation:** sell **Scenario A** (or B if owner wants Cockpit) as list; run **one HYPOTHESIS pilot** below; keep outcome off the table until UC + attribution exist.

---

## Pilot experiment price (HYPOTHESIS)

| Field | Value |
|---|---|
| **Label** | `HYPOTHESIS` — not a committed public SKU change |
| **Offer** | Team × **5** seats + Cockpit Lite |
| **Cash price** | **355 EUR/mo** (ex-VAT list math) |
| **Credit vs subscription** | 100% of paid pilot months **credited** against first **12 months** of converted subscription (same agency); unused credit expires at month 12 of paid term |
| **Support scope** | Weekday email/Slack business hours; onboarding checklist; **no** custom integrations; **no** outbound multi-portal publish until UC package+activation (Lane C); inbound sample-gated only |
| **Included usage** | Monthly grant only (5×25 = **125** credits); top-ups optional at list; auto-recharge **off** unless owner opts in |
| **Stop limit** | End after **4 weeks** OR kill if **<2** distinct brokers with weekly active use OR prospect refuses paid convert after credit disclosure |
| **Billing path** | Prefer **manual invoice / send_invoice** until Stripe PROD price IDs verified; do not claim self-serve checkout works |
| **Pass signal (feeds Lane F)** | ≥1 agency pays ≥1 pilot month **and** schedules convert discussion with credit rule understood |
| **Fail signal** | Price anchored only to “backOFFICE is 95/yr” with no unpaid job-to-be-done → do not lower list in code; redesign offer/scope first |

---

## Evidence

- `apps/crm/src/lib/program-tier-pricing.ts` @ BASE_SHA (`PLAN_PRICES_EUR`, `COCKPIT_PRODUCTS`, grants, top-ups, landing 355)
- `apps/crm/docs/pricing-v1.md` @ BASE_SHA (stack + Smolko 199 guardrail + cost view note)
- Control mirrors: `control/note-pricing-src.txt`, `control/note-pricing-docs.txt`
- Lane A: billing reuse YES; Stripe **PROD_UNKNOWN**
- Lane B: competitor public prices / steelman
- Lane C: UC commercial pricing **UNKNOWN**; outbound publish blocked → outcome pricing deferred

---

## Assumptions

- ICP ~5–20 brokers is a planning hypothesis (Lane B), not measured TAM.
- Quotes stay ex-VAT unless finance specifies DPH treatment.
- Founder Cockpit 249 only if `FOUNDER_KANCELARIE_POOL_*` eligibility still true at offer time.
- “Full price” = seats + selected cockpit + optional one top-up; excludes commercial portal advertising fees (UNKNOWN).

---

## Unknowns

- Stripe Production `price_*` wiring and checkout readiness
- Reference-client collected ARPU (Smolko grandfather ≠ new-logo WTP)
- DPH treatment on customer quotes
- Commercial portal / UC Import activation fees (Lane C)
- True WTP (requires Lane B EXP-B2 / Lane F interviews)
- Whether Owner Cockpit attach is necessary for pilot value perception

---

## Experiments

1. **EXP-E1 (this HYPOTHESIS):** 4-week Team×5 @ 355 with credit-to-subscription rule; stop limits above.
2. **EXP-E2 (price cards, with F):** After demo, cards at ~backOFFICE+ZRKS annualized (~54–66 EUR/mo software+API floor), Realsys 210, Revolis Lite 355/630 — record paid-pilot yes/no (Lane B EXP-B2).
3. **Do not** change `program-tier-pricing.ts` from overnight research.

---

## Product Implications

1. No billing / Stripe / pricing code edits in this run.
2. Pilot scripts and morning handoff must label **355** as **HYPOTHESIS** + credit rule + support/stop limits.
3. Positioning: beat **CRM + workflow job**, not incumbent software floor.
4. Keep Smolko 199 grandfather untouched.
5. Feed F (pilot acquisition) and G (backlog): commercial terms only; Stripe verify is ops/founder, not overnight invent.

---

## Decision Memory Payload (draft)

```yaml
decision_id: 2026-09-05-lane-E-pricing-experiment
run_id: 20260905T2304-ruflo-overnight
lane_id: E
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
status: PASS_WITH_CONDITIONS
ssot: apps/crm/src/lib/program-tier-pricing.ts
list_seats_eur: {solo: 79, team: 71, office: 63}
full_price_lite_eur_mo: {5: 355, 10: 630, 20: 1260}
full_price_owner_cockpit_eur_mo: {5: 704, 10: 979, 20: 1609}
pilot_hypothesis:
  seats: 5
  tier: team
  cockpit: lite
  price_eur_mo: 355
  credit_vs_subscription: "100% pilot months → year-1 subscription"
  support: "weekday email/Slack; no custom; no outbound UC publish"
  stop_limit: "4 weeks OR <2 weekly active brokers"
models:
  preferred: seat_plus_optional_usage
  deferred: outcome
conditions:
  - stripe_prod_unverified
  - wtp_unproven
  - cost_floor_not_market_price
  - no_billing_code_changes
next_action: "Hand HYPOTHESIS 355 + 5/10/20 matrix to Lane F; keep list SSOT frozen"
```
