# COMPANY.md — Revolis.AI

**Cieľová cesta:** `brain/identity/COMPANY.md`
**Účel:** Čo je Revolis, pre koho, za koľko a kam ide. Druhý dokument po
FOUNDER.md, ktorý si prečíta akýkoľvek AI nástroj pred prácou.
**Vlastník:** founder · **Posledné overenie:** 2026-07-24

## North Star
> **Revolis nie je CRM s AI. Revolis je organizačná pamäť realitnej
> kancelárie, ktorá sa s každým obchodom stáva neskopírovateľná.**

Dôsledok pre každé rozhodnutie: model sa dá vymeniť za deň, históriu
rozhodnutí a výsledkov konkurencia nedobehne. Investuj do pamäte a učenia,
nie do naháňania najnovšieho modelu.

## Firma a produkt
- **ONLINOVO s.r.o.**, Štúrova 130/25, 058 01 Poprad (IČO 54166942, IČ DPH SK2121592869), zastúpená Andrejom Ondrušom.
- **Revolis.AI** — AI-first B2B CRM pre slovenské realitné kancelárie.
  Produkcia: `app.revolis.ai`. Repo: `github.com/onlinovosk-bit/RealitkaAI`
  (lokálne `C:\RealitkaAI`).
- **Stack:** Next.js / TypeScript / Tailwind / Supabase / Stripe / OpenAI,
  deploy Vercel. Multi-tenant s RLS.
- **Vývojový model:** Claude (strategia/governance) + Cursor + Ruflo Swarm
  (nočná implementácia) + Obsidian vault (`C:\RealitkaAI-Memory\`) +
  `brain/` Memory Engine v repe.

## Zákazníci (stav 2026-07-24)
| Kto | Stav | Poznámka |
|---|---|---|
| **Reality Smolko** (Poprad/Prešov, R. Smolko) | **1. platiaci** od 05/2026 | Market Vision 199 €/mes, zmluva RL-RS-2026/01270426. 439 importovaných kontaktov. Widget `/odhad/reality-smolko` live. Google Ads A/B štart 27.07. |
| **REALITY KAMZÍK** (Poprad, Ing. P. Šalajka / Ing. J. Vitko) | **2., dohodnuté 23.07** | Founding Partner: 99 € onboarding + 3 mes. 0 € + 199 € pri realizovanom obchode. Zmluva pripravená. Hák: platili 300 €/tip za predávajúceho. |
| **Mega realitka** (T. Harasim, multi-pobočky, Realvia) | demo pipeline | 2 termíny poslané 23.07. Realvia integráciu máme hotovú. |
| **AA Reality Košice** (I. Molnár) | horúci lead | Explicitne žiadal „vyhľadávanie predávajúcich" — spúšťač celého widgetu. Volať **štvrtok 30.07**. Tenant pripravený, `enabled=false`. |
| Pipeline | 63 firiem v trackeri | `docs/sales/revolis-sales-tracker.xlsx`, 30+ oslovených emailom. |

## Kľúčový produkt akvizície: valuačný widget
`/odhad/[agencySlug]` — B2C funnel pod značkou kancelárie. Majiteľ zadá
parametre nehnuteľnosti → dostane orientačné cenové pásmo z oficiálnych dát
(ŠÚ SR/NBS, `regional-prices.json`) → kancelárii zostane kontakt, termín
predaja a cenové očakávanie. Systém lead automaticky vyhodnotí (AI triage)
a pošle notifikáciu. GDPR consent (`lead_consents`, timestamp + verzia
politiky) sa zapisuje v jednej transakcii s leadom.
Sandbox: `/odhad/demo` — `is_sandbox=true`, zapisuje do
`sandbox_submissions`, NIKDY do `leads`.
**Predajný argument:** systematický zdroj predávajúcich namiesto náhodných
tipov. Konkurenčný benchmark: trhovahodnota.sk.

## Pricing (locked 06/2026)
Seaty: SOLO 79 €/30cr · TEAM 71 €/25cr (min 3) · OFFICE 63 €/20cr (min 10).
Cockpit: OWNER 349 €/100cr · OWNER PRO 499 €/200cr (vypnutý).
Historické tiery v zmluvách: Market Vision 199 €/mes.
Kredity: unlock leadu 4 · AI analýza 1 · AI email 1 · popis inzerátu 2.
Grantované kredity expirujú mesačne, kúpené nikdy; poolované za agentúru.
Stripe je autoritatívny billing engine (`send_invoice`, kompatibilné s
bankovým prevodom); entitlement v tabuľke `agencies`.

## Obchodný model akvizície
**Founding Partners Program:** 10 kancelárií, 60-dňový program, zakladajúca
cena zamknutá permanentne. Kanál: manuálny outreach (cold email s opt-out
vetou → telefonát D+4 → videohovor 20–30 min, nie osobné stretnutie).
Právny základ B2B oslovenia: oprávnený záujem (čl. 6/1/f GDPR) + opt-out
v každom maile — opt-out veta je podmienka zákonnosti, nie zdvorilosť.

## Autoritatívne dátové zdroje (nezamieňať)
- `leads` — **autoritatívna pre CRM** (widget, inbound, Realvia, BRI, ~80+
  call sites).
- `saas_leads` — autoritatívna pre SaaS funnel (`/proof`, demo booking).
- `revolis_leads` — **legacy pozostatok**, 0 použití v aplikácii, deprecated.
- Health endpoint: **`/api/healthz`** (200). `/api/health` neexistuje (401).

## Konkurencia a trh
Slovenský realitný softvér: Realvia (integrácia hotová, PRs #10/#11),
Realsoft, backOFFICE, RealitApp, easyReal. B2C valuačné funnely:
trhovahodnota.sk. Zväzy: NARKS, ZRKS, Realitná únia SR (~425 členov —
zdroj databázy prospektov).

## Čo je odložené a za akou bránou
- Rolové AI agenty (CTO/PM/CMO…), L99 komponenty (Intent/Simulation/Evolution
  Engine…) → brána **3 platiaci zákazníci**.
- VPS + lokálne modely (Ollama, Whisper, OCR) → brána **API náklady >200 €/m
  alebo on-prem požiadavka zákazníka**.
- Listing video ako produktový modul → brána **≥3 zákaznícke požiadavky
  alebo 2 zaplatené videá ako služba**. Ako akvizičná služba (Track A) môže
  ísť hneď.
- Learning Academy (paralelný startup) → potvrdene odložené.
- Obsidian rozšírenia (Smart Connections, Knowledge Graph…) → brána
  >1 zákazník. Nasadené hneď: Git, Dataview, Templater.
