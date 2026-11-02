# INI-5 — Test s kontrolnou skupinou pre PMax (geo-holdout): plán a vopred zapísané pravidlá

> **Stav: PLÁN, nie vykonaný test. VALIDATE, nie VERIFIED.** Dátum: 2026-10-12 (práca začatá 9. 10.). Nadväzuje na rozhodnutie foundera: „A (odporúčam): nechať tROAS 600 % a pripraviť test s kontrolnou skupinou (INI-5). Nič sa nemení v Ads.“
> **Zdroje a štítky:** [SHOPTET] export objednávok z 9. 10. 2026 13:51 (1. 9. 2025 – 8. 10. 2026; do dokumentu idú len počty podľa prvých dvoch číslic PSČ); [ADS], [GA4], [P&L] čísla prevzaté z `…-p23-ads-audit.md`, `…-p23-ga4-audit.md`, `…-p23-bridge-v1.md` (v tejto relácii nepreverené voči zdroju); [STRATÉGIA] `…-q4-growth-strategy.md`; [VÝPOČET] aritmetika alebo simulácia z uvedených vstupov (§4, Príloha B); [ODHAD] predpoklad bez merania; [WEB] súhrny vyhľadávania (§9).
> **Nič sa nezmenilo** v Ads, Shoptete, LeadHube ani GA4. Zmeny v Ads robí PPC správca až po samostatnom GO foundera.
> **Skratky:** PMax = kampaň Performance Max; tROAS = cieľová návratnosť (hodnota konverzií / útrata); CM2 = príspevok na objednávku po variabilných nákladoch, pred reklamou; c = útrata PMax na jednu vybavenú objednávku; T / K = rameno s vypnutým PMax / kontrolné rameno so zapnutým; d = skutočný pokles vybavených objednávok v T oproti K (jeho odhad z dát: d̂); d\* = prah rentability (pokles, pri ktorom sa útrata na PMax práve vyplatí); A/A = simulácia bez zásahu na historických dátach; sd = smerodajná odchýlka ln(T/K); MDE = najmenší pokles, ktorý test odlíši od nuly (80 % sila, obojstranne 5 %); TRIM = PMax sa nevypláca ani pri priaznivej ekonomike, HOLD = test nič nepreukázal, KEEP = PMax sa vypláca aj pri nepriaznivej ekonomike (§5); INI-1, INI-3, INI-5, INI-6 = iniciatívy stratégie (INI-1 feed a texty, INI-3 dodávateľ, hotovosť a zásoby, INI-5 reklama podľa príspevku, INI-6 ponuky a e-maily); „vybavené“ = stav „Vybavená“ v Shoptete.

## 1. Výsledok

**Čo treba od teba:** odpovedz „GO Q1“, „GO Q4“ alebo „NIE“ (význam a predvolené v §10). Odporúčam **„GO Q1“**: plán sa len uloží ako kandidát na rok 2027, v Ads sa nič nemení, o štarte sa rozhodne 28.–31. 12. podľa brány sily (§3).

1. **Odporúčanie:** pravidlá testu zapísať teraz, **test spustiť najskôr v pondelok 1. 2. 2027** (6 týždňov), pravdepodobnejšie v apr–máj 2027 podľa brány sily; v Q4 nie. Stratégia to rozhodla („Test vypnutia PMax 6+6 týždňov najskôr január–marec 2027; v Q4 nie“; pravidlo 10: nový test je v Q4 predvolene NEZAPNUTÝ). Rozhodnutie „A“ s tým nie je v rozpore: pripraviť neznamená spustiť.
2. **Prečo nie v Q4:** sila Q4 a Q1 je pri dnešnom odhade objemu podobná (MDE 36–44 %, §4); rozhoduje rozpor s rozhodnutím stratégie a tri brány stratégie, ktoré sa na test nedajú nastaviť: INI-3 (zásoby, 23. 11.), INI-1 (stop „tržby Google −15 %“) a INI-5 (stop a KPI) (§7). Jediná výhoda Q4 variantu: verdikt 23. 11. 2026 namiesto 29. 3. alebo 12. 4. 2027 a polovičná cena (§6); použiteľný je však až po zmrazení zmien (po 20. 12.), teda o ≈ 3 mesiace skôr.
3. **Čo test vie:** odhaliť, že PMax sa **nevypláca** (TRIM): pri skutočnom poklese d = 10 % v 73–96 % prípadov, pri d = 25 % v 38–69 % (podľa scenára objemu a c, §4) [VÝPOČET]. Prah rentability je **d\* ≈ 40–69 % vybavených objednávok** (§2).
4. **Čo test nevie:** pri d = 45–60 % skončí ako HOLD (≥ 90 %), tam leží aj prah; KEEP vznikne až pri d ≈ 75 % a viac (26–68 %). Objem v roku 2027 je neistý (medziročný pokles −30 až −43 % by zhoršil silu na MDE 42–45 % pri 6 týždňoch, §4).
5. **Cena (6 týždňov, základ sep 2026):** úspora polovice útraty ≈ 609 €; čistý výsledok pre d = 25 % ≈ +288 €, d = 50 % ≈ −33 €, d = 78,6 % ≈ −400 €, d = 100 % ≈ −675 € [VÝPOČET, bez hodnoty opakovaných nákupov; §6]. Práca PPC správcu ≈ 6,5–8,5 h, foundera ≈ 1 h [ODHAD].
6. **Očakávaná hodnota je malá a neistá:** ak je d rovnomerne rozložené medzi 10 a 75 %, TRIM padne v ≈ 23–31 % prípadov a samotné vypnutie polovice krajiny vychádza v priemere na ≈ +60 € (základ apr–sep ≈ +160 €) [ODHAD]. Pri d = 25 % by úplné vypnutie PMax ušetrilo ≈ 5,0–7,1 tis. € ročne (pri d = 10 % ≈ 8,3–10,9 tis. €; TRIM je len čiastočné zníženie) [ODHAD]. Nie je to páka rastu: rastie len istota, či sa oplatí ročná útrata ≈ 10,6–13,4 tis. €; prednosť má Stripe krok C (Revolis).
7. **Predvolené (bez odpovede):** plán ostáva uložený ako návrh, v Ads sa nič nemení, okrem tejto odpovede sa od foundera do 28. 12. nič nevyžaduje.

