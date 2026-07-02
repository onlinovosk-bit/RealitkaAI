# L99 PROMPT — Lead Acquisition Discovery (legálne kanály, žiadny slop)

## ROLY (30 špecialistov, perspektívy nie tituly)
Vedenie (3): Lead Acquisition Architect · Growth Systems Principal · Revenue Operations Lead
Nehnuteľnosti/Realsoft/Webex (6): UC Export API Integration Eng · Realsoft Data Pipeline ·
  Webex Webhook Eng · CRM Ingestion Architect · Dopyt/Inquiry Capture · Portal Lead-Form Integration
Facebook/Meta (5): Meta Lead Ads · Meta Conversions API · Pixel/Attribution · Social Funnel Architect ·
  Meta Compliance & Policy Reviewer
Google (5): Google Ads Lead-Form · GA4 Measurement · GTM Architect · SEO/Organic Lead · Google Business Profile
Lead Intelligence (6): Lead Attribution · Deduplication · Buyer Intent · Lead Scoring/BRI ·
  Lead Recovery · Next-Best-Action
Právna/etická/governance (5) — VETO PRÁVO: GDPR/Data Protection Counsel · Consent & Opt-in Architect ·
  PII Governance · Anti-Scraping/ToS Compliance Reviewer · Lead Provenance Auditor

## ÚLOHA
Nájdite ČO NAJVIAC spôsobov, ako legálne získať leady (záujemcov o kúpu/predaj/prenájom)
do Revolis CRM zo štyroch kanálov: (1) Nehnuteľnosti.sk / Realsoft / Webex, (2) Facebook/Meta,
(3) Google, (4) vlastné kanály Reality Smolko (web, telefón). Pre KAŽDÝ spôsob uveďte, ako
dáta reálne tečú do CRM (API/webhook/export/manuálne).

## TVRDÁ PRÁVNA BRZDA (governance roly majú VETO — bez nej spôsob NEEXISTUJE)
Každý navrhnutý spôsob MUSÍ prejsť všetkými piatimi bránami, inak sa NEuvedie:
1. **Právny základ (GDPR čl. 6):** súhlas, zmluva, alebo oprávnený záujem s balancing testom.
   Bez právneho základu → ZAHODIŤ.
2. **Pôvod dát:** človek dáta poskytol sám (formulár, dopyt, súhlas), alebo ich dáva oficiálne API
   s licenciou. NIE scraping, NIE kúpené databázy, NIE PII z katastra/portálov bez súhlasu.
3. **ToS kanála:** spôsob neporušuje podmienky Meta/Google/Nehnuteľnosti. NIE fake profily,
   NIE automatizované scrapovanie proti ToS, NIE obchádzanie rate-limitov.
4. **Transparentnosť:** subjekt vie, že jeho dáta idú do CRM (privacy notice, opt-in). NIE stealth.
5. **Auditovateľnosť:** vie sa dokázať, odkiaľ lead prišiel a s akým súhlasom (provenance).

ZAKÁZANÉ (automaticky vyradiť, aj keď "fungujú"): scraping katastra/portálov, kúpené
databázy, fake/burner Meta-Google profily, skryté lead-gen funnely bez súhlasu, oslovovanie
vlastníkov z PII bez právneho základu, obchádzanie ToS. Toto je stála línia ZAKÁZANÉ AKCIE.

## ČO HĽADAŤ V KAŽDOM KANÁLI (legálne mechanizmy)
- **Nehnuteľnosti/Realsoft/Webex:** dopyty/inquiry, ktoré záujemca sám podá k inzerátu (s ich
  súhlasom); lead-form pri inzeráte; oficiálny export, ktorý klient (Smolko) vlastní; webhook
  z vlastného webu realitysmolko.sk. (Pozn.: UC export API dáva len zákazky+maklérov, NIE
  klientov — overené v dokumentácii. Klienti len ručným exportom z admina, ak existuje.)
- **Meta:** Meta Lead Ads (natívny lead formulár so súhlasom) → Conversions API → CRM webhook;
  Messenger opt-in; remarketing z vlastných (first-party) dát s consentom.
- **Google:** Google Ads Lead Form Extensions; GA4 + GTM event na lead form na webe; SEO
  organické formuláre; Google Business Profile dopyty/správy.
- **Vlastné:** kontaktný/dopytový formulár na webe s opt-in; landing page na zákazku (z K3
  microsite) s lead formom + súhlasom; telefonát zaznamenaný s GDPR poučením.

## NEOBVYKLÝ UHOL (povinný — aspoň 3 spôsoby, čo by nikoho prvého nenapadli)
Hľadajte aj kanály, čo nie sú zjavné, ale legálne a špecifické pre realitný trh SK:
- Reaktivácia VLASTNEJ databázy 439 kontaktov (už ich máš, so súhlasom z importu) — nie nový
  lead-gen, ale kvalifikácia existujúcich cez hodnotnú ponuku (napr. cenová analýza zadarmo
  výmenou za doplnenie preferencií = legálny enrichment so súhlasom).
- "Predané/prenajaté" referencie ako lead magnet (záujemca o podobnú nehnuteľnosť sa prihlási sám).
- Dopyt na NEEXISTUJÚCU ponuku: záujemca hľadá, čo Smolko nemá → zachytený dopyt = budúci match
  (Buyer Matching na nové zákazky), čisto z first-party dát.
- (Panel doplní ďalšie — podmienka: legálne, first-party alebo oficiálne API, auditovateľné.)

## VÝSTUP (pre každý spôsob)
| Spôsob | Kanál | Ako tečie do CRM | Právny základ | Pôvod dát | ToS OK? | Pripravenosť (teraz/po dátach) | Effort |
Zoradiť podľa: legálne+pripravené teraz HORE, blokované/rizikové DOLE.
Na konci: TOP 3 spôsoby na začať (legálne, najnižší effort, najvyššia hodnota) + ktoré
ZAHODENÉ a prečo (ktorá brána ich vyradila).

## ČO PROMPT NESMIE VYROBIŤ
- Žiadny spôsob bez právneho základu, pôvodu dát a ToS súladu.
- Žiadny "growth hack", čo je v skutočnosti scraping/fake/stealth.
- Žiadny generický slop ("rob Facebook reklamu") — každý spôsob konkrétny, s tokom dát do CRM.
- Žiadne vymyslené čísla konverzií (AP-001).
