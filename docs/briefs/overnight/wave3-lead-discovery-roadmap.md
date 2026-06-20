# Wave 3 — Lead Discovery Roadmap (analýza, nie build)

> **Dátum:** 2026-06-19 · **GATE 3** · Prompt: `docs/prompts/L99-lead-discovery-prompt.md`  
> **Kontext:** 439 leadov v PROD (Realvia import) — identity only, BRI honest pending. UC export API = zákazky + makléri, **nie** klienti. Smolko Dopyty CSV = VALIDATE (čaká odpoveď).

---

## Executive summary

Legálne kanály získavania leadov do Revolis CRM sa delia na tri vrstvy:

1. **TERAZ (infra existuje)** — manuálny/CSV import, ručný záznam, first-party formuláre cez existujúce API.
2. **PO DÁTOCH / PO SÚHLASE klienta** — Realsoft Dopyty export, reaktivácia 439 kontaktov s obohatením.
3. **PO NASTAVENÍ kampaní** — Meta Lead Ads, Google Lead Forms (všetko so súhlasom + webhook).

**Nestavať:** lead attribution engine, dedup ML, buyer-intent scraping, portálové scraping, kataster PII — blokované dátami, právom alebo Ústavou (timing/data).

---

## Legálne spôsoby (zoradené: pripravené hore)

| # | Spôsob | Kanál | Ako tečie do CRM | Právny základ | Pôvod dát | ToS OK? | Pripravenosť | Effort |
|---|--------|-------|------------------|---------------|-----------|---------|--------------|--------|
| 1 | **Ručný záznam makléra** | Vlastné | UI `/leads/new` → `POST /api/leads` | 6(1)(b) zmluva / 6(1)(f) pri obch. kontakte + poučenie | Klient pri telefáte/obhliadke | ✅ | **TERAZ** | Nízky |
| 2 | **CSV / bulk import** | Vlastné | `/import` → `POST /api/import` (max 500) | 6(1)(b) alebo súhlas pri importe | Klient/export RK | ✅ | **TERAZ** | Nízky |
| 3 | **Universal import (VCF, Outlook, Flowii…)** | Vlastné | `import_jobs` + mapper | Súhlas pri pôvodnom zbere | Vlastná DB RK | ✅ | **TERAZ** | Nízky |
| 4 | **Buyer onboarding formulár** | Vlastné web | `(public)/buyer-onboarding` → Supabase `leads` | 6(1)(a) súhlas vo formulári | First-party web | ✅ | **TERAZ** (ak nasadený na webe) | Stredný |
| 5 | **Smolko Dopyty CSV z Realsoft admin** | Nehnuteľnosti/Realsoft | CSV → `/api/import` + mapovanie polí (budget, dopyt, inzerát) | 6(1)(b) zmluva RK–portál; dopyt = súhlas záujemcu | Oficiálny export klienta | ✅ (export vlastníka dát) | **PO CSV od Smolka** | Nízky–stredný |
| 6 | **Realvia webhook (properties)** | Realvia | Už tečie → `properties` (nie plné lead polia) | Zmluva Realvia integrácia | API partner | ✅ | **TERAZ** (zákazky) | — |
| 7 | **Reaktivácia 439 kontaktov — obohatenie so súhlasom** | Vlastné DB | Kampaň (email/SMS) → link na formulár preferencií → update `leads` | 6(1)(a) nový súhlas alebo 6(1)(f) + balancing test | Existujúci kontakt RK | ✅ ak opt-in | **VALIDATE Ústava** | Stredný |
| 8 | **Microsite K3 + lead formulár (noindex → publish po GO)** | Vlastné | Vertical pack microsite + consent → API | 6(1)(a) | First-party | ✅ | **PO human approval K3** | Stredný |
| 9 | **„Upozorni ma na podobnú ponuku“ (waitlist)** | Vlastné | Formulár pri zákazke / sold listing → `leads` + tag | 6(1)(a) | First-party | ✅ | **BACKLOG** (po K4) | Stredný |
| 10 | **Dopyt na neexistujúcu ponuku (buyer gap)** | Vlastné CRM | Maklér zaznamená dopyt → matching na nové `properties` | 6(1)(b)/(f) | First-party | ✅ | **BACKLOG** | Stredný |
| 11 | **Meta Lead Ads → webhook** | Meta | Lead Ads natívny form → Zapier/Make alebo `/api/import` | 6(1)(a) Meta lead ad consent | Platforma + súhlas | ✅ Meta policies | **PO nastavení účtu** | Stredný |
| 12 | **Meta CAPI (attribution only)** | Meta | Server event — **nie** nový lead | 6(1)(a) | First-party pixel | ✅ | PO pixel | Nízky |
| 13 | **Google Ads Lead Form Extension** | Google | Google webhook → CRM endpoint | 6(1)(a) | Google form consent | ✅ | **PO Ads kampani** | Stredný |
| 14 | **GA4 + GTM lead event (web)** | Google | Event → BigQuery/Zapier → import | 6(1)(a) cookie + form consent | First-party web | ✅ | PO GTM | Stredný |
| 15 | **Google Business Profile správy** | Google | Manuálny prepis alebo GBP API (obmedzené) | 6(1)(b)/(f) | Platforma | ✅ | VALIDATE | Nízky |
| 16 | **Referral / odporúčanie** | Vlastné | Maklér → `/api/leads` + `source=referral` | 6(1)(f) | First-party | ✅ | **TERAZ** | Nízky |
| 17 | **Email engagement (Resend webhook)** | Vlastné | `resend-webhook` → engagement, nie nový lead | 6(1)(f) | Existujúci lead | ✅ | TERAZ (reaktivácia) | Nízky |
| 18 | **Webex XML feed (Varianta 1 — vlastný web)** | Vlastné | XML z Revolis → portál (outbound), lead späť cez formulár | Zmluva RK | First-party | ✅ | Existujúce rozhodnutie | — |