## 2. Prah rentability d\*

Reklama sa oplatí, ak ušlý príspevok z vypnutia prevýši ušetrenú útratu: `d × objednávky × CM2 > útrata PMax`, teda `d* = c / CM2`.

| Vstup | Hodnota | Zdroj |
|---|---:|---|
| Vybavené objednávky sep 2026 / apr–sep 2026 | 184 (6,13 obj./deň) / 1 263 (6,90 obj./deň) | [SHOPTET] |
| Útrata PMax sep 2026 / apr–sep 2026 | 869,51 € / 6 723,81 € | [ADS] |
| **c** sep / apr–sep | 4,73 € / 5,32 € | [VÝPOČET] |
| CM2 priaznivá pre reklamu | 11,96 € | 9,97 × 1,2: horný okraj 180-dňového prínosu opakovaných nákupov +14 až +20 % [STRATÉGIA] (stratégia uvádza aj +24 % za mar–sep: CM2 12,36 €, prah TRIM 38–43 %) |
| CM2 podľa P&L | 9,97 € | [P&L] Q4 2025, ručné náklady (`…-p23-bridge-v1.md` §5 bod 2) |
| CM2 nepriaznivá | 7,70 € | dolný okraj CM2 prvej objednávky 7,7–8,9 € [STRATÉGIA] |

| d\* (% vybavených objednávok) | CM2 11,96 € | CM2 9,97 € | CM2 7,7 € |
|---|---:|---:|---:|
| c = 4,73 € (sep) | **39,5 %** | 47,4 % | **61,4 %** |
| c = 5,32 € (apr–sep) | **44,5 %** | 53,4 % | **69,1 %** |

- **Pravidlo:** prah TRIM = c / 11,96 (priaznivá ekonomika pre reklamu), prah KEEP = c / 7,7 (nepriaznivá). TRIM sa vydá, len ak sa reklama nevypláca ani pri priaznivej ekonomike; KEEP, len ak sa vypláca aj pri nepriaznivej. `c` sa pri vyhodnotení berie zo skutočného okna (útrata PMax v okne / vybavené objednávky v K).
- **Smer chýb CM2:** P&L CM2 9,97 € pochádza z ručných nákladov bez platobných poplatkov, balenia a práce majiteľa (stratégia: EBITDA model neprešiel spätným testom) a je pre reklamu skôr priaznivý; opakované nákupy ho zasa podhodnocujú. Preto dve strany pásma.
- **Plauzibilný odhad poklesu zhora ≈ 70–79 %** [ODHAD]: podiel `google / cpc` z GA4 za apr–sep 2026 (1 073 / 1 443 = 74 % objednávok bez storna; 1 073 / 1 276 = 84 % nákupov v GA4) krát podiel PMax na hodnote „Nákup“ v Ads (41 216,23 / 44 107,63 = 93 %) [GA4, ADS]. Nie je to tvrdý strop: zdroj relácie nie je atribúcia a PMax môže zvyšovať aj priame, e-mailové a organické objednávky (tie sú v d zahrnuté).
- **Dôsledok:** pri strede pásma (≈ 50 %) musí byť prírastkových zhruba dve tretiny objednávok pripísaných PMax. Stratégia uvádza podobne „bod zvratu inkrementality ≈ 59–72 %“ pripísaných objednávok [STRATÉGIA].

## 3. Návrh pokusu

