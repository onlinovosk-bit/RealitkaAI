# Lane B — Competition / switching reasons (SK real-estate agency CRM)

**RUN_ID:** `20260905T2304-ruflo-overnight`  
**Lane:** B  
**BASE_SHA:** `cf3604613cdbb6a7a279e175f2c792fb25591461`  
**Scope:** research_and_specs only  
**Accessed_at (web):** 2026-09-05  
**Status recommendation:** `PASS_WITH_CONDITIONS`

ICP framing (hypothesis, not measured): owners/principals of SK agencies with ~5–20 brokers.

Vendor marketing ≠ independent performance proof. Prices recorded only where publicly stated; otherwise **UNKNOWN** (never invented as zero).

---

## Decisions

1. **Treat Realsoft successor as Nehnuteľnosti Admin (listing admin), not a full CRM successor.** Realsoft operations ended; portal path is `admin.nehnutelnosti.sk`. Independent SK web vendor (JM Support) states Admin is for listing management only, not CRM.
2. **Primary SK incumbent for “CRM + exports” is backOFFICE® + ZRKS database/API**, not a Czech SaaS clone. Public software fee is low (€95/yr + VAT for standard); **true minimum cash outlay includes mandatory ZRKS DB/API fee**.
3. **Realman is a CZ reference with public Kč pricing — do not treat as proven SK availability.** No `realman.sk` / SK go-to-market evidence found in primary pages accessed.
4. **AutoCRM is a general (non-realty-specialized) CRM/ERP marketed from SK URL with “od 129 €/mesiac”;** not evidenced as a portal-export realty stack. Keep in set as general CRM alternative, not as Realsoft replacement.
5. **Include Realsys as additional SK-relevant product** with public monthly ceník; major SK portals (Nehnuteľnosti / Reality / TopReality) are marketed as optional to contract, not automatically included.
6. **Control alternative remains Excel + export/import tooling (or portal-native Admin + spreadsheet CRM).** This is a rational stay path for many 5–20 broker shops.
7. **Willingness-to-pay cannot be proven from the web.** Gate any Revolis price thesis behind a paid validation experiment (below).
8. **Lane verdict: PASS_WITH_CONDITIONS** — competitor map and public prices documented with primary URLs; conditions = no independent share/WTP data; ZRKS member vs non-member economics and commercial-portal fees remain partly UNKNOWN; Realman SK fit unproven.

---

## Evidence

### Competitor set (5 products + control)

| Product | Market | Role for ICP | Public price (as stated) | VAT / fees notes | Portal exports |
|---|---|---|---|---|---|
| **Nehnuteľnosti Admin** (Realsoft successor) | SK | Listing admin for Nehnutelnosti.sk; **not CRM** per JM Support | **UNKNOWN** (no public CRM/software ceník found) | Portal advertising fees: **UNKNOWN** on pages accessed | Native to Nehnutelnosti.sk; multi-user agency accounts documented in portal FAQ |
| **backOFFICE®** | SK (since 2008 per vendor) | Full realty CRM + selective exports; data in ZRKS DB via API | **standard/web: 95 € / year + DPH → 116,85 € s DPH**; **webREAL: 190 € / year + DPH → 233,7 € s DPH** | Order page: backOFFICE prices **incl. VAT**; ZRKS fees **final** (ZRKS not VAT payer). Activation requires ZRKS DB/API fee | Vendor claims exports to relevant SK portals; selective export to nehnutelnosti.sk / topreality.sk / reality.sk |
| **ZRKS / ZoznamRealit.sk** (required companion for backOFFICE data) | SK | DB + API + ZoznamRealit listing | Non-member **API+unlimited: 554 € / year**; listing-only **346,25 € / year**. Member: API+unlimited **415,50 € / year**; listing **249,30 € / year**; membership **83,10 € / year** | Stated as annual; VAT: ZRKS “nie je platcom DPH” per backOFFICE order page | Open API narrative; ZoznamRealit page still mentions Realsoft import URL (legacy — treat carefully) |
| **Realman** | **CZ** (`realman.cz`) | Full RK SaaS (CRM/web/exports) | Absolvent **1 278 Kč / month**; Master **2 378 Kč / month**; Senior **3 478 Kč / month**; web hosting add-on **78 Kč / month bez DPH** | Prices **bez aktuální sazby DPH**; “konečné” per vendor | “Neomezeně exportů” in tariff; portal fees paid to portals separately (vendor FAQ text) — amounts **UNKNOWN** |
| **AutoCRM** | SK site / CZ support language & references | General CRM/ERP, **not realty-vertical** | Marketing: **od 129 € / month** (unlimited users claim) | VAT inclusivity: **UNKNOWN** on page accessed | Realty portal connectors: **not evidenced** → treat as **UNKNOWN / likely absent** |
| **Realsys** | SK | Web + listing distribution + CRM claims | Trial **0 € / 14 days**; Starter **10 € / month**; Professional **210 € / month**; Enterprise **270 € / month**; Web Pro **349 € / month** | VAT: **UNKNOWN** (not stated on homepage ceník) | Lists many free/classified boards; **TopReality / Nehnuteľnosti / Reality.sk “možnosť zazmluvniť”** — not automatic |
| **Control: Excel + export tool / Admin-only** | SK | Spreadsheet CRM + portal XML/API/manual | Software ≈ **0** beyond existing tools; portal fees still apply (**UNKNOWN** commercial rates) | N/A | Depends on portal contracts / agency IT |

