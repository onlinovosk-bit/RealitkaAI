# Morning report — Ruflo overnight research
**RUN_ID:** `20260905T2304-ruflo-overnight`  
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461` (`origin/main`)  
**Window:** 2026-09-05T23:04+02:00 → deadline 2026-09-06T07:00+02:00 (ASSUMED)  
**Scope:** `research_and_specs` only  
**Authority:** This RUN is SSOT for the founder GO launch. Sibling tree `output/overnight/2026-09-05T2308-CEST-research/` is **NON-AUTHORITATIVE** for this handoff (see AMD-J).

## Verdict: **NO_GO_IMPLEMENTATION**

Research waves completed with bounded unknowns. **Do not start product implementation** until CRITICAL phone-audit bypass and HIGH tenant NULL-agency gaps are repaired in a daytime eng PR (outside this overnight scope), and commercial VALIDATE_FIRST gates from AMD-I are met.

## Wave status
| Wave | Status |
|---|---|
| W0 | READY / PASS → STARTED |
| W1 A/B/C | PASS_WITH_CONDITIONS |
| W2 D/E | PASS_WITH_CONDITIONS |
| W3 F/G | PASS_WITH_CONDITIONS |
| W4 H/I/J | H=**STOP**, I/J=PASS_WITH_CONDITIONS |
| W5 K | PASS_WITH_CONDITIONS (amendments; unrepaired code risks → NO_GO) |
| W6 O6 | COMPLETE |

Lane statuses: {"A": "PASS_WITH_CONDITIONS", "B": "PASS_WITH_CONDITIONS", "C": "PASS_WITH_CONDITIONS", "D": "PASS_WITH_CONDITIONS", "E": "PASS_WITH_CONDITIONS", "F": "PASS_WITH_CONDITIONS", "G": "PASS_WITH_CONDITIONS", "H": "STOP", "I": "PASS_WITH_CONDITIONS", "J": "PASS_WITH_CONDITIONS", "K": "PASS_WITH_CONDITIONS", "O0": "PASS"}

## What we learned (actionable)
1. **Reuse first:** agencies/profiles, properties, leads, activities, scheduled_events, billing/credits, inbound Realsoft/UC import + crons exist (Lane A). Gaps: contacts table, deals entity, phone-value-release audit store, outbound portal publish.
2. **Competition:** Realsoft → Nehnuteľnosti Admin (listing admin ≠ CRM). backOFFICE public software from ~95€/yr + mandatory ZRKS API fees. Realman is **CZ** Kč SaaS. Control alt: Excel + Admin/export. WTP not web-provable (Lane B).
3. **Portals:** Nehnutelnosti/Reality/Topreality publish path is **United Classifieds vendor-gated**; no public XSD to invent. Pilot = inbound import first; outbound BLOCKED until vendor package (Lane C + AMD-H3).
4. **Architecture:** Keep Next/Supabase; evolve model (Contact≠Deal, phone DB-enforced reveal, portal job outbox) — Lane D superseded in parts by AMD-H1/H2.
5. **Pricing (code book):** seats 79/71/63 EUR; Scenario Lite N=5 → **355 EUR/mo**; with Owner cockpit higher. Pilot price = **HYPOTHESIS** only (Lane E). Stripe PROD unverified.
6. **GTM:** 5–10 design partners, gradual; primary metric must be business outcome not AI count; no outreach sent (Lane F). Commercial review forces VALIDATE_FIRST interviews before paid cohort (AMD-I).

## Why NO_GO_IMPLEMENTATION
- **F-H1 CRITICAL** still open in code: inventory/API selects expose phones without DB-enforced audited reveal (AMD-H1 is **spec supersession only**).
- **F-H2 HIGH** NULL `agency_id` tenant bypass under-scoped on leads/properties.
- UC outbound still vendor-BLOCKED.
- WTP / migration willingness unvalidated with live offices.

## Recommended next daytime move (not tonight)
1. Founder: accept ASSUMED launch params or override.
2. Eng PR (separate GO): strip phone selects + fail-closed reveal + widen tenant NULL fix (AMD-H1/H2).
3. Commercial: 5 discovery interviews per AMD-I before pricing pilot.
4. Vendor: request UC Import activation + schema package before any outbound BO.

## Evidence roots
- Package: `docs/overnight/2026-09-05-ruflo-swarm/`
- Run: `output/overnight/20260905T2304-ruflo-overnight/`
- Amendments: `.../amendments/`