- **Odhadovaná veličina:** priemerný prínos celého PMax pri zapnutom Brande (Brand Search `20011485488` ostáva všade), nie hraničný prínos ďalšieho eura. KEEP preto nie je povolenie škálovať; rozpočet nie je obmedzením (≈ 29 € zo 100 € denne), páka je tROAS a ten sa v teste nemení.
- **Jednotka:** prvé dve číslice fakturačného PSČ (24 jednotiek s vybavenými objednávkami; najväčšia 108 objednávok = 8,6 %, najmenšia 4; PSČ 0xx 40,4 %, 8xx 4,2 %, 9xx 55,4 %). Fakturačné a dodacie PSČ sa zhodujú v prvých dvoch číslicach v 99,6 % vybavených objednávok za apr–sep 2026 (99,4 % za 13 mesiacov), takže darčekové doručenie priradenie k oblastiam nenaruší; zhodu s miestom zobrazenia reklamy neviem zmerať. **Skutočná jednotka sa určí podľa toho, čo Ads umožní** (PSČ, okresy, kraje); priradenie sa potom prepočíta tým istým pravidlom.
- **Priradenie (pravidlo, nie model):** jednotky zoradené podľa vybavených objednávok, páry susedných poradí; v páre dostane **T** jednotka s menším `sha256("inc5-geo|" + jednotka)`, druhá je **K**. Návrh v Prílohe A (T 641, K 622 objednávok).
- **Čo sa mení:** v kampani „M | All products“ (`20011442393`) sa vylúčia oblasti ramena T; vylúčenia v PMax sú iba „Prítomnosť“ ([WEB], §9), takže únik do T je možný.
- **Čo sa NEMENÍ počas pokusu:** tROAS 600 %, denný rozpočet 100 €, štruktúra kampane. Všetky ostatné zmeny (ceny, kupóny, ponuky, e-maily, štítky SKU, texty a feed) sa zapíšu do **denníka zmien** (vlastník: správca e-shopu) a pôsobia na T aj K; odhad d platí pre PMax tak, ako bežal. História zmien v Ads sa exportuje **každý týždeň** (API dáva len 30 dní, okno trvá 42–56 dní).
- **Okno:** 6 týždňov (pondelok 1. 2. – nedeľa 14. 3. 2027, obnova v pondelok 15. 3.); 8 týždňov len ak to vyžaduje brána sily (do Veľkej noci 28. 3., obnova až v utorok 30. 3. kvôli sviatkom 26. a 29. 3.). Stavy objednávok sa čítajú 15 dní po konci okna (podiel „Vybavená“ medzi objednávkami bez storna je ≈ 86 % už pri objednávkach starých 15 dní, rovnako ako pri starších).
- **Brána sily (rozhoduje sa 28.–31. 12., pred zmrazením 25. 1.):** (1) A/A sa prepočíta na finálnych jednotkách; (2) očakávaný objem okna = objem rovnakých mesiacov 2026 [SHOPTET] × medziročný pomer okt–dec 2026 voči okt–dec 2025 [ODHAD]; pri ňom musí byť MDE (1,1 × Poissonov šum, tabuľka §4) ≤ 40 %: okno je 6 týždňov, ak to stačí, inak 8 týždňov, inak NO-GO pre tento štart a posun na ďalšieho kandidáta (pondelok 5. 4. 2027, 6 týždňov do 16. 5.); ak nevyhovie ani ten, test sa ruší (NIE); (3) jednotky vyvážené podľa objemu (|ln(T/K)| ≤ 0,05 na 13-mesačnej histórii), aspoň 6 skupín; (4) PPC kontrola z §8 dopadla kladne: Ads dovolí v kampani `20011442393` vylúčiť jednotky tak, že sa rameno T dá pokryť. Tri veľké nevyvážené bloky (PSČ 0/8/9) dali MDE ≈ 63 %, dôvodom je nerovnováha, nie počet: skupiny susedných dvojčíslicových úsekov PSČ vyvážené podľa objemu (6–24) dali v A/A pri 42 dňoch a 6,9 obj./deň MDE 23–32 %.
- **Prvotný ukazovateľ:** počet vybavených objednávok v T a K podľa fakturačného PSČ za okno. Pomocné (len opisne): bez storna, hodnota produktov bez DPH po kupóne, okno od 8. dňa, vynechanie vždy jedného páru, T/K v 2 týždňoch po obnove (oneskorený efekt a návrat). Konverzie z Ads sa na vyhodnotenie nepoužívajú.
- **Odhad:** `L̂ = ln(T/K) − b`, `d̂ = 1 − exp(L̂)`; T, K sú počty vybavených objednávok v ramenách; `b` = ln(T/K) na 13-mesačnej histórii (1. 9. 2025 – 8. 10. 2026; pre Prílohu A `ln(1 620 / 1 564) = 0,035`), zmrazené pri priradení. Jednostranná 90 % hranica `L̂ ± 1,2816·σ`, `σ = 1,1 · sqrt(1/T + 1/K)` (koeficient 1,1 z A/A mimo vzorky, §4). Úprava podľa predchádzajúceho obdobia rovnakej dĺžky sa nepoužíva: v A/A zvyšovala šum (0,19 oproti 0,14 pri 28 dňoch).

## 4. Šum a sila testu (merané na vlastných dátach)

A/A: pre každé náhodné priradenie párov (1 500) sa v apr–sep 2026 posúvalo okno po 7 dňoch a počítala sa odchýlka `ln(T/K)` bez zásahu; **MDE = 1 − exp(−2,8·sd)**. Vybavené objednávky, 24 jednotiek, páry podľa objemu.

| Okno | Poissonov šum (6,90 obj./deň) | A/A v tej istej vzorke | A/A mimo vzorky (páry z apr–jún, test júl–sep) |
|---|---:|---|---|
| 21 dní | 0,167 | sd 0,163 → MDE 36,7 % | sd 0,192 → **41,5 %** |
| 28 dní | 0,144 | 0,141 → 32,6 % | 0,167 → 37,3 % |
| 42 dní | 0,117 | 0,114 → 27,3 % | 0,142 → 32,8 % |

Násobok mimo vzorky = sd / Poissonov šum pri 6,13 obj./deň (sep 2026: 0,176; 0,153; 0,125) vychádza 1,09; 1,09; 1,14 (opačné poradie období 1,06–1,09). Koeficient 1,1 je preto stredná hodnota, pri 42 dňoch stojí odhad len na 2 oknách mimo vzorky a ≈ 8 nezávislých 21-dňových oknách; je orientačný. Vyvážené náhodné priradenie bez párovania (|ln(T/K)| ≤ 0,05) dáva rovnaký šum; nevyvážené je ≈ 1,8× horšie. Párovanie je len jednoduché a overiteľné pravidlo.

