# Lane F — Pilot / acquisition (design partners)

- **RUN_ID:** `20260905T2304-ruflo-overnight`
- **Lane:** F (W3)
- **BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`
- **Depends on (frozen):** lanes D, E (context A/B/C)
- **Scope:** research_and_specs only — **no outbound sends**, no app code, no billing edits
- **Status:** `PASS_WITH_CONDITIONS`
- **Accessed:** 2026-09-05

## Executive recommendation

Run a **gradual design-partner program** of **8 agencies** (band 5–10), not a mass launch. Start with **Cohort 1 = 2–3** offices, expand only after weekly activation gates pass. Sell the **Lane E HYPOTHESIS** offer (Team × 5 + Cockpit Lite = **355 EUR/mo** ex-VAT list math, **credited** toward year-1 subscription) as a **paid learning contract**, not a public SKU. Position against the **CRM + lead-response job**, not against backOFFICE’s ~95 EUR/year software floor (Lane B steelman).

**Do not promise** multi-portal outbound publish, AI volume, or undefined lead-factory labels (C0/C1/C2 remain draft — Lane A). Use **plain lead-state names**. Treat **response-time SLA as a proposed working agreement**, not a claimed contractual obligation.

**Primary success metric (ONE):** median hours from **inbound lead capture → first broker-recorded contact attempt** (call / SMS / email logged on the lead), among leads created in pilot weeks 2–4. **Not** AI output count, credit spend, or feature clicks.

---

## Decision Contract

### 1. Decisions

#### F1 — Cohort size and gradual onboarding

| Cohort | N agencies | When | Gate to open next cohort |
|---|---:|---|---|
| **C1** | 2–3 | Week 0–1 invite → Week 1 start | ≥1 agency completes entry dataset + baseline sheet; ≥2 brokers log weekly activity |
| **C2** | +2–3 (total ≤6) | After C1 week-2 review | C1 median response metric measurable; no P0 data/tenant incident; founder capacity OK |
| **C3** | +2–4 (total **8**, hard cap **10**) | After C2 week-2 review | Same gates; stop at 8 unless founder explicitly expands to 10 |

**Do not** onboard all partners the same week. Parallelism max = support capacity (Lane E: weekday email/Slack only, no custom integrations).

#### F2 — Agency qualification (must / nice / disqualify)

**Must (all):**
1. SK real-estate office; hypothesis ICP **5–20 brokers** (START-HERE / Lane B) — allow 3–25 for interview, but pilot seats priced at **5** under HYPOTHESIS.
2. Named **decision-maker** who can approve paid pilot invoice (owner / konateľ / managing partner) — see F3.
3. Current stack stated honestly: Excel, Admin-only, backOFFICE+ZRKS, Realsys, other, or mix (Lane B set).
4. Willing to import or manually enter a **bounded entry dataset** (F4) and keep Revolis as **system of record for new inbound leads** during pilot (parallel Excel OK for archive, not for new lead clock).
5. Accepts **scope truth**: no guaranteed outbound multi-portal publish until UC Import activation (Lanes C/D); inbound/sample and CRM workflows only.
6. Accepts **HYPOTHESIS price disclosure** + credit-vs-subscription rule (Lane E) before kickoff.

**Nice:**
- Recent Realsoft → Admin migration pain (trigger, not requirement).
- ≥20 active listings OR ≥15 new inbound leads / month (self-report band OK).
- One broker champion + owner both available for weekly 30-min review.

**Disqualify / defer:**
- Wants only “cheaper than backOFFICE software” with no unpaid job (Lane B fail signal).
- Requires custom portal connectors or SLA penalties in week 1.
- Cannot name a payer / ghosting after two scheduling attempts.
- Demands outcome/success-fee pricing (Lane E: **DEFERRED**).
- Asks to scrape portals contrary to ToS (Lane C) — refuse.

#### F3 — Decision-maker map

| Role | Required in pilot? | Job |
|---|---|---|
| **Economic buyer** | Yes | Owner / konateľ — signs invoice, hears credit rule, convert discussion |
| **Champion** | Yes | Office manager or top broker — runs weekly rhythm, unblocks data |
| **Daily users** | ≥2 brokers | Log contact attempts; use leads + properties |
| **IT / portal admin** | Optional | Credentials for inbound feeds / Admin export; **not** a substitute buyer |

Outreach and interview scripts address **economic buyer first**; champion may gate calendar but cannot alone approve paid convert.

#### F4 — Entry dataset (bounded)

Per agency, before “week 1 clock” starts:

| Object | Minimum | Maximum (pilot) | Notes |
|---|---|---|---|
| Brokers (seats) | 2 active | 5 under HYPOTHESIS seats | Lane E Team×5 |
| Properties / listings | 10 | 50 | Prefer export from Admin/Excel; photos optional if URLs exist |
| Leads / contacts | 20 | 100 | Use existing `leads` model (Lane D — no new contacts table) |
| Historical viewings | 0 | 20 | Optional; `scheduled_events` if used |
| Portal credentials | — | — | Inbound/sample only if already held; **no** inventing UC activation |

Import path: manual CSV / existing universal import where CODE_PRESENT (Lane A) — **no custom ETL promises**.

#### F5 — Baseline (week 0, before product credit)

Capture **self-reported + sample evidence** (not invented CRM history):

1. Current stack + monthly software+portal spend **bands** (Lane B EXP-B1).
2. Self-reported **typical hours** from new lead notice → first human attempt (band: <1h / 1–4h / same day / next day / longer / unknown).
3. Last 10 inbound leads (anonymized): date noticed, date first attempt if known, channel — paper or spreadsheet OK.
4. Active broker count and who will use Revolis.
5. Top 3 unpaid pains (forced choice includes “none — stack OK”).

Store baseline in pilot workbook (founder-owned). Product instrumentation starts after entry dataset load.

#### F6 — Activation definition

Agency is **activated** when all are true:
1. Entry dataset loaded (F4 mins met).
2. ≥2 broker seats logged in within 7 days of kickoff.
3. ≥5 new or imported leads have a **recorded contact attempt** OR explicit “no attempt / reason” note in-week.
4. Economic buyer confirms understanding of HYPOTHESIS price + credit rule (checkbox on kickoff notes).

#### F7 — Weekly rhythm (4-week pilot aligned to Lane E stop)

| When | Cadence | Owner |
|---|---|---|
| Kickoff (60–90 min) | Once | Founder + buyer + champion |
| Async support | Weekday business hours (SK) | Founder / support — Lane E scope |
| **Weekly review (30 min)** | Same weekday each week | Champion + founder; buyer joins weeks 2 and 4 |
| Mid-pilot price cards (optional) | Week 2–3 after workflow demo | EXP-E2 / EXP-B2 — record yes/no paid intent |
| Convert discussion | End week 4 or earlier if activated | Economic buyer |

Weekly review agenda (fixed): (1) primary metric flash, (2) blockers, (3) dataset gaps, (4) scope reminders (no undeliverable portal promises), (5) kill/continue check.

#### F8 — ONE primary outcome metric

**Name:** `lead_first_attempt_latency_hours`  
**Definition:** For each lead with `source` = inbound (form, call-in, portal inquiry logged as new) created in pilot weeks **2–4**, compute  
`hours = timestamp(first_broker_contact_attempt) − timestamp(lead_captured)`  
using **business-hours optional overlay** only as a secondary cut; primary report is **raw hours** plus a **business-hours variant** labeled as proposed SLA view.  
**Aggregation:** **median** across qualifying leads per agency; program rollup = median of agency medians (equal agency weight).  
**Attempt** = broker-logged call, SMS, or email on the lead (or `scheduled_events` viewing booked counting as attempt only if explicitly agreed at kickoff — default **communication attempt**, not viewing).  
**Exclusions:** test leads; leads marked spam; leads with buyer-requested delay.

**Why this metric:** Matches the job “faster, accountable response to new demand” without relying on AI generation counts, credit burn, or closed-deal attribution (blocked while outbound UC / outcome pricing deferred — Lanes C/E).

**Hypothesis targets (not guarantees):**
- Program: ≥ **3 of first 5 activated agencies** show median raw latency **≤ 8 hours** OR **≥ 40% improvement** vs week-0 self-reported band midpoint.
- Per Lane E commercial pass (separate): ≥1 agency pays ≥1 pilot month **and** schedules convert discussion with credit rule understood.

**Secondary (not primary):** weekly active brokers (≥2), paid pilot conversion intent, listing count maintained — diagnostics only.

#### F9 — Plain lead states (no C1)

Do **not** use C0/C1/C2 in partner-facing materials (Lane A: draft / awaiting founder GO).

Partner-facing states (map internally later if GO):

| State name | Meaning |
|---|---|
| **New** | Captured; no attempt yet |
| **Attempted** | ≥1 contact attempt logged |
| **Reached** | Two-way contact confirmed by broker |
| **Qualified conversation** | Broker marks substantive discovery call/meeting done |
| **Nurture / Wait** | Timing/objection; stay in CRM |
| **Closed won / Closed lost** | Terminal for this opportunity |
| **Spam / Invalid** | Excluded from metric |

#### F10 — Response-time proposal (not an obligation)

**Proposal for kickoff discussion (owner: founder; calendar: Slovakia business days Mon–Fri 09:00–17:00 Europe/Bratislava):**

> “We propose aiming for a **first contact attempt within 4 business hours** of lead capture during the pilot, or by **next business morning** if captured after 15:00. This is a **working target for learning**, not a contractual SLA, penalty clause, or uptime commitment.”

Document acceptance as “agreed working target / declined / modified to ___.” **Do not** publish as product SLA until founder + reference ops GO (Lane A unknown).

#### F11 — Commercial envelope (from Lane E — do not renegotiate overnight)

- **Offer:** HYPOTHESIS Team × 5 + Cockpit Lite = **355 EUR/mo** (ex-VAT list math).
- **Credit:** 100% of paid pilot months credited to first 12 months subscription (same agency); unused expires at month 12 of paid term.
- **Billing:** Prefer manual invoice / send_invoice until Stripe PROD verified (Lane A/E).
- **Support:** Weekday email/Slack; onboarding checklist; **no** custom integrations; **no** outbound multi-portal publish until UC package+activation.
- **Smolko grandfather 199 €:** do not touch; **do not name** reference clients in outreach.

#### F12 — Exit / kill criteria

**Kill agency (stop investing time):**
- After 14 days: still not activated (F6).
- Week 2–4: **<2** distinct brokers with weekly active use (Lane E stop) for two consecutive weeks.
- Buyer refuses price/credit disclosure or demands undeliverable portal/AI guarantees.
- Security/tenant incident attributable to mishandling; or ToS-violating scrape request insisted upon.

**Kill / pause program:**
- After **6 completed interviews** (EXP-B1 overlap): ≥50% say backOFFICE+ZRKS enough with **no unpaid pain** (Lane B kill) → pause paid GTM; rethink job.
- After first **3 paid pilots**: **0** convert discussions scheduled → redesign offer/scope before more cohorts (Lane E fail signal); **do not** silently cut list price in code.
- UC/vendor still blocked **and** majority of prospects’ #1 must-have is outbound publish → keep CRM pilot only for offices whose #1 is lead-response/CRM; park “publish-led” segment.

**Graduate / convert:** Activated + primary metric review done + invoice paid ≥1 month + convert discussion held → subscription path with credit rule.

#### F13 — Lane verdict

**`PASS_WITH_CONDITIONS`** — executable 5–10 partner plan with metric, rhythm, drafts, and kills; conditions = nothing sent externally tonight; WTP unproven; Stripe PROD unverified; outbound publish out of scope; C0/C1/C2 undefined; no live partner list committed.

---

### 2. Evidence

| Claim | Evidence |
|---|---|
| Gradual pilot + no outbound sends required by package | `docs/overnight/2026-09-05-ruflo-swarm/START-HERE.md` Lane F; `lanes.json` lane F notes |
| Architecture reuse / no Nest; leads + scheduled_events; portal outbox later | `lanes/D/report.md` Decisions D1–D9 |
| HYPOTHESIS 355 / Team×5 / credit / support / 4-week stop | `lanes/E/report.md` Pilot experiment; `lanes/E/result.json` `pilot_hypothesis` |
| backOFFICE+ZRKS steelman; Excel control; EXP-B1 interviews | `lanes/B/report.md` Decisions + Experiments |
| UC outbound blocked; no invented XSD; ToS consent for third-party | `lanes/C/report.md` |
| C0/C1/C2 + SLA draft only; phone audit GAP | `lanes/A/report.md` Decisions 6, 9 |
| ICP 5–20 hypothesis | START-HERE; Lane B framing |
| Pricing SSOT seats 71 team | `apps/crm/src/lib/program-tier-pricing.ts` @ BASE_SHA (via Lane E) |

### 3. Assumptions

1. Design partners can be recruited from founder network / warm SK agency intros without naming existing clients in templates.
2. Brokers will log contact attempts if weekly review enforces the metric (behavior change is the product test).
3. 4-week window is long enough to measure first-attempt latency, not closed-deal ROI.
4. Manual invoice is acceptable for ≤10 pilots while Stripe PROD remains unverified.
5. “Inbound lead” is identifiable in-agency (form, phone, portal notification pasted into CRM).

### 4. Unknowns

| Unknown | Owner | Blocks |
|---|---|---|
| Named prospect list / warm intro availability | Founder | Starting Cohort 1 dates |
| True WTP at 355 vs Realsys/backOFFICE anchors | Founder via EXP-B2/E2 | Scaling beyond design partners |
| Stripe Production checkout readiness | Billing / founder | Self-serve claim |
| UC Import activation timing | Vendor / founder | Publish-led segment |
| Whether phone value-release audit required before pilot | Founder / legal | Compliance scope (Lane D) |
| Founder GO on lead-factory C0/C1/C2 + SLA number | Founder | Renaming plain states later |
| DPH presentation on invoices | Finance | Quote wording |

### 5. Experiments

1. **EXP-F1 — Design partner funnel (this plan):** Invite 12–15 qualified offices → target **8** starts in 3 cohorts. Metric: activation rate; kill per F12.
2. **EXP-F2 — Primary metric:** Instrument/manual tally `lead_first_attempt_latency_hours` weeks 2–4. Pass: F8 targets. Stop: cannot obtain attempt timestamps after 2 weekly reviews → fix logging UX before more cohorts.
3. **EXP-F3 — Interview pack (align EXP-B1):** 30-min structured interviews (script below) with **N=8–12** principals; ≥6 complete before heavy Cohort 2 spend.
4. **EXP-F4 — Price cards (align EXP-E2/B2):** After demo of lead capture→attempt workflow, show anchors ~54–66 EUR/mo (backOFFICE+ZRKS floor), 210 (Realsys Pro), 355 (Revolis HYPOTHESIS). Record paid-pilot yes/no — **not** web-proof.

### 6. Product Implications

| Area | Reuse | Change (later) | Defer / do not promise |
|---|---|---|---|
| CRM objects | leads, properties, activities, scheduled_events (D) | Lightweight attempt logging UX if missing | New contacts/deals; AI satellites as CRM |
| Portal | Inbound/sample only | Outbox publish after UC unlock (D/C) | Multi-portal publish in pilot pitch |
| Pricing | List SSOT + HYPOTHESIS envelope (E) | Manual invoice ops | Outcome fees; list price code edits |
| Metrics | Plain states (F9) | Optional later map to C0/C1/C2 if GO | Shipping C1 as if defined |
| GTM | Gradual cohorts | Founder-led weekly reviews | Mass outbound email blast tonight |

### 7. Decision Memory Payload (draft)

```yaml
decision_id: 2026-09-05-lane-F-pilot-acquisition
run_id: 20260905T2304-ruflo-overnight
lane_id: F
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
status: PASS_WITH_CONDITIONS
design_partners:
  target: 8
  band: [5, 10]
  cohorts: [2-3, +2-3, +2-4]
