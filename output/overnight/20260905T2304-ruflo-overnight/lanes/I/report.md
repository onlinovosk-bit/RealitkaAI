# Lane I — Commercial independent review (opponent)

- **RUN_ID:** `20260905T2304-ruflo-overnight`
- **Lane:** I (W4 commercial opponent)
- **BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`
- **Reads (frozen authors only):** lanes F, G, E, B — **no edits** to author files
- **Scope:** research_and_specs adversary review
- **Accessed:** 2026-09-05
- **Verdict:** `PASS_WITH_CONDITIONS`

## Executive verdict

Authors correctly label **VALIDATE_FIRST**, mark **355 EUR as HYPOTHESIS**, defer outcome pricing, and keep Excel/backOFFICE steelman visible. That honesty is necessary but **not sufficient** to clear a commercial go for paid Cohort 1 or eng BUILD of the G cut.

The package still risks spending founder cash and eng weeks on a **job that is hypothesized, not falsified**, at a **~6.5× software+API floor** vs backOFFICE+ZRKS, while the primary success metric **cannot attribute revenue**. Commercial opponent does **not STOP** the research package (authors already refuse BUILD/self-serve/list edits), but **conditions must harden sequencing**: unpaid-job interviews and migration-cost evidence **before** paid pilots and before G eng GO beyond safety hygiene.

---

## Critique axes (required)

### 1. Buy reason

**Claim under review (F/E/B):** Agencies buy Revolis for the **CRM + accountable lead-response** job, not cheaper software.

**Adversary:** Buy reason is **narrative-complete, evidence-empty**. Lane B's own kill (>=50% of >=6 interviews: backOFFICE+ZRKS enough / no unpaid pain) is the right falsifier — **and it has not run**. F still plans C1 paid starts after qualification checkboxes, not after that kill. Positioning against lead-response while **outbound multi-portal publish is out of scope** may leave the strongest historical switch trigger (publish-once / Realsoft gap) unserved; remaining job may be habit change (log attempts), which is a **behavior tax**, not a pull.

**Fix:** Gate any paid invoice and any non-hygiene eng BO on **EXP-B1/F3 pass** (>=6 interviews; kill if >=50% no unpaid pain). Preserve "stack is enough" narratives as first-class outcomes.

### 2. Price vs value

**Claim:** HYPOTHESIS Team×5 + Lite = **355 EUR/mo** (list math) with 100% credit to year-1 subscription; Realsys 210–349 existence anchors.

**Adversary:** Vs Lane B/E steelman, backOFFICE+ZRKS ≈ **~54 EUR/mo** equivalent cash → Revolis Lite@5 is **~6.5×**. Credit softens **cash timing**, not **value equation**. Buyer still compares annual software floors unless Revolis proves hours saved or deals kept. E pass signal (>=1 agency pays >=1 month **and** schedules convert discussion) is **weak WTP** — credit + founder relationship can buy a polite month. List SSOT freeze is correct; treating 355 as learnable without a **no-credit** arm understates price power.

**Fix:** Keep 355 labeled HYPOTHESIS; add **EXP-I1** (strengthen E2): after workflow demo, card **with and without** credit; require recording at least one **non-warm** principal accept/refuse paid month **without** credit. Do not cut `program-tier-pricing.ts` on fail; redesign job/scope first (E fail signal — keep).

### 3. Migration cost

**Claim:** F4 bounded entry (10–50 properties, 20–100 leads, <=5 seats); no custom ETL.

**Adversary:** Commercial TCO ignores **broker hours, parallel-run Excel, training, and portal credential friction**. Lane B EXP-B3 (migration stopwatch) is proposed then **dropped from F gates**. Without measured hours, paid learning contract underprices switching cost and overstates net value of 355. Agencies that already sunk cost into ZRKS data have **asymmetric lock-in** Revolis does not offset with publish.

**Fix:** Run **EXP-B3 dry-run on >=1 sandbox agency before C1 kickoff clock**; kill/defer if entry dataset exceeds agreed hours (pre-register e.g. >8 broker-hours for mins) or breakage list includes must-have fields Revolis cannot store honestly.

### 4. Outcome attribution

**Claim:** F8 primary = median `lead_first_attempt_latency_hours`; not AI counts; outcome fees deferred (E).

**Adversary:** Correct to defer success-fee. Remaining risk: **process metric dressed as commercial success**. Latency improvement vs **self-reported week-0 band midpoint** is soft attribution (recall bias, gaming via early logging, Hawthorne from weekly reviews). Closed-won / commission lift **cannot** be claimed while UC publish blocked and phone/CDR gaps remain. G eng spend on tenant/phone/Zod is **reliability hygiene**, not proof agencies earn more in 90d (G Constitution Q2 = 0.3 — agree).

**Fix:** Keep latency as **learning KPI only**; commercial pass requires **paid convert without credit confusion** + interview unpaid-pain themes. Forbid marketing language that latency = ROI. Do not reopen outcome pricing until attribution path exists (E/C).

### 5. Pilot selection

**Claim:** 8 partners in 3 cohorts; must ICP ~5–20; economic buyer; disqualify "only cheaper than backOFFICE."

**Adversary:** Selection **optimizes for friendliness and willingness to pay a hypothesis**, which **filters out the modal SK incumbent buyer** (price-anchored to backOFFICE). Warm founder network → confirmation bias. Target **8** before WTP primary data is **commercially aggressive** relative to VALIDATE_FIRST (G). Disqualify rule is good anti-mis-sell, but interview sample must **still include** price-anchored offices or kill criterion is untestable.

**Fix:** Cap overnight plan at **interview N=8–12 + C1 <=2 unpaid or discovery-only** until EXP-B1 pass; paid C1 only after kill clears. Explicitly recruit >=3 backOFFICE and >=2 Excel/Admin controls into interviews (B already asks mix — F must enforce before C2).

### 6. Falsifying experiment

**What exists (good):** B kill 50% no pain; E stop <2 active brokers / refuse convert; F kill after 3 paid with 0 convert discussions; G VALIDATE_FIRST / portal BACKLOG.

**What fails:** **Order**. F allows C1 paid start while interview kill is only "before heavy Cohort 2." That lets cash and support burn **before** falsification. Price cards **after** founder demo confound WTP. No pre-registered **null result** that stops G eng GO (hygiene P1–P2 may still be justified on risk grounds — separate from commercial GTM).

**Fix (binding conditions below):** Interviews → migration stopwatch → then at most 2 paid pilots → then convert/WTP review → only then C2 and non-hygiene BOs.

---

## Findings (severity + fix)

| ID | Severity | Finding | Fix |
|---|---|---|---|
| I-F1 | **HIGH** | Buy reason (lead-response job) unfalsified; B kill not sequenced before paid C1 | Require >=6 EXP-B1/F3 interviews + kill clear **before** any paid invoice |
| I-F2 | **HIGH** | Price 355 ≈ 6.5× backOFFICE+ZRKS floor; credit masks WTP; E pass signal too soft | Dual price-card (credit vs none); commercial pass ≠ polite paid month alone |
| I-F3 | **HIGH** | Outcome/ROI attribution absent; latency vs self-report is process theater if sold as value | Latency = learning only; no ROI/commission claims; outcome fees stay DEFERRED |
| I-F4 | **MEDIUM** | Migration cost unmeasured; EXP-B3 not a F gate | Sandbox stopwatch before C1 clock; defer if hours/breakage exceed pre-reg limits |
| I-F5 | **MEDIUM** | Pilot N=8 + warm-network bias; disqualify price-shoppers without interviewing them | Interview mix enforced; paid seats <=2 until B kill pass; then expand |
| I-F6 | **MEDIUM** | Falsifiers exist but wrong order (paid before kill) | Reorder: interviews → migration → <=2 paid → review → C2 / eng non-hygiene |
| I-F7 | **LOW** | Stripe PROD_UNKNOWN + manual invoice OK for VALIDATE; self-serve claims would be STOP | Keep manual invoice; no self-serve marketing (already in E/F — affirm) |
| I-F8 | **LOW** | Smolko 199 grandfather / no client names in templates — correct stealth/commercial hygiene | Keep; do not use reference ARPU as new-logo WTP |

**Counter-evidence retained (must not be memory-holed):** Excel+Admin and backOFFICE+ZRKS remain rational stay paths; Admin ≠ CRM does **not** imply greenfield CRM purchase; Realsys public 210–349 is existence anchor **not** Revolis WTP; vendor ">300 agencies" is marketing.

---

## Decision Contract

### 1. Decisions

| ID | Decision |
|---|---|
| I1 | **Verdict `PASS_WITH_CONDITIONS`** — do not STOP the overnight research package; do **not** clear unpaid commercial GO for scaled paid pilots or price publication. |
| I2 | **Commercial posture remains VALIDATE_FIRST** (agree with G5). RECOMMEND_PILOT only for agencies with **coded unpaid pain** after interviews. |
| I3 | **Hard sequence:** EXP-B1/F3 (>=6) → EXP-B3 migration stopwatch (>=1) → **<=2** paid HYPOTHESIS pilots → convert/WTP review → only then C2 toward 8. |
| I4 | **355 stays HYPOTHESIS**; no list/code price change; credit rule is founder cash decision (human GO), not proof of value. |
| I5 | **Primary metric F8 allowed as learning KPI only** — not commercial ROI proof. |
| I6 | **Outcome / success-fee remains DEFERRED** until attribution + portal truth exist. |
| I7 | **G cut-scope eng:** opponent does not block pure safety hygiene (tenant/RLS, phone fail-closed) on commercial grounds; **does** block treating P3–P4/onboarding polish as justified by WTP; **does** keep P5/P6 BACKLOG. |
| I8 | **Author files F/G/E/B frozen** — amendments only via Lane K if orchestrator accepts conditions. |

### 2. Evidence

| Claim | Source |
|---|---|
| backOFFICE ~95 EUR/yr + ZRKS 415–554; steelman | `lanes/B/report.md`, `lanes/B/result.json` |
| Revolis Lite 5/10/20 = 355/630/1260; HYPOTHESIS pilot; outcome deferred | `lanes/E/report.md`, `lanes/E/result.json` |
| 8 partners, latency primary, cohorts, kills, 355 envelope | `lanes/F/report.md`, `lanes/F/result.json` |
| VALIDATE_FIRST; Q1 ceiling VALIDATE; portal too early; P5/P6 blocked | `lanes/G/report.md`, `lanes/G/result.json` |
| Opponent write_set / may STOP / no author edits | `docs/overnight/2026-09-05-ruflo-swarm/lanes.json` lane I |

### 3. Assumptions

1. Founder will not send outreach or invoices from this overnight package without human GO (F condition).
2. "Paid pilot" means cash invoice, not only verbal interest.
3. Warm intros dominate early pipeline unless founder deliberately samples incumbents.
4. Manual invoice path remains available while Stripe PROD_UNKNOWN.

### 4. Unknowns

| Unknown | Blocks |
|---|---|
| Primary WTP at 355 (with/without credit) | Scaling beyond <=2 paid |
| True unpaid job prevalence in SK 5–20 ICP | Any BUILD / public SKU |
| Migration hours Admin/ZRKS/Excel → Revolis | C1 kickoff readiness |
| Portal commercial fees | Total cost of ownership vs incumbents |
| Stripe Production readiness | Self-serve claims |
| Named prospect list quality / bias | Cohort calendar |

### 5. Experiments

1. **EXP-I0 (bind B/F):** Complete >=6 structured interviews **before** paid C1; apply B kill (>=50% no unpaid pain → pause paid GTM).
2. **EXP-I1 (strengthen E2/B2):** Price cards after demo: Revolis 355 **with credit** vs **without credit** vs Realsys 210 vs backOFFICE+ZRKS floor; record paid yes/no + reason.
3. **EXP-I2 (bind B3):** Migration stopwatch on sandbox before C1 clock; pre-register hour/breakage kill.
4. **EXP-I3:** After <=2 paid months, require convert discussion **and** explicit statement whether credit was decisive — if credit-only, treat as **fail** for list-price learning.

### 6. Product Implications

| Do | Do not |
|---|---|
| Keep HYPOTHESIS labeling + steelman in all scripts | Publish new public price sheet / change SSOT from this swarm |
| Sell job only where unpaid pain coded | Promise multi-portal publish, AI volume, or contractual SLA |
| Prefer manual invoice | Claim self-serve Stripe |
| Latency as internal learning metric | Market latency as proven EUR ROI |
| Hygiene eng optional under separate risk GO | Use commercial WTP to justify P5/P6 or Nest/etc. |

### 7. Decision Memory Payload (draft)

```yaml
decision_id: 2026-09-05-lane-I-commercial-opponent
run_id: 20260905T2304-ruflo-overnight
lane_id: I
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
status: PASS_WITH_CONDITIONS
reads: [F, G, E, B]
verdict: PASS_WITH_CONDITIONS
posture: VALIDATE_FIRST
stop_not_issued_because: authors_already_refuse_BUILD_list_edits_outcome_fees_and_external_sends
conditions:
  - interviews_ge6_and_B_kill_before_paid_C1
  - migration_stopwatch_before_C1_clock
  - paid_pilots_cap_2_until_WTP_review
  - latency_is_learning_KPI_not_ROI
  - outcome_pricing_deferred
  - no_list_price_code_change
  - no_self_serve_claim
  - author_files_frozen
findings_high: [I-F1, I-F2, I-F3]
next_action: "Lane K/O6 must carry sequencing conditions into morning human-decisions; founder GO required before any paid invite"
```

---

## Conditions checklist (must travel to morning handoff)

1. No paid pilot invoice until EXP-B1/F3 (>=6) completes and B kill does **not** fire.
2. No C1 week-1 clock until migration stopwatch documented.
3. Hard cap **2** paid HYPOTHESIS agencies until convert/WTP review (EXP-I3).
4. 355 + credit remain HYPOTHESIS; human GO on credit cash cost.
5. No ROI/commission/outcome-fee claims; F8 learning only.
6. No author-file rewrites by I; no external sends from this run.
7. P5/P6 stay blocked; commercial narrative must not imply publish is near.

## Lane status

**PASS_WITH_CONDITIONS** — commercial research package acceptable; scaled paid GTM and value claims are **not**. Artifacts: `report.md`, `sources.json`, `result.json`.