**MDE podľa objemu a okna (1,1 × Poissonov šum, vybavené obj./deň) [VÝPOČET]:**

| Obj./deň | 21 dní | 42 dní | 56 dní | Poznámka |
|---:|---:|---:|---:|---|
| 2,5 | 57,3 % | 45,2 % | 40,6 % | január 2026 (2,45) [SHOPTET] |
| 4,4 | 47,3 % | 36,4 % | 32,5 % | február 2026 (4,39) |
| 5,3 | 44,2 % | 33,8 % | 30,1 % | marec 2026 (5,26) |
| 6,1 | 42,0 % | 31,9 % | 28,3 % | september 2026 (6,13) |
| 6,9 | 40,1 % | 30,4 % | 26,9 % | priemer apr–sep 2026 |

Objem v rovnakom okne 2025 (19. 10. – 8. 11.) bol 8,6 vybavených obj./deň; medziročný pokles je ≈ −30 až −43 % [STRATÉGIA; sep 184 / 321 = 0,57×]. Odhad objemu [ODHAD] pre scenáre: Q4 2026 ≈ 4,9–6,0 obj./deň; február 2027 ≈ 2,5–3,1 (4,39 × 0,57–0,70); apr–máj 2027 ≈ 4,2–5,5 (7,4–7,8 × 0,57–0,70). Mesačne 2025–2026 pre orientáciu: sep 2025 10,70; okt 8,84; nov 13,20; dec 17,16; jan 2,45; feb 4,39; mar 5,26; apr 7,40; sep 2026 6,13.

**Pravdepodobnosť verdiktu** (normálna aproximácia `ln(T/K)`, `σ = 1,1·sqrt(1/T + 1/K)`, `T = K·(1 − d)`, prahy z §2; primárna analýza) [VÝPOČET]:

| Scenár (okno, objem) | MDE | c (€) | d = 10 % TRIM | 25 % TRIM | 40 % TRIM | 50 % HOLD | 60 % KEEP | 75 % KEEP |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A: 6 týž., 4,4 obj./deň (objem feb 2026 bez poklesu) | 36,4 % | 4,73 / 5,32 | 87 / 95 % | 48 / 67 % | 9 / 19 % | 98 / 96 % | 7 / 1 % | 66 / 32 % |
| B: 8 týž., 3,0 obj./deň (feb 2027 s poklesom −30 %) | 37,8 % | 4,73 / 5,32 | 84 / 93 % | 46 / 64 % | 9 / 19 % | 98 / 96 % | 8 / 1 % | 63 / 31 % |
| C: 6 týž., 4,7 obj./deň (apr–máj 2027, odhad) | 35,5 % | 4,73 / 5,32 | 88 / 96 % | 50 / 69 % | 9 / 20 % | 98 / 97 % | 7 / 1 % | 68 / 33 % |
| D: Q4 variant, 21 dní, 5,5 obj./deň | 43,6 % | 4,73 / 5,32 | 73 / 85 % | 38 / 53 % | 9 / 17 % | 97 / 95 % | 8 / 1 % | 52 / 26 % |

(V každej bunke prvá hodnota platí pre c = 4,73 €, druhá pre c = 5,32 €; prahy: c = 4,73 → TRIM pod 39,5 %, KEEP nad 61,4 %; c = 5,32 → 44,5 % a 69,1 %.) Platí pre primárnu analýzu; kontroly v §5 môžu TRIM len zmeniť na HOLD (KEEP kontrolám nepodlieha), pravdepodobnosti TRIM sú teda v rámci modelu horné hranice. Pri d = 35 % je HOLD 66–81 %, pri d = 70 % 59–88 % (scenár A). Jednostranná 90 % hranica pre d leží pri σ ≈ 0,19 od odhadu o −11 až −21 a +9 až +16 percentuálnych bodov (podľa d; pri d̂ = 50 % ≈ 36–61 %): test neodlíši 37 % od 50 %.

**Porovnanie s časovým testom (vypnúť celé Slovensko po týždňoch, ako navrhuje stratégia „6+6“):** rozdiel logaritmov susedných týždňov má odchýlku 0,333 (týždenný variačný koeficient ≈ 26 %), tri páry zapnuté/vypnuté dajú MDE ≈ 42 % za 6 týždňov a sezónnosť (október → november) je priamo zameraná na odhad; vypnutá je celá krajina. Geo-holdout je lepší pri nižšej cene.

## 5. Pravidlá rozhodnutia (zapísané teraz, zmrazené 25. 1. 2027, po štarte sa nemenia)

| Výsledok | Podmienka | Čo sa urobí |
|---|---|---|
| **TRIM** | horná 90 % hranica d̂ < c / 11,96 (prah TRIM zo skutočného okna) **a** obe kontroly nižšie sú splnené | navrhnúť samostatný krok na zníženie útraty (napr. vyšší tROAS alebo vylúčenie SKU) s vlastným GO a znovu merať; **nie vypnutie** |
| **KEEP** | dolná 90 % hranica d̂ > c / 7,7 | PMax ostáva v dnešnej podobe; škálovanie stále podlieha pravidlu 6 a rebríčku CAC zo stratégie (dnešných 9,19 € ho blokuje) |
| **HOLD** | inak | nič sa nemení; ďalší krok sa rozhodne podľa tohto dokumentu pri ďalšom okne |