### Switching vs staying (ICP hypothesis grounded in public facts)

**Why switch (plausible triggers, not proven demand):**
- Realsoft EOL created forced migration pain (JM Support 2025 retrospective; weby/importy breakage narrative).
- Admin Nehnuteľnosti does not replace CRM workflows (clients, matching, AML/GDPR ops) — gap for agencies that used Realsoft as “system of record.”
- Desire for one place: listings + clients + exports + compliance (backOFFICE FAQ frames Excel/emails as the problem).
- Cross-portal publish-once (Realsys / Realman / backOFFICE marketing).

**Why stay / not buy Revolis:**
- **backOFFICE software floor is extremely low** once ZRKS is accepted; switching cost (data in ZRKS, habits, AML/eGDPR, training) is high.
- Vendor claim **>300 SK agencies** on backOFFICE (marketing — not independently audited).
- Agencies that only need Nehnutelnosti.sk listing may stay on **Admin alone**.
- **Excel + existing export** remains viable for smaller portfolios.
- New entrant must beat incumbent on migration pain and portal truth, not on brochure features.
- Realman CZ prices are higher monthly SaaS — even if SK-available later, not automatic “cheap disruptor” vs backOFFICE annual software fee.

### Evidence AGAINST our thesis (required)

**Thesis under test (implicit):** After Realsoft, SK 5–20 broker agencies will switch to a modern CRM (Revolis) and pay meaningfully for it.

**Counter-evidence from primary sources:**
1. **Incumbent price wall is inverted:** backOFFICE standard is **95 € + VAT / year** for unlimited brokers/listings (vendor FAQ), with ZRKS API+listing at **415,50–554 € / year**. A new CRM competing primarily on “software subscription” faces a public software anchor near **~10 €/month equivalent** — before commercial portal fees. This **weakens** any thesis that agencies are “underserved and ready to pay SaaS rates like CZ Realman (~1.3–3.5k Kč/mo)” without proof.
2. **Realsoft gap may already be closed by Admin + Excel or Admin + backOFFICE**, not by greenfield CRM. JM Support explicitly: Admin ≠ CRM; yet many agencies may accept that split rather than migrate again.
3. **No public WTP / win-rate data** for Revolis vs backOFFICE; vendor marketing from all parties is not performance proof.

---

## Assumptions

- ICP ~5–20 brokers is a working hypothesis for overnight planning, not a measured segment size.
- Agencies that used Realsoft as primary offer store felt migration pain in 2025 (supported by JM Support narrative; magnitude UNKNOWN).
- “Relevant SK portals” for switching decisions include at least Nehnutelnosti.sk, Reality.sk, Topreality.sk, ZoznamRealit.sk.
- Vendor-stated user counts (backOFFICE >300; Realman “700+ licenses” historical marketing) are **claims**, not audited share.

---

## Unknowns

- Nehnuteľnosti Admin / commercial portal **fee schedules** for agencies (public ceník not captured here) → **UNKNOWN**.
- Whether Realman sells / supports **SK agencies** (SK portals, SK tax/AML) → **UNKNOWN**; only CZ site evidenced.
- AutoCRM full public tariff matrix beyond “od 129 €/mesiac”; VAT; realty connectors → **UNKNOWN**.
- Realsys VAT treatment; real contract status for major SK portals; share of paying customers → **UNKNOWN**.
- Independent market share of backOFFICE vs Excel vs Admin-only → **UNKNOWN**.
- Migration effort hours Realsoft→Admin vs Realsoft→backOFFICE vs Excel → **UNKNOWN**.
- Willingness-to-pay for Revolis at any price point → **UNKNOWN (cannot prove from web)**.