primary_metric: lead_first_attempt_latency_hours
primary_metric_agg: median
not_primary: [ai_output_count, credit_spend, feature_clicks]
commercial_hypothesis_eur_mo: 355
seats: 5
lead_states_partner_facing: [New, Attempted, Reached, Qualified conversation, Nurture/Wait, Closed won, Closed lost, Spam/Invalid]
c1_usage: forbidden_until_founder_GO
sla: proposal_only_4_business_hours_or_next_morning
sla_owner: founder
sla_calendar: Europe/Bratislava_business_days
outbound_sends_this_lane: none
kill_program_if:
  - ">=50% interviews no unpaid pain (Lane B)"
  - "0 convert discussions after 3 paid pilots"
conditions:
  - nothing_sent_externally
  - wtp_unproven
  - stripe_prod_unverified
  - no_outbound_uc_publish_promise
  - no_client_names_in_templates
next_action: "Founder fills prospect list offline; Cohort 1 invites only after human GO — do not send from this run"
```

---

## Interview script (30 min) — draft, no client names

**Goal:** Validate unpaid job + stack + spend bands + switch triggers. Not a demo pitch dump.

1. **Context (2 min):** “Research interview on how SK offices handle new inquiries and listings. Not a sales call; you can stop anytime.”
2. **Stack (5):** What do you use today for clients, listings, portal publish? (Excel / Admin / backOFFICE / Realsys / other). What broke last when tools changed?
3. **Lead flow (8):** Walk last memorable inbound lead — how you noticed it, who attempted contact, how it was recorded. Typical delay band?
4. **Pain force-rank (5):** Pick top 3 or “no real pain.” Include option: “current stack is enough.”
5. **Spend bands (3):** Monthly software + portal advertising — bands only; UNKNOWN OK.
6. **Switch history (4):** Last time you evaluated switching CRM? What killed it?
7. **Close (3):** Willing to try a **paid 4-week** pilot at a disclosed hypothesis price with credit to subscription if value appears? Yes / maybe / no — reason.

**Record:** stack codes, latency band, top pains, switch blockers, paid-pilot lean. Preserve “would stay on Excel/Admin” narratives (Lane B).

---

## Outreach draft — email / LinkedIn (DO NOT SEND from this run)

**Subject:** Rýchlosť prvého kontaktu na nových leadoch — krátky research rozhovor

**Body:**

Dobrý deň,

pripravujeme krátky výskum (30 min) medzi majiteľmi SK realitných kancelárií s približne 5–20 maklérmi: ako dnes zachytávate nové dopyty, kto volá prvý a kde to evidujete (Excel, Admin, CRM…).

Nie je to hromadná ponuka ani sľub integrácií na portály. Ak budete ochotní, rád si vypočujem váš reálny postup a bolesti — aj príbeh „súčasný stack nám stačí“ je pre nás užitočný.

Ak bude zo strany kancelárie záujem o neskorší platený pilot, podmienky (rozsah, cena označená ako hypotéza, čo nie je v scope) povieme vopred písomne — bez záväzku z tohto mailu.

Ďakujem za zváženie termínu.

S pozdravom,  
[Founder name]  
Revolis

**Rules for any human send later:** no reference-client names; no “we already publish to all portals”; no AI volume guarantees; no contractual SLA language; HYPOTHESIS price only after interest; GDPR — use existing lawful contact basis.

---

## Kickoff checklist (per agency)

1. Qualification confirmed (F2) + buyer identified (F3).  
2. HYPOTHESIS 355 + credit rule + support/stop limits read aloud.  
3. Scope exclusions: outbound UC publish, custom work, outcome fees, C1 jargon.  
4. Response-time **proposal** accepted/declined/modified (F10).  
5. Entry dataset mins (F4) + baseline (F5).  
6. Weekly review slot booked for 4 weeks.  
7. Plain state names sheet shared (F9).  
8. Explicit: **nothing in this overnight package was sent to the partner.**

---

## Lane status

**PASS_WITH_CONDITIONS** — plan is executable; external execution awaits human GO and prospect list. Three artifacts: `report.md`, `sources.json`, `result.json`.
