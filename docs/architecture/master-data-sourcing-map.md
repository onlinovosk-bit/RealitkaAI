---
title: "Master Data Sourcing Map — Legálne zdroje dát pre Revolis.AI"
project: Revolis.AI
type: reference
status: living-document
created: 2026-06-15
tags: [revolis, data-sourcing, legal, gdpr, kataster, rpo, portaly, master-map]
related:
  - "[[overnight-master-brief-8]]"
  - "[[overnight-master-brief-9]]"
  - "[[signal-layer-brief]]"
  - "[[decisions]]"
---

# MASTER DATA SOURCING MAP

> Princíp: nepátram po 95 featurách, ale po ~8 dátových zdrojoch. Featury sa
> zhlukujú okolo zdrojov — vyrieš zdroj, oživíš celý zhluk. Pre každý zhluk:
> ZDROJ → LEGÁLNOSŤ → AKO ZÍSKAŤ → AK NEVIEM, AKO ZISTIŤ.

## PRÁVNE ZÁKLADY (platia naprieč všetkým)
- **Fakty vs osobné údaje:** cena/plocha/lokalita inzerátu = fakt (obhájiteľné).
  Meno/telefón/e-mail predajcu = osobný údaj (GDPR, default NEUKLADAŤ).
- **ToS + právo na databázu (sui generis):** scraping môže porušiť podmienky
  portálu aj ochranu databázy — NEZÁVISLE od GDPR. Preferuj API/partnerstvo.
- **GDPR 6(1)(f) + Čl. 14:** legitímny záujem vyžaduje balancing test;
  pri dátach nezískaných od osoby aj informačnú povinnosť (Čl. 14).
- **CC BY 4.0:** otvorené registre (RPO) vyžadujú uvedenie zdroja (attribution).
- Rešpektuj robots.txt a rate-limity vždy.

---

## ZHLUK 1 — TVOJE VLASTNÉ CRM DÁTA (0 externých závislostí)
**Featury:** Action Queue, Seller Rescue, Deal Risk Radar, CEO Command Center,
Forecasting, Pipeline Velocity, lead scoring, AI triage, Morning Briefs,
BRI score, client DNA, deal moments/risk, pipeline moves, "Čo ohrozuje mesiac".
**Zdroj:** `leads`, `activities`, zmeny `status` v čase, timestampy kontaktu.
**Legálnosť:** 100% tvoje dáta. Žiadny externý zdroj. Žiadne riziko.
**Ako získať:** TIE DÁTA ZATIAĽ NEEXISTUJÚ (status 442× "Nový", activities
mŕtve). Vznikajú z POUŽÍVANIA — postav Action Queue (Brief 9), klik "Volať"
zapíše status+last_contact+activity. Po týždni práce máš dáta na celý zhluk.
**Toto je tvoj fundament — bez neho je polovica featur prázdna bez ohľadu na
externé zdroje. Najvyššia priorita.**

## ZHLUK 2 — KATASTER: GEOMETRIA (parcely)
**Featury:** Zmena v okolí (mapový základ), Bod zlomu (mapový základ),
katastrálna mapa, parcelný kontext pod leadom.
**Zdroj:** ZBGIS/INSPIRE WMS `https://inspirews.skgeodesy.sk/geoserver/cp/ows`;
download `https://opendata.skgeodesy.sk/static/INSPIRE/Cadastral_parcels/SlovenskoC.zip`;
ArcGIS `https://mpt.svp.sk/server/rest/services/kataster/kn_parcela_c/MapServer`.
**Legálnosť:** ✅ OTVORENÉ. High Value Dataset podľa EÚ smernice. Obnovené
od 27.8.2025 po kyberútoku. Plne legálne na komerčné použitie.
**Ako získať:** Brief 8 (WMS display-only) alebo PostGIS import ZIP-u.
**Pozn.:** ÚGKK mal výpadok mesiace (jan–aug 2025) → rátaj s resilience.

## ZHLUK 3 — KATASTER: VLASTNÍCI (popisné dáta)
**Featury:** owner enrichment, "kto vlastní túto parcelu", potenciálni predajcovia.
**Zdroj:** popisná časť IS KN (mená, podiely, LV).
**Legálnosť:** ❌ NIE open data. ÚGKK explicitne: pre komerčné subjekty
neexistuje oprávnený záujem ani API napojenie. Scraping MAPKA/ESKN (existujú
Apify aktori) = porušenie ToS + GDPR + proti stanovisku úradu. NEROBIŤ.
**Ako získať LEGÁLNE:** zmluva s ÚGKK "O poskytovaní vybraných údajov z IS KN".
**AKO ZISTIŤ:** existujúce takéto zmluvy sú verejné na CRZ (crz.gov.sk) — nájdi
ich ako vzor, zisti podmienky/cenu. Kontaktuj ÚGKK podateľňu so žiadosťou.
**Toto je FOUNDER úloha (právna/obchodná), NIE swarm úloha.**

## ZHLUK 4 — FIREMNÉ DÁTA (firmy ako leady / B2B enrichment)
**Featury:** enrichment firemných leadov, B2B kvalifikácia, overenie IČO/DIČ.
**Zdroj:** RPO REST API `https://api.statistics.sk/rpo/v1/` (agreguje ORSR,
živnostenský register a ~70 zdrojov); mirror Slovensko.Digital
`https://datahub.ekosystem.slovensko.digital/api/data/rpo2/...`; ORSR parser.
**Legálnosť:** ✅ OTVORENÉ, Creative Commons Attribution 4.0 (uvádzaj zdroj).
**Ako získať:** volaj RPO API podľa IČO alebo názvu. Cachuj (dáta sa menia
zriedka). Nahrádza FinStat/ORSR STUBY v Enrichment Engine (Brief A) reálnym
zdrojom.
**Pozn.:** RPO V1 je deprecated → smeruj na RPO V2.