---

## Neobvyklé legálne uhly (≥3)

| Spôsob | Prečo funguje | Brána |
|--------|---------------|-------|
| **Reaktivácia 439 s „cenová analýza zadarmo“ výmenou za preferencie** | Nie nový lead-gen — obohatenie existujúcej DB; hodnota výmenou za explicitný update | Vyžaduje nový/ potvrdený súhlas → Ústava VALIDATE |
| **Waitlist pri „Predané“ (referencia)** | Kupujúci sám požiada o podobnú nehnuteľnosť — first-party, vysoký intent | K3 microsite + consent formulár |
| **Buyer gap capture** | Dopyt na typ, ktorý RK nemá v `properties` — budúci match keď zákazka príde cez Realvia | Čisto CRM + Playbook, žiadne externé PII |
| **RPO firemné obohatenie (B2B lead)** | IČO/DIČ z legálneho RPO API — **nie** súkromní predajcovia | Zhluk 4 master-data map — firemné leady only |

---

## TOP 3 — začať (legálne, effort, hodnota)

### 1. Smolko Dopyty CSV → import pipeline (VALIDATE → BUILD)
- **Prečo:** Odomkne 439+ leadov s reálnymi poľami (budget, typ, inzerát) bez scrapingu.
- **Tok:** Realsoft admin export → mapovanie → `POST /api/import` (alebo dedicated mapper).
- **Blokátor:** CSV od klienta (founder akcia).
- **Ústava:** Q1 áno (klient zaplatí za CRM s dopytmi) · Q8 timing = **správny čas až keď CSV dorazí**.

### 2. First-party dopytový formulár na webe / microsite
- **Prečo:** Nové leady s plným súhlasom; infra `POST /api/leads` + buyer-onboarding pattern existuje.
- **Tok:** realitysmolko.sk alebo K3 microsite (po human GO) → consent checkbox → CRM + `source` provenance.
- **Effort:** Stredný (1 PR: formulár + privacy link, nie attribution engine).

### 3. Reaktivácia 439 — obohatenie so súhlasom (VALIDATE)
- **Prečo:** Najrýchlejší „lead“ zisk bez nového acquisition — doplniť BRI polia pre Playbook.
- **Tok:** Segment → email/SMS s linkom na preferenčný formulár → update lead row + audit.
- **Blokátor:** GDPR balancing test / explicit opt-in (gdpr-advisor skill pred BUILD).
- **Nestavať automaticky** — samostatné rozhodnutie cez Ústavu (overnight plán).

---

## ZAHODENÉ (veto právna/governance)

| Spôsob | Vyradená brána | Dôvod |
|--------|----------------|-------|
| Scraping Nehnuteľnosti.sk / TopReality inzerátov pre kontakty | 2, 3 | PII bez súhlasu; ToS portálu |
| Kataster / ÚGKK vlastníci bez zmluvy | 2, 3 | Explicitne zakázané v master-data map |
| Kúpené databázy (telefónne zoznamy) | 2, 5 | Bez provenancie a súhlasu |
| Apify / automatizované portálové crawlery | 3, 4 | ToS + stealth |
| Fake Meta/Google profily pre lead-gen | 3, 4 | Policy violation |
| UC export API ako zdroj klientov | 2 | **Overené:** API dáva zákazky, nie dopyty |
| Social skupiny scraping (FB groups) | 2, 3, 4 | PII + ToS; historické rozhodnutie vs. ZAKÁZANÉ AKCIE |
| „Lead hunter“ z inzerátov konkurencie | 1, 2, 3 | Žiadny klient nezaplatí za ilegálny zdroj; Ústava REJECT |

---

## Backlog map (nestavať vo Wave 3)

| Feature | Verdikt | Dôvod |
|---------|---------|-------|
| Lead attribution multi-touch | BACKLOG | Potrebuje traffic + UTM discipline |
| Dedup ML cross-channel | BACKLOG | Potrebuje ≥2 kanály s objemom |
| Buyer intent z portálov | REJECT | Scraping |
| Lead radar / market gap scraping | BACKLOG | Data-blocked |
| Enrichment bez súhlasu | REJECT | GDPR |
| Genome / simulation / scoring-engine | BACKLOG | Vlna 3 cargo cult pri 1 RK |

---

## GATE 3 checklist

- [x] Analytický výstup (tento dokument)
- [x] TOP 3 + zahodené s bránou
- [x] Žiadny lead-feature kód v Wave 3
- [ ] Founder: získať Smolko Dopyty CSV
- [ ] Founder: rozhodnutie reaktivácia 439 (Ústava + gdpr-advisor)

**Ďalší build až po:** CSV dorazí + explicit BUILD rozhodnutie na jednu z TOP 3.
