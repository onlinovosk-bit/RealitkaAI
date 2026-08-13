# Seller Trust - Legal / Trust Contract (LANE 15, STF-P0)

**Status:** DRAFT FOR DPO / EXTERNAL COUNSEL - **not a legal sign-off**, not a DPA amendment, not runtime code.
**Lane:** 15 - STF-P0-TRUTH-BEFORE-TRAFFIC
**Worktree / branch:** `C:\RealitkaAI\.worktrees\stf-p0-legal-trust` / `docs/stf-p0-legal-trust`
**BASE_SHA:** `5d6500106a67a864b049dc372ee0a2d6be793c6f`
**Author role:** privacy product counsel + trust UX analyst (engineering swarm)
**Effective for product work:** only after named counsel answers section 10 and the Founder records GO.

> **This document is not legal advice and is not a lawyer sign-off.**
> Candidate legal bases are marked **CANDIDATE - LAWYER MUST CONFIRM**.
> UI copy is marked `DRAFT - LEGAL APPROVAL REQUIRED`.
> Anything without a repo path or authoritative URL = `UNKNOWN - HUMAN DECISION` with an owner.

UNAPPROVED DRAFT strategy files (`C:\RealitkaAI\docs\architecture\revolis-seller-trust-factory-l99.md`, technical addendum, `memory/seller-trust-factory.md`) were read as context only. **None of their claims are treated as proven.**

Transliteration note: Slovak diacritics are ASCII-folded in this file because the write path is encoding-fragile. **Authoritative statutory wording is the URL in section 1.1**, not the transliteration.

---

## 0. What this contract does and does not do

Does:

1. Map **roles** (controller / processor / joint-controller) from **evidence in this worktree** plus GDPR/EDPB/Slov-Lex - no invented verdict where evidence is insufficient.
2. Provide matrix **purpose x channel x legal basis x notice x evidence x retention** for seven STF contact purposes.
3. Split **service request** from **marketing consent** (never one checkbox).
4. Define **permission receipt**, **withdrawal + suppression before every dispatch**, **cookie/OpenAI/transfer before contact is entered**, and **fail-closed tenant activation**.
5. Ask **exact questions** for DPO/lawyer.

Does not: implementation, migrations, production copy, merge, deploy, outbound emails, or a fake GDPR approval.

---

## 1. Binding sources vs non-binding drafts

### 1.1 Authoritative law

| Instrument | What binds this contract | URL |
|---|---|---|
| Regulation (EU) 2016/679 (GDPR) | Art. 4 roles, 5 principles, 6 bases, 7 consent, 12-14 notice, 15-22 rights, 26 joint controllers, 28 processor, 32-34 security/incident, 44-46 transfers | https://eur-lex.europa.eu/legal-content/SK/TXT/?uri=CELEX%3A32016R0679 |
| EDPB Guidelines 07/2020 | controller / processor / joint-controller (purpose and essential means) | https://www.edpb.europa.eu/system/files/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf |
| EDPB Guidelines 05/2020 | consent: freely given, specific, informed, unambiguous; granularity; withdrawal | https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf |
| EDPB Guidelines 1/2024 | Art. 6(1)(f) legitimate interest **only** with a concrete purpose + necessity + balancing test | https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf |
| Act No. 452/2021 Coll. par. 109(8) | cookies / terminal access: demonstrable consent; exception only for transmission or an information-society service **explicitly requested** by the user | https://www.zakonypreludi.sk/zz/2021-452#p109 |
| Act No. 452/2021 Coll. par. 116 | unsolicited communication / direct marketing (par. 2 definition; par. 3 prior consent for email/SMS/automated systems; par. 5 evidence 4 years after withdrawal; par. 6 withdrawal + 30-day confirmation; par. 14-16 soft-opt-in) | https://www.zakonypreludi.sk/zz/2021-452#p116 |
| Act No. 18/2018 Coll. | Slovak GDPR companion; processor contract (par. 34) | https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2018/18/ |
| UOOU SR | GDPR supervisory authority; data-subject complaint | https://dataprotection.gov.sk |
| Directive 2002/58/EC (ePrivacy) | template for par. 109 / par. 116 | https://eur-lex.europa.eu/legal-content/SK/ALL/?uri=celex:32002L0058 |
| Commission Decision (EU) 2021/914 | SCCs for transfers outside EEA | https://eur-lex.europa.eu/legal-content/SK/TXT/?uri=CELEX%3A32021D0914 |

Canonical Slov-Lex collection for Act 452/2021: https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2021/452/ (fetch timed out at writing; par. 109(8) and par. 116 verified from current text on zakonypreludi.sk).

### 1.2 Binding repo texts (this worktree, HEAD = BASE_SHA)

Paths below are the only internal source of facts about **today's** product behaviour. Where code and legal markdown diverge, **code + schema win as facts of behaviour**; legal markdown wins only as a claim that still needs verification.

### 1.3 Non-binding

- UNAPPROVED STF drafts in the dirty root (strategy, not law).
- RACI tables that assume a DPO exists while DPO is still `DOPLNIT` in `docs/legal/DPA_Reality_Smolko.md`.
- Public legal pages that contradict each other on controller identity (section 2.4).

---

## 2. Controller / processor / joint-controller matrix

### 2.1 Legal rule (not a product verdict)

Under GDPR Art. 4(7)-(8) and EDPB 07/2020: the **controller** determines purposes and essential means; the **processor** processes on behalf of the controller under Art. 28; **joint controllers** (Art. 26) jointly determine purposes and means. Roles follow **facts**, not the contractual label (EDPB 07/2020).

This document **does not** decide the qualification of `/odhad/{slug}`. Below is evidence plus a **CANDIDATE** split. Final verdict = `UNKNOWN - HUMAN DECISION` (owner: external counsel + Founder).