---

## Experiments

### EXP-B1 — Switching interview pack (design partners)
- **N:** 8–12 SK agency principals (mix: ex-Realsoft, backOFFICE, Excel-only).
- **Protocol:** 30-min structured interview; record current stack, monthly portal+software spend (bands), top 3 pains, last time they evaluated switching, killer feature that would force switch.
- **Pass criteria:** ≥6 complete interviews; coded themes with counts; at least 2 “would stay on Excel/Admin” narratives preserved.
- **Fail / kill:** If ≥50% say “backOFFICE+ZRKS already enough” and name no unpaid pain → deprioritize greenfield CRM GTM.

### EXP-B2 — Price card WTP (cannot be web-proven)
- **Method:** Van Westendorp or simple monadic price cards **after** demo of 1 workflow they care about (e.g. selective multi-portal publish + client match).
- **Price anchors to test (hypotheses only, not claims):** below / at / above public backOFFICE+ZRKS annual bundle (~670–788 €/yr non-member order totals for standard/webREAL from vendor order page); and a monthly SaaS card comparable to Realsys Professional (210 €/mo public).
- **Pass:** Willingness to start a **paid pilot** (≥1 month or annual) from ≥3 agencies, not just “interesting.”
- **Note:** Web research **cannot** substitute for EXP-B2.

### EXP-B3 — Migration cost stopwatch
- Time a dry-run export/import of N listings + M clients from Admin/ZRKS/Excel into a sandbox.
- Output: hours + breakage list (photos, IDs, broker assignment). Feeds Lane D/F.

---

## Product Implications

1. **Do not position Revolis as “Realsoft replacement” without clarifying Admin already covers Nehnutelnosti listing admin.** Position against **CRM + multi-portal truth + compliance workflow** gap.
2. **Price messaging must beat or bundle against backOFFICE+ZRKS economics**, or win on a job-to-be-done backOFFICE fails (e.g. modern UX, analytics, specific portal reliability) — not on feature checklist alone.
3. **Treat Realman Kč tariffs as CZ comps only** until SK availability is proven.
4. **AutoCRM is a distraction competitor** for general CRM buyers; unlikely primary alternative for portal-centric RK unless they abandon realty vertical tools.
5. **Realsys shows SK buyers already see 210–349 €/mo offers** publicly — useful as upper-anchor existence proof, **not** as proven WTP for Revolis.
6. **Keep Excel+export as explicit control** in all pilots and competitor slides.
7. Downstream lanes (E pricing, F pilot): mark any Revolis pilot price as **HYPOTHESIS** pending EXP-B2.

---

## Decision Memory Payload (draft)

```yaml
decision_id: 2026-09-05-lane-B-competition-switch
run_id: 20260905T2304-ruflo-overnight
lane_id: B
base_sha: cf3604613cdbb6a7a279e175f2c792fb25591461
status: PASS_WITH_CONDITIONS
icp: "SK real-estate agency ~5-20 brokers (hypothesis)"
competitors:
  - id: nehnutelnosti-admin
    relation: "Realsoft successor (listing admin, not CRM)"
    sk_availability: confirmed
    price: UNKNOWN
  - id: backoffice
    sk_availability: confirmed
    price_software_year_ex_vat: {standard: 95, webREAL: 190}
    price_software_year_incl_vat: {standard: 116.85, webREAL: 233.7}
    required_zrks_api_year: {non_member: 554, member: 415.50}
  - id: realman
    market: CZ
    sk_availability: UNKNOWN
    price_month_czk_ex_vat: {absolvent: 1278, master: 2378, senior: 3478}
  - id: autocrm
    vertical: general_crm
    price_from_eur_month: 129
    realty_portals: UNKNOWN
  - id: realsys
    sk_availability: confirmed
    price_eur_month: {starter: 10, professional: 210, enterprise: 270, web_pro: 349}
    vat: UNKNOWN
control_alternative: "Excel + export/import + portal Admin"
against_thesis: "backOFFICE public software fee ~95 EUR/year + ZRKS API undercuts SaaS WTP assumptions; Admin may suffice for listing-only users"
wtp: "NOT_PROVABLE_FROM_WEB — run EXP-B2"
next_action: "Feed competitor+price matrix to Lane E (pricing hyp) and Lane F (pilot interviews); do not invent portal fee tables"
```

---

## Sources index

See `sources.json` (claim-level with URLs, accessed_at 2026-09-05).
