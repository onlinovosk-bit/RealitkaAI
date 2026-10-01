# PII-GATE-AUDIT — brány pred osobnými údajmi, logy a externé volania

**Dátum:** 2026-10-01 · **Brána:** `GO PII-GATE-AUDIT` (rozsah „obe oblasti" určil founder, lebo pojem nebol nikde definovaný)
**Referencia:** kód na `origin/main` (`4850ca9`) + opravy z #781. **Read-only, nič sa nemenilo.**

## Metóda a poctivé hranice
Dva nezávislé prechody kódu (brány v API; logy a externé volania). Každé tvrdenie označené **VERIFIED**, ak som riadky prečítal sám po prechode, inak *nepreverené mnou*. Jedno tvrdenie z prechodu som overením **vyvrátil** (call-coach prepis sa maskuje, `call-coach/stream/route.ts:62` volá `sanitizeText`) a do reportu nejde.
**Nevidel som:** RLS politiky (preto pri bránach nižšie „exploitovateľnosť závisí od RLS"), skutočné PROD údaje, `"use server"` súbory okrem jedného, Brevo/Clearbit/Twilio rozsah.

---

## A. Brány pred PII v API

### A1 — Fail-open brána, ktorú sweep test nevidí (VYSOKÁ, VERIFIED)
`tests/verification/tenant-failopen-sweep.verification.test.ts` hľadá regex `/\?\.agency_id\s*&&/`. Existuje **druhý tvar toho istého omylu**, ktorý regex nezachytí:

```ts
if (callerProfile?.agency_id) {          // null agency_id → celý blok sa preskočí
  ... if (leadRow?.agency_id !== callerProfile.agency_id) → 403
}
```
Profil bez `agency_id` (presne to vyrábal `invite`, #447) tak **prejde bránou**. Overené na 8 miestach v 4 súboroch:

| Route | Riadky |
|---|---|
| `api/leads/[id]/activities` GET / POST | 23 / 53 |
| `api/leads/[id]/moves` GET / POST | 18 / 43 |
| `api/tasks/[id]` PATCH / DELETE | 28 / 88 |
| `api/leads/[id]` GET | 276 |

Čítanie ide cez request-scoped klienta, takže druhým múrom je RLS (**neoverené**, či zastaví profil s `agency_id = NULL`). Nález je tá istá trieda ako #730; sweep ju minul, lebo je to iný tvar.
Overené ako **nie brány** (nezameňovať): `workdesk/first-audit:56`, `enterprise/onboard-start:57`. `outreach/approve|send` a `drafts/…/approve` majú rovnaký tvar, ale downstream `approve-draft.ts` je fail-closed (prechod, nepreverené mnou).

### A2 — `GET /api/leads/[id]/moves` číta bez scoped klienta (VERIFIED)
`getPipelineMovesByLeadId(id)` (`leads-store.ts:1389`) nemá parameter na scoped klienta a volá `resolveTenantSupabase()` bez argumentu — trieda chyby z #443. Čo presne vtedy vyberie, som nečítal.

### A3 — `deal-strategy` bez tenant kontroly (VERIFIED, dopad podľa RLS)
`api/leads/[id]/deal-strategy` (GET): iba `getUser`, potom `leads.select("*").eq("id")` a celý riadok ide do LLM (`generateDealStrategy`). `sales-brain` má tiež bez tenant kontroly, ale vyberá úzky zoznam stĺpcov bez mena/e-mailu (menšia váha). Súrodenci (`matches`, `assistant`, `leads/[id]`) `sameAgency` majú.

### A4 — `ghostwriter/generate` ukladá bez tenanta (VERIFIED)
`insert({ owner_address, event_type, letter_html, letter_text })` cez admin klienta — **bez `agency_id` a `profile_id`**. Adresa vlastníka + udalosť (predvolene „dedičstvo") ostáva v DB bez nositeľa. *(Prechod uvádza, že preto kontrola vlastníctva v `send-email` nikdy nesedí — nepreverené mnou.)*

### A5 — Verejné „capability" URL (STREDNÁ, VERIFIED pri 1)
Bez prihlásenia, bez agency filtra, kto drží UUID/token, vidí dáta: `/nehnutelnosti?intentId=` (`fetchIntent`, admin `select("*")` z `buyer_intents`, vrátane voľného textu kupujúceho; UUID je aj v redirect URL), `GET /api/onboarding/session` (`form_data`), `/demo/live?sid=` (`demo_prefill_links`). Dve posledné *nepreverené mnou*. Nie je to enumerácia (rate-limit, dlhé tokeny), ale token v URL = únik cez referer/logy.

### A6 — Nižšia váha (nepreverené mnou)
`POST /api/ghostwriter/send-email` pošle ľubovoľné HTML na ľubovoľnú adresu z `noreply@revolis.ai` (rate-limit 20); `GET /api/concierge/properties` stojí na jednom zdieľanom secrete; `POST /api/leads/inbound` vracia `agency_id` a surovú DB chybu.

### Čo je v poriadku (prechod aj moje čítanie)
`call/analyze` a `hubspot/sync` (`sameAgency` pred admin klientom), `invite`, `profiles/[id]`, `ai/lead-events`, `ai/process-lead`, cron/platform routes (HMAC / `isAuthorizedCronBearer`), `valuation/submit`, `calendly` (podpis). `sameAgency()` je fail-closed.

---

## B. PII v logoch a externých službách

### Overené (VERIFIED)
| # | Kde | Čo | Závažnosť |
|---|---|---|---|
| B1 | `api/meta/lookalike/route.ts:64-73` | Komentár „hashed emails (SHA256)", kód posiela `l.email.toLowerCase().trim()` **v čistom texte** do Meta (`schema: ["EMAIL"]`). Súhlas (čl. 6(1)(a)) v route nevidno. Chyba sa nedá zamietnuť ako „len komentár". | **VYSOKÁ** |
| B2 | `api/ghostwriter/generate/route.ts:39-46` | Meno vlastníka (`vážený ${ownerName}`), adresa a udalosť „dedičstvo" idú do OpenAI nemaskované. Master-data mapa (Zhluk 3, podľa prechodu) katastrálne dáta vlastníkov bez zmluvy ÚGKK nepovoľuje; odkiaľ UI meno berie, v route nevidno. | **VYSOKÁ** (GDPR gate) |
| B3 | `lib/leads-store.ts:693-694` | `console.log('updateAiRecommendation:', { id, payload, data, error })` — celý riadok z `.select("*")`, bez podmienky v produkcii. Či `ai_recommendations` nesie osobné údaje, som nečítal. | STREDNÁ |
| B4 | `api/founder/send-legal-update-email/route.ts:59` | `console.error("Email failed for " + profile.email …)` — e-mail používateľa do logu. | STREDNÁ |
| B5 | `lib/hubspot/sync.ts:37-44` | Meno, e-mail, telefón leadu do HubSpotu; v `docs/legal` nie je o HubSpote žiadna zmienka (grep). | STREDNÁ (chýbajúci právny podklad) |
| B6 | `api/ai/call/transcribe/route.ts:30-34` | Surové audio hovoru → OpenAI Whisper, mimo sanitizéra. Route je po prihlásení; súhlas s nahrávaním/notice v kóde nenájdený (absencia). | STREDNÁ |

### Hlásené prechodom, nepreverené mnou
Mená/rozpočet/správa leadu idú do LLM nemaskované (sanitizér maskuje e-mail/telefón/IBAN/RČ, nie mená): `inbound/auto-reply.ts:60-63`, `multi-channel-sender.ts:161-185`, `ai-outreach.ts:112-120`, `embeddings.ts:88,95` (+ hromadný backfill); `webhooks/calendly:68-71` ukladá celé `raw_payload`; `ghostwriter/generate:92-96` (= A4); plné `error` objekty Resend/acquire v logoch (`neighborhood-watch/subscribe:56`, `acquire/email:480`, `inbound-lead-triage:169`).

### Zdokumentované a v poriadku
OpenAI/Anthropic ako subprocesor s SCC (`docs/legal/DPA_Reality_Smolko.md:265`); `valuation` commentary (minimalizované, `seller-trust-legal-trust-contract.md:187-194`); `email-engagement` (bez PII), `process-lead` (iba `has_email/has_phone`), `auto-response-outcome` (len doména), `inbound_mail_outcomes` (len doména + príznaky, GDPR rozbor v migrácii).

---

## Odporúčané poradie (jedna brána = jedno `GO`)
1. **`GO TENANT-GATE-2`** *(odporúčam prvé)* — A1 + A2: 8 miest prepísať na `sameAgency()` (fail-closed), rozšíriť sweep test o tvar `if (x?.agency_id) {`, `getPipelineMovesByLeadId` dostane scoped klienta. Malé, mutačne dokázateľné, chráni dáta referenčného klienta (retencia). A3 (`deal-strategy`) patrí do rovnakej brány.
2. **`GO META-LOOKALIKE-HASH`** — B1: buď SHA-256 normalizovaný e-mail + overenie súhlasu, alebo vypnúť route. Rozhodnutie o súhlase je founderovo.
3. **`GO LOG-PII-CLEANUP`** — B3, B4 (+ nepreverené logy po overení).
4. **Founderovo rozhodnutie, nie kód:** B2/A4 (ghostwriter a katastrálni vlastníci) — Constitution v2: bez zdroja v master-data mape je to STOP/BACKLOG; B5/B6 chýbajúci právny podklad (HubSpot, nahrávky).