- **Kontrola úniku (len pre TRIM):** m = podiel bežnej útraty PMax v T, ktorý v okne beží = (útrata PMax v T / celková útrata PMax) ÷ 0,5. Zostava podľa polohy z Ads (ak ju Ads/Supermetrics poskytne, inak výpis PPC správcu). Únik zmenšuje namerané d: `d̂ ≈ d·(1 − m)`; pri skutočnom 50 % a m = 10 % vyjde 45 %, pri m = 20 % 40 %. Prah: ≤ 5 % celkovej útraty PMax v T (m ≈ 10 %) [ODHAD]; ak sa únik nedá zmerať alebo prah prekročí, TRIM → HOLD.
- **Kontrola zdravia K (len pre TRIM):** (a) stav kampane PMax v Ads po 7. dni nie je „Učenie“ (PPC správca zapíše týždenne); (b) útrata PMax na deň v K po 7. dni je aspoň 75 % toho, čo K utratilo na deň v 4 týždňoch pred štartom (jednostranne: pokles signalizuje poškodenie, sezónny rast nie) [ODHAD prahu]. Konverzie a objednávky sa do kontroly nezahŕňajú (pri ≈ 15–21 objednávkach týždenne v K sám Poissonov šum prekročí ±10 % v ≈ 50 % prípadov). Učenie po zmene polôh by v K znížilo konverzie, a tým aj d̂. Inak TRIM → HOLD.
- **Smer chýb:** únik, učenie v K aj nesúlad miesta zobrazenia s PSČ **ťahajú odhad d̂ k nule, teda k TRIM**. Preto TRIM podlieha kontrolám a navrhuje sa len čiastočný krok, kým KEEP je konzervatívne.
- Opisné analýzy (§3) sa vykazujú, ale neurčujú verdikt; ak by niektorá z nich verdikt obrátila, uvedie sa to v správe.
- Výsledok sa nehlási ako „potvrdené“: stav ostáva VALIDATE, kým ho nepotvrdí druhé okno alebo iný nezávislý signál.

## 6. Cena, stop pravidlá, hodiny

**Čistý výsledok za 6 týždňov = ušetrená útrata − ušlý príspevok** (+ = test sa zaplatí sám, − = test stojí; CM2 9,97 €; úspora = polovica útraty PMax, ušlé objednávky = d × polovica objednávok) [VÝPOČET]:

| d | ušlé obj. (základ sep) | ušlý príspevok (základ sep) | čistý výsledok, základ sep (6,13 obj./deň; 28,98 €/deň; úspora 609 €) | čistý výsledok, základ apr–sep (6,90 obj./deň; 36,74 €/deň; úspora 772 €; ušlé obj. 36 / 72 / 114 / 145, príspevok 361 / 722 / 1 135 / 1 445 €) |
|---:|---:|---:|---:|---:|
| 25 % | 32 | 321 € | **+288 €** | +410 € |
| 50 % | 64 | 642 € | −33 € | +49 € |
| 78,6 % | 101 | 1 009 € | −400 € | −364 € |
| 100 % | 129 | 1 283 € | −675 € | −673 € |

Pre 21 dní (Q4 variant) polovičné hodnoty: +144 € / −17 € / −200 € / −337 € (základ sep). Pri nižšom objeme v roku 2027 sa straty úmerne zmenšujú. Nie je v tom hodnota opakovaných nákupov ani oneskorený návrat objednávok po obnove; halo na Brand, organiku a e-mail je v d zahrnuté (výsledkom sú všetky vybavené objednávky). Ročný prínos pri d = 25 % a úplnom vypnutí: sep 10 578 − 0,25 × 6,13 × 365 × 9,97 ≈ +5 000 €; apr–sep 13 411 − 0,25 × 6,90 × 365 × 9,97 ≈ +7 130 € [ODHAD]. Tržby v T klesnú o d, celkové o d/2.

- **S1 (kalendár):** PMax v T sa obnoví v pondelok po konci okna. Obnovu potvrdí PPC správca snímkou zoznamu vylúčených polôh s dátumom (bez nej by sa T po prípadnom zákaze zmien zamkol bez PMax).
- **S2 (prevádzka):** obnoviť okamžite pri pozastavení účtu alebo Merchant Center, nulovej zásobe top-4 SKU, výpadku merania (Shoptet, Ads) nad 24 h alebo udalosti, ktorú PPC správca s founderom zapíšu do zoznamu stop udalostí pred štartom. Štatistický skorý stop a samostatný prah poklesu v K sa nepoužívajú: pri ≈ 15 objednávkach týždenne v K by spúšťali náhodne (pokles o 25 % oproti priemeru je čistý Poissonov šum v ≈ 16 % týždňov).
- **Výnimka z pravidiel:** pravidlá Q1/Q2 2027 ešte neexistujú. GO na test musí výslovne vymenovať stop pravidlá a KPI poklesu tržieb, ktoré by sa dostali do rozporu (tržby celkom klesnú o d/2; pripísané tržby Google o ≈ 46 % nezávisle od d, lebo PMax v T nevytvára kliky a objednávky sa pripíšu priamemu, e-mailovému či organickému zdroju).
- **Hodiny [ODHAD]:** PPC správca: čítacia kontrola z §8 1 h, snímka nastavení 1 h, vylúčenia 1–2 h, týždenné kontroly 6–8 × 0,5 h, obnova 0,5 h = 6,5–8,5 h. Founder: GO, dva minimalizované exporty ≈ 1 h. Moja práca (A/A, brána sily, čítanie dát) nič v Ads nemení a do hodín sa nepočíta. Pravidlo stratégie 11 (hodiny sú rozpočet) sa vyhodnotí pri uzávierke Q4.