### 2.2 Matrix (as-is evidence vs candidate role)

| Actor | What they actually do today (evidence) | Candidate role for **CRM data the RK inserts** | Candidate role for **public valuation widget** (name/email/phone collected on `/odhad/{slug}`) | Candidate role for **platform analytics / A-B / GA on the same URL** | Contract / notice today |
|---|---|---|---|---|---|
| **ONLINOVO, s. r. o.** (brand Revolis.AI) | Hosts widget and API; stores `leads` + `lead_consents` + `valuation_estimates`; calls OpenAI commentary; mounts GA on marketing layout; notifies RK owner | Processor under DPA | **CANDIDATE joint-controller or processor - LAWYER MUST CONFIRM.** Revolis determines URL, schema, A/B, OpenAI, GA, consent mapper. RK determines brand, follow-up, and (for Smolko) privacy URL. | **CANDIDATE (independent) controller** for Revolis's own product measurement if GA/A-B serve Revolis, not an RK instruction | DPA: `apps/crm/docs/legal/DPA-zmluva-o-spracuvani-osobnych-udajov.md` Arts. 1-2 (Customer = Controller, Revolis = Processor). Entity: `apps/crm/src/app/(public)/privacy/page.tsx` (ONLINOVO, ICO 54166942); `docs/legal/DPA_Reality_Smolko.md` (DRAFT, unsigned) |
| **RK (tenant / realitna kancelaria)** | Tenant in `valuation_tenants`; lead lands on `agency_id`; RK does follow-up | Controller | **CANDIDATE controller or joint-controller** for follow-up and CRM use | Usually **not** controller of Revolis GA unless GA is its instruction | Privacy URL hardcoded: `apps/crm/src/lib/valuation/agency-config.ts` (Smolko -> `https://www.realitysmolko.sk/ochrana-osobnych-udajov`; demo -> Revolis privacy) |
| **Named broker (makler)** | On submit `assigned_agent: "Nepriradeny"`, `assigned_profile_id: null` (`apps/crm/src/lib/valuation/lead-mapper.ts`). Calendly is tenant-level, not a named person. | Neither controller nor a separate recipient until assigned | **CANDIDATE:** authorised person of the RK controller after assignment; **not** a publicly identified recipient at collection | - | Missing from `lead_consents` and `valuation_tenants` |
| **Analytics (Google Analytics / gtag)** | `GoogleAnalytics` mounts in `apps/crm/src/app/(marketing)/layout.tsx` **with no cookie banner**. Widget `/odhad/[agencySlug]` is under that layout. Events in `apps/crm/src/lib/valuation/analytics.ts` send `session_id`, `agency_slug`, `ab_variant`. | Subprocessor **only if** processing on behalf of RK. Otherwise (Revolis's own measurement) **separate recipient / Revolis (sub)processor** | Same uncertainty | **CANDIDATE (sub)processor of Revolis** for GA4 | Public list: `apps/crm/src/app/(public)/legal/sub-processors/page.tsx` (Google Analytics, SCC). Privacy policy claims anonymised metrics and "we do not use advertising cookies or retargeting" - `apps/crm/docs/legal/PRIVACY-POLICY-zasady-ochrany-osobnych-udajov.md` s. 10. **IP anonymisation is not verified in code** (`GoogleAnalytics.tsx` calls `gtag('config', ... send_page_view: true)` with no consent mode). |
| **Communication providers** | Resend = transactional email (`apps/crm/src/lib/acquire/send-inbound-auto-response.ts`). Valuation submit **does not** call auto-response; it only calls `runInboundLeadTriageAndNotify` (in-app notify to RK owner) - `apps/crm/src/app/api/valuation/submit/route.ts`. Twilio is listed in DPA/sub-processors as SMS "if activated". Calendly = external link from `calendly_url`. | Subprocessors of the RK controller via Revolis **if** the RK instructs a send | For one-shot callback: Resend/Twilio **CANDIDATE subprocessors**. Calendly: **CANDIDATE independent controller** (user leaves to a third party) | - | DPA Annex A: `apps/crm/docs/legal/DPA-zmluva-o-spracuvani-osobnych-udajov.md`. ANNEX-H: `apps/crm/docs/legal/ANNEX-H-EPRIVACY-OUTREACH-COMPLIANCE.md` (RK = Controller for outreach). |

### 2.3 What the contract claims today (and where that is not enough)

The existing DPA model is **B2B SaaS**: the RK inserts its clients' data; Revolis is processor (`apps/crm/docs/legal/DPA-zmluva-o-spracuvani-osobnych-udajov.md` Art. 2.1; `apps/crm/docs/legal/PRIVACY-POLICY-zasady-ochrany-osobnych-udajov.md` s. 3.3).

The public widget is a different factual pattern: Revolis collects PII **directly from the owner** on its own domain (`/odhad/{slug}`), under RK branding, with the RK privacy link (Smolko) or a Revolis fallback (`apps/crm/src/lib/valuation/tenant.ts` -> `privacyUrl: config?.privacyUrl ?? "/privacy-policy"`).

**CANDIDATE (not a verdict):** collection on the widget may be Art. 26 joint control for **collection and handover to the RK** (EDPB 07/2020: joint determination of collection means). Follow-up inside CRM may remain solo-controller RK + processor Revolis.

`UNKNOWN - HUMAN DECISION` - owner: **external counsel**. Until that verdict, do not claim "we are only a processor" or "we are joint controllers".

### 2.4 Controller-identity conflict (evidence)

| Source | Who it names as controller |
|---|---|
| `apps/crm/src/app/(public)/privacy/page.tsx` | ONLINOVO, s. r. o., Sturova 130/25, 058 01 Poprad, ICO 54166942, privacy@revolis.ai |
| `apps/crm/src/app/(public)/privacy-policy/page.tsx` | "Prevadzkovatelom platformy je Revolis.AI" (no ICO) |
| `apps/crm/docs/legal/PRIVACY-POLICY-zasady-ochrany-osobnych-udajov.md` | "Prevadzkovatel: Revolis.AI" (no ICO) |
| `docs/legal/DPA_Reality_Smolko.md` | Processor = ONLINOVO; Controller = Reality Smolko; seat fields `DOPLNIT`; status DRAFT |

`UNKNOWN - HUMAN DECISION` - owner: **Founder + counsel**: which legal person is controller for (a) `/odhad` visitors, (b) registered CRM users, (c) any joint arrangement with the RK.

---

## 3. Matrix: purpose x channel x legal basis x notice x evidence x retention

**How to read "legal basis":** it is not approval. It is a **CANDIDATE** tied to a **concrete purpose**. Missing balancing test / consent / contract = blocked.

Shared evidence artefacts today:

- `lead_consents`: `lead_id`, `tenant_slug`, `privacy_policy_version`, `acknowledged_at`, `marketing_opt_in` - `apps/crm/supabase/migrations/20260722120000_sandbox_gdpr_consent.sql`
- `leads.gdpr_consent_at` + `gdpr_consent_version` - `apps/crm/src/lib/valuation/lead-mapper.ts`
- Notice version: `PRIVACY_POLICY_VERSION` default `"2026-07-v1"` - `apps/crm/src/lib/valuation/config.ts`
- Two checkboxes: `privacyAck` (required) and `marketingOptIn` (optional) - `apps/crm/src/components/valuation/ValuationWidgetForm.tsx`; API `privacyAck: z.literal(true)` - `apps/crm/src/app/api/valuation/submit/route.ts`

### 3.1 Purpose: the valuation itself (band, no follow-up call)

| | |
|---|---|
| **Concrete purpose** | Compute and display an indicative price band from NBS/attribution sources for the entered property. |
| **Channel** | HTTPS `POST /api/valuation/estimate` and (variant A) `POST /api/valuation/submit`. Persist: `valuation_estimates` (`apps/crm/src/lib/valuation/persist-estimate.ts`). OpenAI commentary: `apps/crm/src/lib/valuation/commentary.ts`. |
| **Data** | Type, location, sqm, condition, etc. Variant B **without** name/email/phone. Session id + A/B cookies. IP for rate-limit. |
| **Personal data?** | `UNKNOWN - HUMAN DECISION` (owner: counsel). Location + session cookie + IP may be personal data (GDPR Art. 4(1)). Square metres without an identifier generally are not. |
| **CANDIDATE basis** | If **not** personal data: GDPR does not apply to this purpose. If it **is**: Art. 6(1)(b) *steps prior to contract at the data subject's request* **only if** the estimate is an explicitly requested service - **LAWYER MUST CONFIRM**. Art. 6(1)(a) if the estimate is conditioned on consent. **Art. 6(1)(f) must not be used without a documented balancing test for this concrete estimate purpose** (EDPB 1/2024). This document contains **no** such test and **does not approve** legitimate interest for the valuation. |
| **Notice** | Art. 13 notice for *this* purpose must exist before OpenAI/persist/cookies, not only at contact. Today the privacy ack is on the contact step. Variant B shows the estimate **before** `privacyAck`. |
| **Evidence** | `valuation_estimates` (property + session_id, no consent row). `lead_consents` is created only on submit. |
| **Retention** | `UNKNOWN - HUMAN DECISION` (owner: counsel + product). Privacy policy retention for CRM prospects is "per customer setting, max until contract end + 90 days" (`PRIVACY-POLICY` s. 7) - **not explicitly bound to `valuation_estimates`**. No deletion job for that table was found. |
| **Fail-closed** | Variant B estimate runs without `privacyAck`. That is a product fact, not an approved legal regime. |

### 3.2 Purpose: user-requested one-shot callback (service, not newsletter)

| | |
|---|---|
| **Concrete purpose** | One return contact from an **identified** recipient (RK / named broker), on a **chosen** channel, in a **window**, solely about the delivered estimate / further refinement - not a campaign. |
| **Channel (allowed after GO)** | Phone (live call), email, SMS - **only those the receipt records**. Calendly self-serve is a different channel (third party). |
| **CANDIDATE basis** | GDPR Art. 6(1)(b) for *handling a callback request about the estimate that the person submitted* - **LAWYER MUST CONFIRM**. Alternative: Art. 6(1)(a) bound **only** to this purpose (not newsletters). **Not** Art. 6(1)(f) without a balancing test for *this* callback. No "legitimate interest in seller follow-up" is approved here. |
| **par. 116** | If this is a **requested** service reply (not presentation of goods/services under par. 116(2)), CANDIDATE: par. 116(3) does not apply. If the call/SMS sells a listing mandate beyond the requested estimate, **it becomes direct marketing** -> par. 116(3) consent + par. 116(5) evidence. `UNKNOWN - HUMAN DECISION` - owner: counsel (service vs mandate-sale boundary). |
| **Notice** | Art. 13: who calls, why, on which number/email, when, how to cancel **this** request without affecting the estimate. Today copy promises contact without a named recipient: `contactPromise` in `agency-config.ts`. |
| **Evidence** | Minimum receipt (section 5). Today: `privacyAck` = "Beriem na vedomie informacie..." - that is **notice acknowledgement**, not a callback request and not marketing consent. Submit also creates a lead and fires triage notify to the owner. |
| **Retention** | CANDIDATE: duration of handling + limitation/complaint period; consent-evidence under par. 116(5) **only if** classified as direct marketing (4 years from withdrawal). `UNKNOWN` owner: counsel. |
| **Suppression** | Before every dispatch (section 6). Today: **no** per-lead suppression check in valuation submit. Agency `auto_response_enabled` applies to the inbound email gateway, not the widget (`apps/crm/supabase/migrations/20260713150000_inbound_auto_response.sql`). |

### 3.3 Purpose: appointment verification

| | |
|---|---|
| **Concrete purpose** | Confirm, change, or cancel an **already agreed** consultation/viewing slot. |
| **Channel** | Email / SMS / call / Calendly. |
| **CANDIDATE basis** | Art. 6(1)(b) *steps the person requested* (agreed slot) - **LAWYER MUST CONFIRM**. Not marketing. Not Art. 6(1)(f) without a test. |
| **Notice** | Who sends the reminder, which slot, how to cancel. |
| **Evidence** | Today: `calendly_url` on the tenant (`20260720193000_valuation_tenants.sql`). Clicking Calendly leaves to a **separate** controller/processor. **No** Revolis evidence of Calendly subprocessing consent. DPA Annex A **does not list** Calendly. |
| **Retention** | Slot + a reasonable archive period. `UNKNOWN` owner: counsel. |
| **Fail-closed** | Without a publicly identified recipient and without DPA/SCC covering Calendly, this channel **must not** go live in production STF (section 8). |

### 3.4 Purpose: long-term nurture / newsletter

| | |
|---|---|
| **Concrete purpose** | Repeated sending of market news / education - **not** handling a single estimate. |
| **Channel** | Email, SMS, MMS, automated calls. |
| **CANDIDATE basis** | GDPR Art. 6(1)(a) **specifically** for "sending property-market news from [Controller] on [channel]". Plus Act 452/2021 par. 116(3) (prior demonstrable consent before email/SMS/automated systems). **Art. 6(1)(f) for newsletter is not approved here** (no balancing test; ePrivacy also requires consent for these channels). |
| **Soft-opt-in par. 116(15)** | Exception is for direct marketing of **own similar** goods/services where contact was obtained **in connection with a sale**, plus opt-out at collection and in every message; par. 116(16) = 1 year after the contract ends. A free estimate is **not** evidenced as a "sale of goods or services". **CANDIDATE: soft-opt-in does not apply to the widget** unless counsel says otherwise. `UNKNOWN - HUMAN DECISION` owner: counsel. |
| **Notice** | Separate checkbox; sender; channels; content; how to withdraw. |
| **Evidence today** | `marketing_opt_in` boolean + copy "Chcem dostavat novinky (nepovinne)." - **too generic** (missing channel, sender, content, withdrawal). Split from `privacyAck` exists (two checkboxes), but it **does not meet** EDPB 05/2020 "specific / informed" without copy change. |
| **Retention** | Until withdrawal + par. 116(5) (4 years of consent evidence after withdrawal) **if** this is direct marketing. |
| **Prohibition** | One tick must not enable callback **and** nurture. `marketingOptIn` default `false` in the mapper is the right direction; copy must stay separate. |

### 3.5 Purpose: analytics / A-B test

| | |
|---|---|
| **Concrete A-B purpose** | Split UX: A = contact before estimate; B = estimate before contact (`apps/crm/src/lib/valuation/ab-test.ts`). Cookies `revolis_valuation_sid` + `revolis_valuation_ab`, Max-Age 30 days, SameSite=Lax. |
| **Concrete GA purpose** | Pageview + events `valuation_started`, `step_completed`, `valuation_shown`, `contact_submitted`, `lead_submitted`, `abandon` including `session_id`. |
| **Channel** | HTTP cookie + JS gtag on `www.googletagmanager.com`. |
| **CANDIDATE basis (cookies)** | Act 452/2021 par. 109(8): demonstrable consent, **except** storage strictly necessary for a service the user explicitly requested. **CANDIDATE:** A/B and GA are **not** strictly necessary to compute the estimate (the estimate can run without a 30-day cookie). Therefore **consent Art. 6(1)(a) bound to measuring use of the valuation page**, not legitimate interest. Legitimate interest **does not replace** cookie consent (ePrivacy lex specialis). |
| **Notice** | Before writing the cookie. Today: banner component exists (`apps/crm/src/components/legal/cookie-consent-banner.tsx`, key `revolis_cookie_consent_v1`) but **is imported nowhere** (rg: only the definition). GA loads without waiting for consent. |
| **Evidence** | Banner would store `{ mode, timestamp }` in localStorage - **not mounted**. A/B cookies are written in `getOrAssignValuationAbTest()` on load. |
| **Retention** | Cookie 30 days (code). Privacy policy: analytics cookies 13 months (`PRIVACY-POLICY` s. 7) - **conflicts with A-B code (30 days) and GA default**. `UNKNOWN` owner: counsel + engineering after GO. |
| **Claim conflict** | `PRIVACY-POLICY` s. 10: "we do not use advertising cookies or retargeting." GA event `lead_submitted` + `session_id` is conversion measurement; whether that is advertising = section 3.7. |

### 3.6 Purpose: personalisation / AI commentary

| | |
|---|---|
| **Concrete purpose** | 2-3 sentences of commentary on the band (no new number) via OpenAI `gpt-4o-mini` (default). Payload: type, location, sqm, condition, band, region, NBS source - `commentary.ts`. **Name/email/phone are not sent in the prompt.** `callOpenAI` masks email/phone/IBAN/birth number (`apps/crm/src/lib/ai/openai.ts`) - **it does not mask location**. |
| **Channel** | OpenAI Chat Completions API (default client with no `baseURL` -> public OpenAI API). |
| **When** | Also **before** contact (estimate route, variant B). |
| **CANDIDATE basis** | If the payload is not personal data: outside GDPR. If location+session identifies a person: Art. 6(1)(b) or (a) bound to *generating commentary on the estimate the user requested* - **LAWYER MUST CONFIRM**. Not marketing. Not Art. 6(1)(f) without a test. |
| **Transfer** | DPA + privacy claim "EU endpoint / zero retention / no training" (DPA Annex A; `PRIVACY-POLICY` s. 4). Code: `new OpenAI({ apiKey })` **without** a contractually verifiable EU project in that file. Public sub-processors: OpenAI USA, SCC (`legal/sub-processors/page.tsx`). **CANDIDATE:** Art. 46 SCCs + TIA. Actual region and zero-retention are **not verified in code.** `UNKNOWN - HUMAN DECISION` owner: counsel + engineering (prove DPA/zero-retention contract + endpoint). |
| **Notice** | Art. 13 + 44: AI subprocessor and third country **before** sending location. Missing today. |
| **Evidence** | No consent row on estimate-only. |
| **Retention** | OpenAI: zero-retention claim in legal markdown - verify by contract. Revolis: commentary returned to client; estimate row persisted. |

### 3.7 Purpose: retargeting / advertising / offline conversion

| | |
|---|---|
| **Concrete purpose (if ever enabled)** | Optimise ads to a qualified consultation/mandate (not to form submit). |
| **Channel** | Today on the widget: **no** Meta Pixel / Enhanced Conversions / offline conversion upload from valuation. An admin lookalike from `leads_demo` exists (`apps/crm/src/app/api/meta/lookalike/route.ts`) - **outside** the valuation widget; demo table. |
| **CANDIDATE basis** | Advertising cookies: par. 109(8) consent. Email upload to Meta: GDPR Art. 6(1)(a) for *creating a lookalike / measuring ads on [named platform]*. Art. 6(1)(f) **only** after an EDPB 1/2024 test for **this** purpose plus ePrivacy consent for device identifiers. This document **does not** contain that test and **does not approve** legitimate interest for advertising. |
| **Notice / evidence / retention** | N/A in STF-P0 until counsel + Founder allow it. Privacy policy s. 10 claims no retargeting - enabling it would require a notice change **in the same GO**. |
| **Fail-closed** | Default **OFF**. No tenant flag for ads sharing on `valuation_tenants`. |

---

## 4. Service request vs marketing consent - never one checkbox

### 4.1 Mandatory split (product rule of this contract)

| Field | May enable | Must not enable |
|---|---|---|
| **Service request** (I ask for one callback / estimate display / slot) | Only that `request_kind` + `channel` + `contact_window` in the receipt | Newsletter, nurture, retargeting, lookalike, "news", extra channels |
| **Marketing consent** | Only nurture/newsletter on **named** channels from a **named** sender | A condition for delivering the estimate or the callback |
| **Privacy notice ack** | Art. 13 "I was informed" | Neither service nor marketing (EDPB 05/2020: consent is not the information duty) |

Legal reason: GDPR Art. 7(2) (consent distinguishable from other matters), Art. 7(4) / recital 43 (freely given - service must not be conditional on marketing consent), EDPB 05/2020; Act 452/2021 par. 116(3) vs requested communication.

### 4.2 As-is (repo)

Positive:

- Two separate checkboxes (`privacyAck` required, `marketingOptIn` optional).
- API requires `privacyAck: true`; marketing defaults `false`.
- Sandbox: no `lead_consents` with PII (`submit/route.ts`).

Gaps:

- `privacyAck` copy is notice, but submit **also** creates a lead and promises a call (`contactPromise`) - the service request is **implicit** in the CTA, not a named `request_kind`.
- Variant A CTA "Zobrazit moj odhad" gates the estimate on handing over phone/email. That is not bundled with the marketing checkbox, but **may** be conditioning the service on PII. `UNKNOWN - HUMAN DECISION` owner: counsel (Art. 6(1)(b) vs disproportionate conditioning).
- Marketing copy does not name channel, sender, content, or withdrawal.
- No wording hash; only global `PRIVACY_POLICY_VERSION`.

### 4.3 DRAFT - LEGAL APPROVAL REQUIRED (copy)

These texts **must not** go live without counsel sign-off.

**A. Notice ack (not processing consent)**

> DRAFT - LEGAL APPROVAL REQUIRED
> I have read the [personal data notice]({privacy_url}) of **{controller_legal_name}**. **{public_recipient_name}** will use these data only to handle this request.

**B. Service request (required if anyone will contact)**

> DRAFT - LEGAL APPROVAL REQUIRED
> I request **one** return contact from **{public_recipient_name}** ({controller_legal_name}) on **{channel}** during **{contact_window}**, solely about this estimate. This is not consent to newsletters.

**C. Marketing (optional, default off, visually separate)**

> DRAFT - LEGAL APPROVAL REQUIRED
> I want occasional property-market news by email from **{controller_legal_name}**. I can withdraw at any time. **If I do not tick this**, nobody will send me a newsletter; the callback in B is unaffected.

**D. Prohibited**

- One checkbox such as "I agree to processing and want news and please call me".
- Pre-ticked marketing.
- Hiding the estimate behind a marketing tick.
- The same `consent_id` for service and marketing.

---

## 5. Minimum permission receipt

Today's `lead_consents` **is not enough**. This contract requires (logical model, no migration in this PR):

| Field | Required | Meaning | As-is |
|---|---|---|---|
| `tenant_id` / `tenant_slug` | yes | Tenant | `tenant_slug` exists |
| `controller_legal_name` + ICO | yes | Controller the person is trusting | missing |
| `public_recipient_name` | yes | Publicly identified recipient (RK and/or named broker) | missing; lead has "Nepriradeny" |
| `request_kind` | yes | Enum: `estimate_only` / `one_shot_callback` / `appointment` / `nurture` - **one kind per row** | missing (service implicit) |
| `channel` | yes when contacting | `phone` / `email` / `sms` / `calendly` | missing |
| `contact_window` | yes for callback | Human text + normalised window (e.g. "weekdays 9-17") | only free-text `contactPromise` in code, not stored |
| `wording_version` + `wording_hash` | yes | Hash of the exact wording shown | only global `privacy_policy_version` |
| `timestamp` (`acknowledged_at` / `granted_at`) | yes | UTC | `acknowledged_at` exists |
| `source` | yes | `valuation_widget:{slug}:{ab}` + URL | partial in `leads.note` / `source=valuation_widget` |
| `withdrawal_at` / `withdrawal_channel` | yes (nullable) | When and how withdrawn | missing |
| `marketing_opt_in` | only on the nurture row | Must not live on the service row | boolean on the same row as notice - **mixes purposes** |

par. 116(5): if this is direct marketing, durable consent medium **at least 4 years from withdrawal**.

---

## 6. Withdrawal + suppression before every dispatch

### 6.1 UX (as simple as granting)

`DRAFT - LEGAL APPROVAL REQUIRED`

- Link in every email/SMS: "Cancel further contact" (one click).
- Phone: spoken "do not contact" = mandatory suppression write the same day.
- Web: `{privacy_url}` + `{cancel_url}` with email/phone and `request_kind`.
- Confirm withdrawal within **30 days** (par. 116(6)) on a durable medium; keep 4 years.

Withdrawing marketing **must not** delete the statutory consent record or abort an unfinished one-shot callback - and cancelling the callback must not require unsubscribing from news.

### 6.2 Suppression rule (product contract)

Before **every** send (email, SMS, auto-call, phone-queue insert):

1. Load suppression for `(tenant, identifier, channel, request_kind)`.
2. If `withdrawal` or global `do_not_contact` -> **do not send**, log `suppressed`.
3. If `request_kind=nurture` and `marketing_opt_in!=true` -> **do not send**.
4. If `request_kind=one_shot_callback` and callback already fulfilled / window expired -> **do not send** (must not flip into nurture).
5. If receipt or wording_hash missing -> **do not send** (fail-closed).
6. par. 116(7)-(10) (do-not-call list, the Office): `UNKNOWN - HUMAN DECISION` whether STF calls are "direct marketing" -> owner counsel. Until then, **CANDIDATE:** live requested service callback is not on that list; marketing calls are.

As-is: ANNEX-H promises unsubscribe, suppression list, frequency cap, audit log - `apps/crm/docs/legal/ANNEX-H-EPRIVACY-OUTREACH-COMPLIANCE.md`. LEGAL-GAP-LIST item 8 marks ePrivacy outbound as a **critical gap**. Per-lead suppression for valuation **is not in code**.

---

## 7. Cookie, OpenAI, subprocessors and transfers BEFORE contact is entered

Hard rule of this contract: **no optional tracking, no third-country transfer, no AI prompt with potential personal data, until Art. 13 notice is met (and cookie consent where par. 109(8) requires it).**

### 7.1 What happens today before contact (facts)

| Operation | Before contact? | Consent / notice? | Path |
|---|---|---|---|
| GA4 script + pageview | yes, entire `(marketing)` layout including `/odhad/[slug]` | no (banner not mounted) | `apps/crm/src/app/(marketing)/layout.tsx`, `GoogleAnalytics.tsx` |
| A/B + session cookies 30 days | yes, on widget load | no | `apps/crm/src/lib/valuation/ab-test.ts` |
| GA events with `session_id` | yes (`valuation_started`, steps, abandon) | no | `analytics.ts` + `events.ts` |
| Persist `valuation_estimates` (location, session) | yes, variant B | no | `estimate/route.ts` |
| OpenAI commentary (location in JSON) | yes, variant B | no | `commentary.ts` |
| Cookie policy pages | exist, do not run before write | `/cookie-policy`, `/cookies` | two different texts |
| Cookie banner | code exists, **0 imports** | - | `cookie-consent-banner.tsx` |

### 7.2 Required order (fail-closed)

1. Show Controller notice (who, estimate purpose, cookies, AI/subprocessor, transfer, rights, privacy URL) - **before** GA, A/B cookie, OpenAI, persist.
2. Strictly necessary cookies: only those counsel classifies under par. 109(8) third sentence. **CANDIDATE:** CRM session CSRF/login yes; valuation A/B 30 days **no**.
3. Analytics / A-B: only after a `consent=all` equivalent bound to *this* purpose.
4. OpenAI: only after subprocessor + transfer notice; payload without direct identifiers; location - counsel decides if still acceptable before contact.
5. Contact fields after that. Service request and marketing only on the contact step, separate.

### 7.3 Subprocessor / transfer assessment (before contact)

| Party | Purpose before contact | Transfer | Guarantee in legal docs | Verified in code? |
|---|---|---|---|---|
| Vercel | widget hosting | DPA: EU Frankfurt | SOC2, DPA | region **not verified** in this worktree |
| Supabase | `valuation_estimates`, later `leads` | DPA: EU Frankfurt/Dublin | SOC2, DPA | region **not verified** in this PR |
| OpenAI | commentary | legal: EU endpoint; public page: USA + SCC | DPA zero retention; SCC | **no** (default API) |
| Google Analytics | pageview/event | USA, SCC on public list | SCC | gtag script, **no** consent mode |
| Resend / Twilio | not called from valuation before contact | - | DPA | N/A before contact |
| Calendly | only if the user clicks | outside DPA Annex A | missing | link |

`UNKNOWN - HUMAN DECISION` owner: counsel - TIA for OpenAI and GA before contact collection; whether variant B may call OpenAI with location.

---

## 8. Tenant activation - fail-closed

`valuation_tenants.enabled` is enough today for public branding (`get_valuation_tenant`). Privacy URL, controller, recipient and retention **are not table columns** (`20260720193000_valuation_tenants.sql`). Privacy URL is a hardcoded map of two slugs; any other slug falls back to `/privacy-policy` (Revolis, not the RK).

**Contract:** a tenant **must not** be `enabled=true` (nor public `/odhad/{slug}`) without all of:

| Gate | Minimum |
|---|---|
| Controller notice | `controller_legal_name`, ICO, address, privacy email |
| Privacy URL | HTTPS URL of **this** controller, 200 OK, Art. 13 covering the widget |
| Retention | documented period for `leads` + `lead_consents` + `valuation_estimates` of this tenant |
| Public recipient | human name of the office and (if a broker will call) broker/team name + channel |
| DPA | signed RK <-> ONLINOVO DPA (Smolko DPA is DRAFT with `DOPLNIT`) |
| Cookie/AI gates | section 7 satisfied on the tenant URL |

Any missing item -> `enabled` stays false; API 404 as today for unknown tenants. No silent fallback to Revolis privacy if the RK is meant to be controller.

---

## 9. Retention, DSAR, withdrawal - incident procedure

### 9.1 Retention (CANDIDATE, not approved periods)

| Record | CANDIDATE period | Source / gap |
|---|---|---|
| `valuation_estimates` without a lead | minimum needed for A/B measurement, then delete/anonymise | no job in code; policy s. 7 does not name this table |
| `leads` + service receipt | until handled + 90 days after RK contract end (policy s. 7) | confirm whether 90 days is proportionate for a seller |
| Marketing consent evidence | until withdrawal + **4 years** (par. 116(5)) | `lead_consents` has no withdrawal |
| Billing (B2B) | 10 years (policy s. 7) | not about the widget seller |
| Logs | 12 months (policy s. 7) | |
| GA / A-B cookies | 30 days in code vs 13 months in policy | align |
| Backups | 90 days after production delete (policy s. 7) | |

`UNKNOWN - HUMAN DECISION` owner: counsel - final periods per purpose.

### 9.2 DSAR (Arts. 15-22)

As-is:

- Public: requests to privacy@revolis.ai, reply within 30 days (`PRIVACY-POLICY` s. 8; `/privacy-policy` page).
- Customers' data subjects: "contact the RK; we will forward" (policy s. 8; DPA Art. 6.2).
- Sales checklist: "Assist the controller; 30 days" (`SALES-LEGAL-CHECKLIST-onepager.md`).
- **No productised DSAR export/erasure for a valuation lead was found in code.**

Procedure (contract until counsel provides another):

1. Intake (privacy@revolis.ai or RK) -> record time, identity, right type, tenant.
2. Determine controller for that purpose (section 2). If Revolis is only processor: **do not decide on the merits**; forward to RK immediately; technical assistance (DPA Art. 6).
3. If joint-control / Revolis controller (visitor, cookies, own analytics): handle within 30 days (Art. 12(3)).
4. Verify identity proportionately; do not disclose third-party data.
5. Scope: `leads`, `lead_consents`, `valuation_estimates`, GA identifiers if any, OpenAI logs if any, suppression.
6. Erasure: respect par. 116(5) (consent evidence is not the same as a marketing profile).
7. Escalation: UOOU https://dataprotection.gov.sk

### 9.3 Withdrawal incident (mistaken dispatch / missing opt-out)

As-is: DPA Art. 7 - processor notifies the controller **within 48 h** of becoming aware; GDPR Art. 33 controller -> UOOU **72 h** if risk. ANNEX-H s. 7: kill switch + record.

Contract:

1. Stop-dispatch (tenant kill switch + global suppression).
2. Scope (how many people, which channel, whether marketing).
3. 48 h notice to RK (if processor) with DPA Art. 7.2 content.
4. Counsel/DPO decides Arts. 33/34 toward UOOU and individuals.
5. RCA; no re-enable without GO.
6. DPO contact in Smolko DPA is `DOPLNIT` - incident owner today is **de facto Founder / privacy@revolis.ai**, not an appointed DPO.

---

## 10. Exact questions for DPO / lawyer

**None of the answers are invented in this document.** Owner of every question: **external counsel** (with Founder GO on the engagement). A DPO is **not appointed** in repo (`docs/legal/DPA_Reality_Smolko.md`).

1. Which legal person is controller for a `/odhad/{slug}` visitor: ONLINOVO, the RK, or Art. 26 joint control of collection? Write the Art. 26 arrangement if joint.
2. Is `privacyAck` + submitting contact a valid Art. 6(1)(b) for one-shot callback, or is Art. 6(1)(a) bound to `request_kind=one_shot_callback` required?
3. May showing the estimate (variant A) be conditioned on handing over phone/email?
4. Are location + session id + IP on estimate-only personal data? If yes, which basis before contact?
5. May OpenAI be called with location before Art. 13 and before contact? Is "EU endpoint / zero retention" contractually true?
6. Are 30-day A/B cookies "strictly necessary" under par. 109(8), or do they need consent?
7. May GA4 pageview on `/odhad` run before cookie consent? Is Google Consent Mode required?
8. Is a live requested call "direct marketing" under par. 116(2)? When does it flip into par. 116(3)?
9. Does par. 116(15) soft-opt-in apply to a free estimate? (CANDIDATE: no.)
10. Does "Chcem dostavat novinky (nepovinne)" satisfy Art. 7 + par. 116(3), or must it name channel/sender/content/withdrawal?
11. Calendly: RK subprocessor or independent controller? Must it enter Annex A and the notice before click?
12. Which retentions do you approve for `valuation_estimates`, service leads, marketing evidence (vs 4 years in par. 116(5))?
13. Who is ONLINOVO's DPO and each RK's DPO? If a DPO is not required, who is the Art. 13(1)(a)-(b) contact?
14. TIA: OpenAI, Google, Vercel, Supabase, Resend, Twilio - which transfers are forbidden before contact?
15. Art. 22: do AI commentary and inbound triage priority stay outside automated decisions with legal effects?
16. Lookalike / offline conversion: ban until a separate consent exists, or is 6(1)(f) even open after EDPB 1/2024?
17. Is a DPIA (Art. 35) required before STF traffic (AI + tracking + outreach)?
18. Signed DPA with the first tenant: which `DOPLNIT` fields block activation?
19. Is `privacy@revolis.ai` a sufficient Art. 13 contact until a DPO exists?
20. par. 116(7)-(10) do-not-call list: verification duty for STF callback vs marketing call?

**This list is not a sign-off.** Answers belong in a dated counsel memo; this file is updated only in a follow-up lane after GO.

---

## 11. Evidence index (every fact)

### 11.1 Repo (this worktree)

- `apps/crm/supabase/migrations/20260720193000_valuation_tenants.sql`
- `apps/crm/supabase/migrations/20260722120000_sandbox_gdpr_consent.sql`
- `apps/crm/supabase/migrations/20260713150000_inbound_auto_response.sql`
- `apps/crm/src/lib/valuation/config.ts`
- `apps/crm/src/lib/valuation/consent-mapper.ts`
- `apps/crm/src/lib/valuation/lead-mapper.ts`
- `apps/crm/src/lib/valuation/tenant.ts`
- `apps/crm/src/lib/valuation/agency-config.ts`
- `apps/crm/src/lib/valuation/ab-test.ts`
- `apps/crm/src/lib/valuation/analytics.ts`
- `apps/crm/src/lib/valuation/commentary.ts`
- `apps/crm/src/lib/valuation/persist-estimate.ts`
- `apps/crm/src/lib/analytics/gtag.ts`
- `apps/crm/src/lib/analytics/events.ts`
- `apps/crm/src/lib/ai/openai.ts`
- `apps/crm/src/lib/acquire/inbound-lead-triage.ts`
- `apps/crm/src/lib/acquire/send-inbound-auto-response.ts`
- `apps/crm/src/components/valuation/ValuationWidgetForm.tsx`
- `apps/crm/src/components/legal/cookie-consent-banner.tsx`
- `apps/crm/src/components/analytics/GoogleAnalytics.tsx`
- `apps/crm/src/app/(marketing)/layout.tsx`
- `apps/crm/src/app/(marketing)/odhad/[agencySlug]/page.tsx`
- `apps/crm/src/app/api/valuation/submit/route.ts`
- `apps/crm/src/app/api/valuation/estimate/route.ts`
- `apps/crm/src/app/(public)/privacy/page.tsx`
- `apps/crm/src/app/(public)/privacy-policy/page.tsx`
- `apps/crm/src/app/(public)/cookie-policy/page.tsx`
- `apps/crm/src/app/(public)/cookies/page.tsx`
- `apps/crm/src/app/(public)/legal/sub-processors/page.tsx`
- `apps/crm/src/app/api/meta/lookalike/route.ts`
- `apps/crm/docs/legal/PRIVACY-POLICY-zasady-ochrany-osobnych-udajov.md`
- `apps/crm/docs/legal/DPA-zmluva-o-spracuvani-osobnych-udajov.md`
- `apps/crm/docs/legal/ANNEX-H-EPRIVACY-OUTREACH-COMPLIANCE.md`
- `apps/crm/docs/legal/LEGAL-GAP-LIST-enterprise-procurement.md`
- `apps/crm/docs/legal/SALES-LEGAL-CHECKLIST-onepager.md`
- `apps/crm/docs/legal/RACI-LEGAL-COMPLIANCE-IMPLEMENTATION-90D.md`
- `apps/crm/docs/legal/VOP-vseobecne-obchodne-podmienky.md` (Art. 8.5 outreach -> ANNEX-H)
- `docs/legal/DPA_Reality_Smolko.md`
- `apps/crm/tests/verification/valuation-widget.verification.test.ts`

### 11.2 Law

URLs in section 1.1.

---

## 12. Unknowns - owner (summary)

| ID | Unknown | Owner |
|---|---|---|
| U1 | Controller vs joint-controller vs processor on the widget | External counsel |
| U2 | Legal person "Revolis.AI" vs ONLINOVO ICO 54166942 | Founder + counsel |
| U3 | Whether estimate-only (location/session/IP) is personal data | Counsel |
| U4 | Art. 6(1)(b) vs (a) for callback and variant A gate | Counsel |
| U5 | Service call vs par. 116 direct marketing | Counsel |
| U6 | Soft-opt-in on a free estimate | Counsel |
| U7 | A/B + GA before consent | Counsel + (after GO) engineering |
| U8 | OpenAI region / zero retention / TIA | Counsel + engineering |
| U9 | Calendly role | Counsel |
| U10 | Retention periods per purpose | Counsel |
| U11 | Appointing a DPO | Founder |
| U12 | DPIA need before traffic | Counsel |
| U13 | Ads/offline conversion ever ON | Counsel + Founder (default OFF) |
| U14 | Signed DPA of first tenant (Smolko DRAFT) | Founder + RK counsel |
| U15 | Whether `privacy@revolis.ai` suffices as Art. 13 contact | Counsel |

---

## 13. Stop line

- No runtime code, migration, production copy, merge, or traffic enablement from this PR.
- No "GDPR approved" claim.
- Further work (L16 UX copy in code, L17 receipt/suppression implementation) **only after GO** on section 10 answers and after this contract is updated by a counsel memo.

**GO owner now:** Founder engages external counsel / DPO on section 10. Engineering does not start implementation.