## ZHLUK 5 — REALITNÉ PORTÁLY (inzeráty, pohyb trhu)
**Featury:** Listing Dominator, Market Intelligence, Signal Layer (nové inzeráty,
pokles ceny, expirácia), Bod zlomu (pohyb trhu), competition_radar,
shadow_inventory, arbitrage_matches.
**Zdroj:** nehnutelnosti.sk, topreality.sk, reality.sk, bazos.sk.
**Legálnosť:** 🟡 SIVÁ. Oficiálne API obmedzené. Fakty z inzerátu (cena, plocha,
lokalita, dátum) = obhájiteľné (nie sú chránené copyrightom). Osobné údaje
predajcu = GDPR NIE. ToS + právo na databázu = riziko.
**Ako získať (poradie podľa čistoty):**
  1. PREFEROVANÉ: oficiálne partnerstvo/API priamo s portálom — opýtaj sa ich.
  2. Scraping LEN faktov inzerátu (žiadne osobné údaje), robots.txt + rate-limit
     + zdokumentovaný balancing test (6(1)(f) + Čl. 14). Existujú Apify aktori
     (topreality.sk), ale tie isté právne mantinely platia.
**AKO ZISTIŤ:** napíš portálom (B2B/data partnership oddelenie), či poskytujú
dátový feed/API pre realitné CRM. To je čistejšie aj udržateľnejšie než scraping.

## ZHLUK 6 — STAVEBNÉ POVOLENIA / VÝSTAVBA
**Featury:** Plánovaná stavba, predikcia vývoja cien zo stavebnej aktivity.
**Zdroj:** Portál výstavby `vystavba.uupv.sk` (register výstavby + register
stavieb, ÚPV SR, spustený apríl 2025); Zoznam stavieb
`zoznamstavieb.skgeodesy.sk` (plocha, podlažia, kolaudácia); ŠRBDB (ŠÚ SR).
**Legálnosť:** verejné registre, ale ⚠️ NEOVERENÉ, či majú verejné/open-data API
(Portál výstavby je primárne podávací portál pre žiadateľov).
**AKO ZISTIŤ (toto je najväčšia neznáma — konkrétny krok):**
  1. Skontroluj dokumentáciu/API sekciu na vystavba.uupv.sk a portáli ÚPV SR.
  2. Napíš ÚPV SR (Úrad pre územné plánovanie a výstavbu) so žiadosťou o
     informáciu, či register výstavby poskytuje verejné API / open data export.
  3. Over data.slovensko.sk / data.gov.sk, či ÚPV SR publikuje dataset.
**Dovtedy Plánovaná stavba ZOSTÁVA skrytá (Brief 7), nie fake stub.**

## ZHLUK 7 — ÚZEMNÉ PLÁNY / ZONÁCIA
**Featury:** Zmena v okolí (zmena regulácie), neighborhood_alerts.
**Zdroj:** UzemnePlany.sk (komunitný register, PDF + grafika), Bratislava
"Územnoplánovacia informácia" (bratislava.sk); budúci centrálny register
ÚPD podľa zákona 200/2022 (vyhláška 54/2024) — ešte sa rozbieha.
**Legálnosť:** prevažne verejné PDF/portály.
**Ako získať:** per-obec, parsovanie PDF (neštandardizované). Budúci centrálny
register bude lepší zdroj, keď nabehne.
**AKO ZISTIŤ:** sleduj nábeh registra ÚPD v IS ÚPV SR (zákon 200/2022).

## ZHLUK 8 — REALVIA (už integrované)
**Featury:** príjem leadov, automatický signál kontaktu.
**Zdroj:** Realvia webhooky (`realvia_webhook_logs` — 111 živých záznamov).
**Legálnosť:** ✅ tvoja zmluva/integrácia s Realviou.
**Ako využiť:** TOTO je tvoj jediný AUTOMATICKÝ signál o klientovi. Použi ho ako
zdroj "posledný kontakt" namiesto prázdneho ručného `last_contact`.

---

## PORADIE OŽIVOVANIA (podľa pomeru hodnota/úsilie)
1. **Zhluk 1** (vlastné dáta cez Action Queue) — odomyká ~6 featur, 0 externých
   závislostí. Najprv toto, inak je všetko ostatné prázdne.
2. **Zhluk 4** (RPO firemné dáta) — legálne, zadarmo, API hotové, hneď použiteľné.
3. **Zhluk 2** (kataster geometria) — legálne, Brief 8 pripravený.
4. **Zhluk 5** (portály) — vyrieš najprv partnerstvo vs scraping rozhodnutie.
5. **Zhluk 6 + 3** (povolenia, vlastníci) — vyžadujú overenie API / zmluvu;
   FOUNDER úlohy, paralelne k swarmu.
6. **Zhluk 7** (ÚPN) — najťažšie (PDF/per-obec), počká na centrálny register.

## OTVORENÉ NEZNÁME (treba dohľadať/overiť — nie hádať)
- Má Portál výstavby (vystavba.uupv.sk) verejné API? → ÚPV SR.
- Poskytujú portály (nehnutelnosti.sk/topreality.sk) dátové partnerstvo? → ich B2B.
- Podmienky a cena zmluvy s ÚGKK na vlastníkov? → CRZ vzor + ÚGKK podateľňa.