## 7. Q4 variant (neodporúčam)

Okno 19. 10. – 8. 11. 2026 (21 dní; 8. 11. je nedeľa), obnova 9. 11. pred „posledným dňom zmien“ 10. 11., čítanie 23. 11. Vyžadoval by:

| Konflikt | Stratégia | Čo by test urobil / čo treba |
|---|---|---|
| Rozhodnutie o časovaní | „Test vypnutia PMax 6+6 týždňov najskôr január–marec 2027; v Q4 nie“; pravidlo 10: v Q4 NEZAPNUTÝ, štart najneskôr 2. 11., len po G0 PASS, voľnej kapacite | písomná výnimka foundera |
| INI-3 brána druhej dávky 23. 11. | predaj 1.–22. 11. ≥ 0,9× rovnaké obdobie 2025 → povoliť, < 0,56× → nezadať (10,8–12,6 tis. € viazaných) | T je vypnuté 8 z 22 dní: tržby klesnú o ≈ 5 % (d = 25 %), ≈ 9 % (50 %), ≈ 14 % (78,6 %) [VÝPOČET]; september bol 0,56×, 1.–8. 10. 0,69× [SHOPTET]. Pre bránu treba porovnávať len K × 2 |
| INI-1 stop | tržby Google −15 % voči 4-týždňovému základu dva týždne po sebe → vrátiť štrukturálne zmeny feedu (ID, vylúčenia) | pripísané tržby Google (Ads, GA4, LeadHub) klesnú o ≈ 46 % (0,5 × 93 %) pri akomkoľvek d; stop sa spustí už v 1. týždni vždy; text/feed zmeny z INI-1 by sa nedali oddeliť od efektu testu |
| INI-5 stop a KPI | tržby −10 % týždenne po zmene → vrátiť; KPI pokles ≤ 5 % týždenne | test pri d = 25 % zníži celkové objednávky o ≈ 12,5 % |
| Udalosti v okne | e-mail #1 20. 10., kupóny do 23. 10., ponuky živé 23. 10., cenový zámok 24. 10., štítky SKU 29. 10., G1 16. 10. | pôsobia na T aj K, ale menia AOV a CM2 (trojbalík CM ≈ 14,6–16,2 € oproti ≈ 4,9 € za fľašu); treba denník zmien |
| Hodiny, MIN / PLNÁ | pravidlo 11: hodiny zapísané majiteľom do 12. 10.; MIN obsah je uzavretý a test v ňom nie je | bez zapísaných hodín nie je test v MIN povolený |
| Export | stratégia vyžaduje pseudonymizovaný export (bez mena, e-mailu, adresy) | opakovať export z 9. 10. (67 stĺpcov vrátane e-mailu, telefónu, adresy, IP) nejde; treba minimalizovaný (kód, dátum, stav, prvé 2 číslice PSČ) |
| Poradie krokov | PPC kontrola polôh musí predchádzať GO | PPC kontrola do 13. 10., GO najneskôr 14. 10.; po GO zmrazenie priradenia 16. 10. |

Sila Q4 variantu: MDE 42–45 % pri 5–6 obj./deň (37 % je len A/A v tej istej vzorke pri 6,9 obj./deň), TRIM pri d = 25 % v 36–56 % prípadov (scenár D, §4); brána sily z §3 (MDE ≤ 40 %) by nebola splnená. Výhoda (skorší verdikt, polovičná cena) nevyváži rozpor so stratégiou a tri brány vyššie.

## 8. Kroky a termíny (odporúčaná cesta)

| Kedy | Čo | Kto |
|---|---|---|
| teraz – 28. 12. 2026 | nič; v Ads sa nič nemení; Stripe krok C má prednosť | – |
| do piatku 18. 12. 2026 | kontrola v Ads, **iba čítanie, nič neukladať**: (1) dajú sa vybrať a vylúčiť PSČ alebo okresy Slovenska a koľko vylúčení treba pre polovicu krajiny? (2) Má Brand vlastný zoznam polôh? (3) Ponúka Experiments uplift alebo Conversion Lift pre tento účet? (4) Zostava „Time lag“ (§9) | PPC správca, ≈ 1 h |
| 28.–31. 12. | rozhodnutie o januárových kandidátoch podľa stratégie; pri GO: minimalizovaný export (kód, dátum, stav, PSČ2) → brána sily (§3) | founder (GO, export), ja (A/A, MDE) |
| pondelok 25. 1. 2027 | zmrazenie priradenia a pravidiel, snímka nastavení polôh, tROAS a rozpočtu, denník zmien | ja (dokument), PPC správca (snímka) |
| pondelok 1. 2. 2027 | štart: vylúčenie oblastí T v kampani `20011442393` | PPC správca |
| týždenne počas okna | kontroly úniku a zdravia K (zostavy Ads, iba čítanie) + export histórie zmien | ja, PPC správca |
| nedeľa 14. 3. 2027 (alebo 28. 3. = Veľká noc) | koniec okna; obnova v nasledujúci pondelok (8-týždňový variant až v utorok 30. 3.) | PPC správca |
| +15 dní po konci okna (6-týždňový variant: utorok 30. 3., pondelok 29. 3. je sviatok) | minimalizovaný export, vyhodnotenie podľa §5, správa s jedným verdiktom | founder (export), ja |

