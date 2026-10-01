---
title: "Overnight Master Brief 11 — Revival Wave: Zhluk 4 + Zhluk 2"
project: Revolis.AI
type: overnight-master-brief
brief_number: 11
status: ready
created: 2026-06-16
tags: [revolis, revival, rpo, kataster, enrichment, no-fake-data]
related:
  - "[[master-data-sourcing-map]]"
  - "[[overnight-master-brief-9-v2]]"
  - "[[overnight-master-brief-8]]"
  - "[[enrichment-research-poc-brief]]"
---

# OVERNIGHT MASTER BRIEF 11 — Revival Wave (Zhluk 4 + Zhluk 2)

> Pokračovanie PORADIA OŽIVOVANIA z master-data-sourcing-map.
> Zhluk 1 (Action Queue) hotový (#202). Teraz Zhluk 4 (RPO + validácia)
> a Zhluk 2 (kataster WMS). Cieľ: oživiť MAXIMUM toho, čo legálne dostupné
> dáta unesú TERAZ. Žiadna fake funkcionalita — čo nemá zdroj, ostáva pending.

## REALITA DÁT (overené, neignoruj)
442 leadov: name/email(442)/phone(432) MÁ. budget/location/property_type PRÁZDNE.
status 442× "Nový". ai_priority 439× "Nízka". Dôsledok:
- RPO svieti len pre firemné leady s IČO (väčšina sú jednotlivci → málo).
- Kataster "pod adresou" potrebuje location (prázdne) → mapa ako nástroj OK,
  auto-centrovanie na adresu zatiaľ nie.
- Reálne použiteľné HNEĎ: validácia telefónu/emailu (dáta máš).

## ŽELEZNÉ PRAVIDLO (z Brief 7/9v2, merge gate)
- Featura sa "oživí" (flip pending→live) LEN ak do nej reálne tečú dáta.
- Žiadne vymyslené čísla, žiadne mock dáta, žiadny stub vydávaný za live.
- Čo nemá pripojený zdroj → ostáva čestne pending ("počíta sa z {zdroj}").
- GUARD test: render nesmie obsahovať zakázané mock reťazce.
- Konzultuj master-data-sourcing-map pre legálnosť KAŽDÉHO zdroja.

## WAVE A — Zhluk 4: Enrichment na REÁLNYCH dátach
`apps/crm/src/lib/enrichment/` (napoj existujúci engine z Briefu A na reálne zdroje):
1. **Validácia telefónu/emailu (funguje HNEĎ na 432/442):**
   - Reuse phone-normalization z import-smolko-contacts.ts (medzinárodné čísla!).
   - Označ leady s nevalidným/chýbajúcim telefónom/emailom (data quality flag).
   - Zapíš výsledok + audit do enrichment_log (ktorý provider, ktoré pole).
2. **RPO firemné dáta (Zhluk 4, len ak lead má IČO / je firma):**
   - Nahraď FinStat/ORSR STUB reálnym volaním RPO API
     (`https://api.statistics.sk/rpo/v1/` — pozn.: smeruj na V2, V1 deprecated;
     over aktuálny endpoint). CC BY 4.0 → uveď zdroj v UI/dokumentácii.
   - LEN pre leady, čo majú IČO alebo sú typu firma. Inak preskoč (nie chyba).
   - Cachuj (dáta sa menia zriedka), rate-limit.
3. NEVYMÝŠĽAJ dáta — ak zdroj nevráti, pole ostáva null + dôvod (anti-halucinácia).

## WAVE B — Zhluk 2: Kataster WMS (vykonaj Brief 8)
- Vykonaj overnight-master-brief-8 (display-only katastrálna mapa, ParcelSource
  adaptér, WmsParcelSource, žiadne ukladanie, žiadni vlastníci).
- Keďže location je prázdne: mapa funguje ako nástroj (manuálne vyhľadanie /
  klik na parcelu), auto-centrovanie na adresu leadu = pending, kým nie sú adresy.
- Tier-gating cez canRenderModule (Brief 7): Bod zlomu = Market Vision,
  Zmena v okolí = Protocol Authority.

## WAVE C — Reconcile tile states (žiadna fikcia)
Pre KAŽDÚ pending dlaždicu v revenue-intelligence registry:
- Ak je jej zdroj TERAZ pripojený a reálne tečú dáta → flip na `live`.
- Ak zdroj stále nie je (portály = čaká na Nehnuteľnosti Admin, vlastníci = ÚGKK
  zmluva, forecast = potrebuje históriu z usage) → ostáva `pending` s čestnou
  správou. NEFLIPUJ na live bez reálnych dát.
- Aktualizuj registry tak, aby stav zodpovedal REALITE zdrojov.

## TESTOVANIE (POVINNÉ)
- Unit: phone/email validácia (vrátane medzinárodných), RPO mapper na fixture
  (reálna RPO odpoveď, nie vymyslená), enrichment audit do enrichment_log.
- Integračné (ephemeral CI, TEST_SUPABASE_*): RLS na enrichment_log,
  tier-gating kataster, agency scoping.
- GUARD: žiadne mock metriky, žiadna fake-live dlaždica.
- `npm run build` zelené, CI (ephemeral) zelená.

## DELIVERABLES
- PR per wave (enrichment-real-sources, kataster-wms, tile-state-reconcile),
  bez miešania.
- Aktualizovaný revenue-intelligence registry (reálne stavy).
- `docs/briefs/overnight/overnight-master-brief-11.md` + status.
- DENYLIST: enrichment, cadastre, modules cesty (data/UI = manuálny review).
- NIČ do main bez green CI + GUARD testu.

## TVRDÁ PRAVDA (guardrail)
Tento brief oživí maximum z DOSTUPNÝCH dát — ale väčšina featur nehladuje po
kóde, hladuje po DÁTACH. Skutočný odomykač je INFLOW dát:
- Nehnuteľnosti Admin export (čaká na odpoveď portálu),
- RealSoft mapper (čaká na reálnu vzorku payloadu),
- bohatšie leady cez používanie Action Queue (status/aktivity v čase).
Bez týchto zostane časť dlaždíc právom pending. To nie je chyba — je to pravda.