Dátumy overené kalendárom 2027: 25. 1., 1. 2., 15. 3., 29. 3. (Veľkonočný pondelok) a 5. 4. sú pondelky; 14. 3. a 28. 3. nedele; 26. 3. je Veľký piatok; 18. 12. 2026 piatok. Január 2027 sa nepoužije (v januári 2026 bolo len 2,45 obj./deň). Február–marec sa nepoužije (posun na 5. 4. 2027), ak bude očakávaný objem pod ≈ 2,6 obj./deň pri 8 týždňoch, resp. pod ≈ 3,5 pri 6 týždňoch: MDE je vtedy nad 40 % [VÝPOČET].

## 9. Čo som overil a čo nie

- **Zmerané priamo z exportu (primárne dáta):** 3 815 objednávok, všetky na Slovensko; 1 263 vybavených v apr–sep 2026; 24 jednotiek podľa fakturačného PSČ; zhoda fakturačného a dodacieho PSČ; mesačné objemy; Príloha A; ln(T/K) = 0,035 na 13 mesiacov.
- **Vypočítané modelom z týchto dát (postup v Prílohe B; skripty ani surový export sa neukladajú, takže výsledok sa dá overiť až novým exportom a novým skriptom):** A/A šum a MDE, pravdepodobnosti verdiktu, tabuľky ceny.
- **Prevzaté z dokumentov P23 a stratégie, v tejto relácii nepreverené voči zdroju:** útrata PMax, podiely GA4 a Ads, CM2 9,97 € a 7,7–8,9 €, +14 až +24 %, pravidlá a termíny stratégie.
- **Nezávislá kontrola:** plán prešiel dvoma kolami kontroly (čísla, štatistika, súlad so stratégiou, formulácie); nálezy sú zapracované, opätovné overenie jednotlivých nálezov sa nerobilo.
- **[WEB] prieskum (3 agenti + kontrola):** stránky Google a ďalšie sa cez proxy **nepodarilo otvoriť**; všetko pochádza zo **súhrnov výsledkov vyhľadávania, žiadne tvrdenie som nečítal v origináli**, a zhoda súhrnov nie je overenie. Zhodne uvádzané v súhrnoch (stupeň MEDIUM, bez URL): vylúčené polohy sú pri PMax iba „Prítomnosť“; vylúčenie má prednosť pred zahrnutím; naraz sa dá pridať až 1 000 vylúčení; poloha je „best effort“; zmena tROAS Learning nespúšťa. Použité len na výber metódy, neoverené, **PPC správca ich overí v živom Ads**: uplift experiment PMax nepodporuje kampane s Merchant Center feedom; geo Conversion Lift vyžaduje obchodného zástupcu Google a Slovensko nie je v nájdenom (starom) zozname trhov; user-based Conversion Lift má podľa jedného súhrnu minimum 1 000 konverzií a 5 000 USD (zdroje si protirečia); Meridian GeoX je mimo Ads. Metodiku geo-experimentov (Au 2018 a Vaver–Koehler 2011 cez PDF, README Trimmed Match a GeoLift, kód Meridian GeoX) čítal agent, nie ja; odporúča výkonovú analýzu pred štartom, A/A bránu a cooldown po konci, čo plán preberá.
- **Neznáme:** či Ads ponúka PSČ, okresy alebo kraje pre Slovensko (potvrdené sú len príklady USA a UK) a či pridanie vylúčenia do bežiaceho PMax spustí učenie; presnosť polohy; CM2 2026; hodnota opakovaných nákupov; reakcia Brandu na vypnutý PMax; dĺžka oneskorenia medzi kliknutím a objednávkou (zostava „Time lag“ v Ads, iba čítanie); objem objednávok v roku 2027.
- **Limity:** 21–56 dní je pod odporúčaním Google (4–6 týždňov na PMax experimenty); jednotky sú susedné bez nárazníkových pásiem; A/A stojí na ≈ 8 oknách.
- **Brána Ústavy v2 (`docs/architecture/revolis-constitution-v2.md`):** Q1 (zaplatil by dnešný klient Revolisu) = NIE → strop VALIDATE; pre Q4 variant Q8 (správny čas) = „príliš skoro“ (stratégia: „v Q4 nie“) → BACKLOG bez ohľadu na skóre; pre okno 2027 timing nie je veto. Skóre 12 otázok som nepočítal. Záver: **BACKLOG pre produkt Revolis, VALIDATE pre onlinovo.sk (vlastný e-shop)**; VALIDATE nedáva povolenie meniť Ads. Prime Directive: plán nezvyšuje šancu na platiaceho klienta Revolisu, preto prednosť Stripe krok C.
- **Zdroj údajov a GDPR:** zdroje (Shoptet export vlastných objednávok majiteľa, Ads, GA4) **nie sú v `docs/architecture/master-data-sourcing-map.md`**; ide o analýzu vlastných údajov onlinovo.sk, nie funkciu Revolisu, a zostáva to otvorená neznáma pre prípadné prenesenie do produktu. Skill `gdpr-advisor` nie je v tejto relácii dostupný. Právny základ čl. 6 ods. 1 písm. f) (meranie vlastnej reklamy); vyváženie: minimalizácia (kód, dátum, stav, prvé dve číslice PSČ), výstup len počty (aspoň 4 objednávky na jednotku za 6 mesiacov), žiadne profilovanie, surový súbor sa po analýze maže, do repozitára nejde. Odporúčam pridať do otázok pre SK advokáta. Export z 9. 10. (67 stĺpcov, osobné údaje) som spracoval iba lokálne v relácii; do repozitára ani do tohto dokumentu nešlo nič osobné.

## 10. Rozhodnutie a hranice testu

**Rozhodnutie (jedno): odpovedz „GO Q1“, „GO Q4“ alebo „NIE“.**
- **„GO Q1“ (odporúčam)** = schváliť tento plán na okno 2027. Spustí sa len: (a) plán sa v pamäti označí ako schválený kandidát (BACKLOG pre Revolis, VALIDATE pre onlinovo.sk), (b) PPC správca urobí do 18. 12. čítaciu kontrolu z §8 (≈ 1 h, nič neukladá). V Ads sa nič nemení; o štarte sa rozhodne 28.–31. 12. podľa brány sily.
- **„GO Q4“** = Q4 variant z §7 (neodporúčam). Vyžaduje písomnú výnimku z časovania, z brán INI-1, INI-3, INI-5 a z pravidla 11 (hodiny), PPC kontrolu do 13. 10. a tvoju odpoveď najneskôr 14. 10.; inak štart 19. 10. prepadá.
- **„NIE“** = žiadny test: tROAS 600 %, bez škálovania. Mení to rozhodnutie A („pripraviť test“).
- **Bez odpovede** ostáva plán uložený ako návrh a v Ads sa nič nemení.

**Čo test nevie:** (1) nerozhodne, ak je skutočný pokles ≈ 45–60 % (HOLD ≥ 90 %; tam je aj prah); (2) meria priemerný, nie hraničný prínos PMax pri dnešnom tROAS 600 %; (3) nehodnotí Brand, Metu ani e-mail ako samostatné kanály (ich vplyv sa v d len prelína s PMax); (4) nezachytí hodnotu opakovaných nákupov ani Black Week (špička 8.–17. 12. tvorí 26,6 % tržieb Q4 2025 [STRATÉGIA]); (5) KEEP takmer nikdy nevznikne (potrebuje d ≳ 75 %), preto sa neberie ako cieľ; (6) všetky známe skreslenia ho ťahajú k TRIM, preto TRIM podlieha kontrolám.

## Príloha A — návrh priradenia (platí po overení jednotiek v Ads, prepočíta sa pri zmrazení)

| Pár | Jednotka (PSČ) | Vybavené apr–sep 2026 | Rameno |
|---:|---|---:|---|
| 1 | 95 | 108 | T |
| 1 | 94 | 101 | K |
| 2 | 90 | 91 | T |
| 2 | 05 | 86 | K |
| 3 | 92 | 80 | T |
| 3 | 01 | 78 | K |
| 4 | 97 | 76 | T |
| 4 | 93 | 77 | K |
| 5 | 91 | 60 | T |
| 5 | 08 | 72 | K |
| 6 | 04 | 57 | T |
| 6 | 96 | 53 | K |
| 7 | 03 | 47 | T |
| 7 | 02 | 48 | K |
| 8 | 06 | 45 | T |
| 8 | 07 | 45 | K |
| 9 | 98 | 43 | T |
| 9 | 09 | 32 | K |
| 10 | 85 | 18 | T |
| 10 | 82 | 16 | K |
| 11 | 99 | 11 | T |
| 11 | 84 | 10 | K |
| 12 | 83 | 5 | T |
| 12 | 81 | 4 | K |

T = PMax vypnutý (641 objednávok), K = kontrola (622); rozdiel +3,1 %, na 13 mesiacoch +3,6 % (T 1 620, K 1 564), preto odpočet `b` v odhade.

## Príloha B — metóda (postup)

Python 3.11 (`-I`) nad exportom 9. 10. 2026 (stĺpce `code`, `date`, `statusName`, `billZip`, `deliveryZip`); jedinečné kódy; stav „Vybavená“; jednotka = prvé dve číslice fakturačného PSČ (dodacie ako záloha). A/A: 1 500 priradení (semienko 1 pre vzorku aj mimo vzorky), páry susedných poradí podľa objemu v období párovania, náhodný hod mincou, okná dĺžky 21/28/42 dní po 7 dňoch; „mimo vzorky“ = párovanie z objemu apr–jún a test júl–sep (aj opačne). Pravdepodobnosti verdiktu: `ln(T/K) ~ N(ln(1 − d), σ²)`, `σ = 1,1·sqrt(1/T + 1/K)`, `T = K(1 − d)`, `K = 0,5 · obj./deň · dni`, TRIM ak `ln(1 − d*) + 1,2816σ < L̂`, KEEP ak `L̂ < ln(1 − d*) − 1,2816σ`. Skupiny susedných dvojčíslicových úsekov PSČ vyvážené podľa objemu (6–24) dali pri 42 dňoch sd 0,10–0,13. Skripty nie sú v repozitári; vstupy a postup sú vyššie.
