# CRO audit — YODEYMA Boreal a Caribbean (onlinovo.sk)

> **Stav: VALIDATE, nie VERIFIED.** Dátum: 2026-10-28. Dopĺňa `2026-10-09-q4-growth-strategy.md` (plán CRO_UX / LEGAL) a `2026-10-09-p23-ga4-audit.md`. Zadanie: „CRO Audit & Conversion Engineering v1.0“ (2026-10-25), poradie Boreal → Caribbean → redizajn až neskôr.
> **Zdroje a štítky:** živé stránky `https://www.onlinovo.sk/tovar/yodeyma-boreal-edp/` a `https://www.onlinovo.sk/tovar/yodeyma-caribbean-edp/` (28.10.2026), surové HTML Boreal, 3 desktopové screenshoty od foundera, Leadhub 30.9.–27.10. Nič sa nezmenilo v Shoptete, GTM ani GA4. Nič nie je nasadené.

Tento dokument je návrh a dôkazový záznam. Zmeny v Shoptete sú v časti 9 a čakajú na samostatné explicitné GO.

## 0. Legenda a hranice dôkazov

**V** = VERIFIED, **ČV** = PARTIALLY VERIFIED, **N** = UNKNOWN (chýbajúci dôkaz je uvedený), **F** = FAILED. **[P]** pozorovanie, **[H]** hypotéza, **[R]** odporúčanie.

| Stav | Čo |
|---|---|
| **V** | Živé stránky Boreal aj Caribbean (28.10.2026). Surové HTML Boreal. 3 desktopové screenshoty od foundera. Leadhub za 30.9.–27.10. |
| **F** | GA4: Supermetrics trial skončil 23.10.2026 (`TRIAL_EXPIRED`), lievik podľa zariadenia je N. Mobilný screenshot sa nepodarilo stiahnuť, mobil je odvodený len z HTML/CSS (ČV/N). Leadhub `search_products`: chýba oprávnenie `LIST_PRODUCT`, štatistiky Caribbean sú N. |
| **N** | Košík a pokladňa neprejdené. Shoptet admin. VOP. |
| **ČV (Leadhub)** | `conversion_rate` je podľa môjho odvodenia objednávky/reach, nie session CR. „Est. GP“ je rátané zo zoznamovej (preškrtnutej) ceny, takže je nadhodnotené. |

**Leadhub, celý shop, 28 dní (30.9.–27.10., ČV):** 8 695 sessions, 7 854 unikátnych návštevníkov, 23 651 zobrazení stránok. First-click 170 konverzií / 8 109,92 €, last-click 189 konverzií / 9 040,13 €. Session CR ≈ 2,0–2,2 %, AOV ≈ 47,7–47,8 €. Odhadovaný hrubý zisk na session 0,36–0,40 € je horná hranica.

**Nevysvetlený rozpor:** Q4 plán uvádza ≈ 3,6 tis. sessions/mes., Leadhub ukazuje 8 695 sessions za 28 dní.

## 1. Executive verdict

- Hlavná prekážka nie je dizajn, ale „čo presne kupujem a za koľko“. Hlavička Boreal ukazuje „od 7,60 €“ (platený tester), fotka je 100 ml a cena za ml „0,33 €“ patrí 100 ml. [P, V]
- Ponuky sa navzájom prebíjajú: tester zadarmo od 35 €, tester 7,60 €, SET 39 €, „až –17 %“, kód v chate, widget „2 €“. Hlavný variant stojí 32,90 €, teda 2,10 € pod prahom. [P, ČV: pravidlá sú N]
- Dôvera: 15 hodnotení Boreal, všetky 5★, najnovšie 18.12.2025. Na Caribbean sú 3 hodnotenia, ale text tvrdí „433 recenzií“. Texty menujú originály a uvádzajú „99.9 % podobnosť“. [P, V]
- P0 opravy z Q4 plánu (9.–12.10.) sú k 28.10. na živom webe stále neuplatnené, napr. „od 5.30€“ a „433 recenzií“ na Caribbean. Q4 plán vtedy živý web nevidel (EGRESS_BLOCKED), toto je prvé živé overenie. [P, V]
- Zisk sa dnes dokázať nedá: GA4 je nedostupné, `view_item` nesie tester a Leadhub GP je nadhodnotené. Najprv baseline (MF-2), potom oprava tvrdení (QW-1), potom jediná skutočná CRO páka (HI-1). Efekt sa dá posúdiť len ako „no-harm“, nie ako uplift.

## 2. TOP 3 najväčšie prekážky nákupu

### B1 — Cena a variant (obe stránky)

| Boreal variant | Cena | Preškrtnutá | Zľava | €/ml | Obj. 28 d | Reach 28 d |
|---|---|---|---|---|---|---|
| 100 ml | **32,90 €** | 39,90 | –17 % | 0,33 | 22 | 186 |
| 50 ml | 19,50 € | 22,50 | –13 % | 0,39 | 7 | 76 |
| 15 ml | 8,70 € | 9,75 | –10 % | 0,58 | 6 | 55 |
| 15 ml tester bez krabičky | 7,60 € | 9 | –15 % | – | 2 | 160 |
| SET 100+15 ml+taška | 39 € | 47 | –17 % | 39 €/ks | 4 | 82 |

Zdroj: živá stránka (V), Leadhub (ČV).

- [P, V] Hlavička „od 7,60 €“ plus „až –17 %“ plus „od 0,33 €/ml“ miešajú tri rôzne varianty. „Kód/EAN: Zvoľte variant“, v selecte je „Zvoľte variant“ a tlačidlo je aktívne bez výberu. Správanie po kliknutí je N.
- [P, V] `view_item` v dataLayer nesie tester `17415/51` s hodnotou 6.18. [H] Predvolený variant v Shoptete je tester, čo by vysvetlilo hlavičku aj dataLayer. Overenie je N, treba admin.
- [P, ČV] Tester má 160 divákov a 2 objednávky (1,25 %). 100 ml má 22 zo 41 objednávok (54 %) a je o 43 % lacnejší na ml ako 15 ml. [H] Diváci testera môžu byť čiastočne artefakt predvoleného variantu.
- [P, ČV] SET 39 € vs 41,60 € za diely: úspora 2,60 € (6,3 %) plus taška neznámej hodnoty. SET má 4,88 % „CR“ proti 11,83 % pri 100 ml.
- **Caribbean** [P, V]: hlavička „od 7,49 €“ (15 ml) plus „od 0,28 €/ml“ (100 ml).
  - 100 ml 27,50 € (preškrtnutá 28,99, –5 %), 50 ml 17,50 € (18,99, –7 %), 15 ml 7,49 € (8,35, –10 %), SET 33,90 €.
  - „Až –10 %“ v hlavičke je zľava najmenšieho variantu, hlavný má –5 %.
  - SET 33,90 € vs 34,99 € za 100+15 ml (úspora 1,09 €, zloženie SETu N).
  - Jeden variant je „Vypredané“, pravdepodobne SET (N).

### B2 — Ponuky sa prebíjajú

- [P, V] Odznak „TESTER 15 ml ZADARMO nad 35 €!“ je na stránke aj na každej dlaždici „Súvisiaci tovar“. V texte Boreal sa vyskytuje 36×, v Caribbean 23×.
- [P, ČV] Na jednej stránke ide o tri rôzne ponuky: platený tester 7,60 €, SET 39 €, tester zadarmo od 35 €. Či platený tester počíta do 35 €, je N. Úrovne 79/149/199 € a Packeta od 65 € na stránke nie sú (N).
- [P, ČV] Q4 plán uvádza „tester sa vkladá ručne“ a pravidlá označuje ako neoverené. Sľub na stránke teda nemusí zodpovedať košíku (košík N).
- [P, V — screenshoty foundera] V chate je bublina „špeciálny zľavový kód“ s odznakom „3“ a widget „Zľava 2 € na prvý nákup?“. Kód `BLACK25` a „platí pri nákupe nad 70 €“ sú vo feede Leadhub (845 produktov), ale na živej stránke sa nezobrazujú (N). Existujúci kód a jeho podmienky sú N.
- [P, ČV] Reálny náklad testera je 4,59–5,77 € (podklady Q4, báza DPH N). Hrubý zisk Boreal 100 ml je 6,26 € bez DPH, teda tester pohltí ≈ 73–92 %. Leadhub zapisuje náklad testera 0,01–0,10 €, preto jeho GP tester nezahŕňa.

### B3 — Dôvera

- [P, V] Boreal: 15× 5★ z 18.3.2023–18.12.2025, odpovede obchodu sú šablónovité. [H] Rovnorodé hodnotenie bez nových vyzerá ako vyberané. Účinok neviem vyčísliť.
- [P, V] Caribbean: widget ukazuje 3 hodnotenia, text tvrdí „5.0/5 z 433 recenzií“. Nepodložené tvrdenie, LEGAL-2 ho označil 9.10.
- [P, V] Pri CTA nie je žiadny blok doprava/vrátenie/platba. Doprava je len v JSON-LD (Packeta 3,29–4,50 €), záruka 2 roky je v karte. Hranica dopravy zadarmo (59 alebo 65 €) je N.
- [P, V] Texty (nájdený text obchodu, nie náš):
  - Boreal: „Nezamieňajte s … [značka originálu]“, „99.9% podobnosťou vône“, „Určené pre: ženy“ proti „pre ženy aj mužov“, prázdny odrážkový bod.
  - Caribbean: značka originálu v úvode, v H2 aj v meta, názov značky odkazuje na interné vyhľadávanie `?string=[značka]`, „verná imitácia“, „Cena 5.30€ vs 120€ originál“, „od 5.30€“ (minimum je 7,49 €), „2+1 zdarma“, „Výdrž 8-12h“ bez podkladu, „Určené pre: mužov“.
  - Právne posúdenie je N (právnik).

### Spoločné vs. špecifické

| | Boreal | Caribbean |
|---|---|---|
| Spoločné | „Zvoľte variant“, miešaná hlavička „od X“ a €/ml, odznak free testera, chat kód a widget 2 €, žiadny blok doprava/vrátenie, odkazy na originály | rovnaké (tracking Caribbean N, HTML nesťahované) |
| Špecifické | 15 starých 5★, SET s najnižšou konverziou, tester ako pravdepodobný default, rozpor v pohlaví | 3 vs „433“, „od 5.30€“, „2+1“, „8-12h“, vypredaný variant, hlavný variant len –5 % |

## 3. Backlog (max 8)

| ID | Nález + dôkaz (stav) | Mechanizmus | Dopad / Náročnosť | Presná zmena | Overenie → metrika | Riziko / závislosť / GO |
|---|---|---|---|---|---|---|
| **QUICK WINS** | | | | | | |
| **QW-1** Čistka tvrdení | Mená originálov, „99.9 %“, „imitácia“, „433“, „od 5.30€“, „2+1“, „8-12h“ (V; právne N) | Odstráni právne a dôverové riziko, ruší falošnú cenovú kotvu | H (riziko), konverzia nevyčíslená / S, ≈ 1–2 h | Texty podľa časti 4. Žiadne URL ani ceny sa nemenia | Znovu stiahnem stránky a vyhľadám zakázané reťazce → 0 výskytov | Už P0 v Q4 pláne (LEGAL-1/2, CRO_UX-3). Potrebuje GO. Znenie potvrdí právnik |
| **QW-2** Jedna ponuka = jedna veta | Odznak free testera, tester 7,60 €, SET 39 €, chat kód, widget 2 € (V; pravidlá N) | Menej protichodných signálov, jasné „čo dostanem“ [H] | M / S–M | Jedna veta o testeri pri CTA plus odkaz na „Podmienky akcií“ (LEGAL-4). Odznak preč z dlaždíc. Chat kód a widget buď s reálnymi podmienkami, alebo vypnúť | Prejsť 3 košíky (30 €, 36 €, 80 €) po košík bez odoslania. Metrika: testerov na objednávku, príspevok na objednávku | Pravidlá musí dodať majiteľ. Treba nasadiť pred zámrzou 20.11. |
| **QW-3** Blok doprava/vrátenie/záruka | Pri CTA nič, doprava len v JSON-LD, prah a vrátenie N | Menej neistoty tesne pred nákupom [H] | M / S | 3 riadky pod CTA, len overené fakty (časť 4) | Majiteľ potvrdí fakty, znovu stiahnem stránku. Metrika: add_to_cart a begin_checkout po obnove GA4 | VOP posúdi právnik (LEGAL-6) |
| **HIGH-IMPACT** | | | | | | |
| **HI-1** Predvolený 100 ml a jasná cenová hlavička | „od 7,60 €“, miešané €/ml, žiadny default, `view_item` s testerom (V); default = tester (H) | Prvé číslo je cena hlavného produktu, o klik menej, správny dataLayer [H] | H (hypotéza) / M, realizovateľnosť v Shoptete N | 100 ml ako default (ak admin dovolí). Hlavička ukazuje cenu zvoleného variantu a €/ml. Tester pomenovaný „na vyskúšanie“ | `view_item` musí niesť `17415/100`. Metrika: príspevok na session. Guardy: marža, AOV, storná, testerov na objednávku | Cena sa nemení, takže cenový zámok neplatí. Potrebuje GO a overenie v admin |
| **HI-2** Cesta k vyskúšaniu vône | Tester 7,60 € a zadarmo od 35 € sú nejasné, 160 divákov → 2 objednávky (ČV) | Neistota vône je jadro bariéry pri online parfume [H] | M / M | Jeden blok „Neistý/á vôňou?“ s jednou cestou. Ktorou, rozhodne majiteľ po známych nákladoch | Príspevok na objednávku vrátane nákladu testera. Guard: náklad testera ÷ GP | Závisí od MF-2. Plán Q4 (CRO_UX-4): bez automatiky, kým nie je známy náklad |
| **HI-3** Recenzie a dôvera | Boreal 15 starých 5★, Caribbean 3 vs „433“ (V) | Aktuálne, overiteľné hodnotenia [H] | M / M | Po-nákupná žiadosť o hodnotenie bez stimulu (LEGAL-2). Zobraziť skutočný počet a dátum | Počet nových overených hodnotení za mesiac | Právny základ e-mailu (LEGAL-5) |
| **MEASUREMENT FIRST** | | | | | | |
| **MF-1** Obnoviť GA4 a opraviť dataLayer | Trial skončil 23.10. (F). `view_item` s testerom. Súhlas predvolene zamietnutý, takže podhodnotenie. GA4 chytá ≈ 88 % objednávok (starší audit) | Bez toho nevidím lievik podľa zariadenia | H (enabler) / S–M | Obnoviť Supermetrics, alebo export GA4: item views, add_to_cart, begin_checkout, purchases a tržby podľa zariadenia, 28 d, obe URL. Oprava dataLayer nasleduje po HI-1 | Zhoda GA4 s objednávkami v Shoptete | GTM sa bez GO nemení |
| **MF-2** Profitový baseline | Leadhub „est. GP“ je z preškrtnutej ceny: 14,70 € vs 7,70 € s DPH na kus 100 ml, ≈ 1,9× nadhodnotené (rovnaký základ). 0,36–0,40 €/session je horná hranica (ČV) | Bez reálneho baseline sa zisk nedá dokázať | H (enabler) / S–M | Z exportu objednávok Shoptet (28 d): tržby, nákup, doprava, náklad testera, reklama podľa zdroja | Realizovaný príspevok na session a na vybavenú objednávku (cieľ Q4 ≥ 3,6 € po reklame) | Export od majiteľa |

### Experimentálny plán (max 3 zmeny)

**Web A/B nie je realistický.**

- Pri ≈ 2 % CR a 2 týždňoch na vetvu (≈ 4 340 sessions) je MDE ≈ 42 % relatívne (môj výpočet). To sedí s 29–40 % z Q4 plánu.
- Na Boreal samotnom je ≤ 186 divákov za 28 dní.
- Okno na meranie pred zámrzou 20.11. je 28.10.–19.11., teda ≈ 2,6 týždňa. Stihne sa jedno čisté meranie.

**E1 — HI-1**

- Hypotéza [H]: ak je prvé číslo cenou hlavného variantu, stúpne realizovaný príspevok na session.
- Test: ON/OFF po týždňoch na úrovni šablóny Yodeyma, alebo PASS/FAIL „no-harm“ (Q4 plán).
- Primárna metrika: realizovaný príspevok na session (rovnaký menovateľ zdroja).
- Guardy: marža na objednávku, AOV, storná, testerov na objednávku, podiel 100 ml (baseline 54 %).
- Dáta: ≈ 2 170 sessions/týždeň za celý shop. Podiel Yodeyma stránok je N.
- Pravidlá (návrh prahu, potvrdí founder): PASS = primárna metrika aspoň na úrovni baseline a žiadny guard horší o viac než 10 %. Horší guard znamená vrátiť späť. Efekt pod MDE je „nepreukázané“, ponechať len pri no-harm.
- Pri nízkej návštevnosti sa pozoruje, netestuje. Smerový ukazovateľ je zmena podielu 100 ml.

**E2 — QW-2 + QW-3**

- Nasadiť ako balík bez testu (jasnosť a právo, nie hypotéza o uplifte).
- Sledovať len guardy.
- Musí byť živé pred 20.11. Účinok „nepreukázaný“.

**E3 — HI-2**

- Až po MF-2 a po zámrzi (po 20.12.).
- Metrika: príspevok na objednávku vrátane nákladu testera.

## 4. Navrhované texty na stránke (návrh, nič nenasadené)

Konštrukcie typu „vonia ako“, „imitácia“, názvy značiek ani % podobnosti sa nepoužívajú. `[OVERIŤ]` je údaj, ktorý musí potvrdiť majiteľ alebo dodávateľ.

- **Cenová hlavička Boreal (po HI-1):** „YODEYMA Boreal EDP 100 ml · 32,90 € · 0,33 € / ml“. Preškrtnutú cenu 39,90 € zobraziť až po vyjadrení právnika (Omnibus).
- **Popisky variantov:**
  - „100 ml · 32,90 € · 0,33 €/ml“
  - „50 ml · 19,50 € · 0,39 €/ml“
  - „15 ml · 8,70 € · 0,58 €/ml“
  - „15 ml tester bez krabičky · 7,60 € · na vyskúšanie vône“
  - „SET 100 ml + 15 ml + taška · 39 € · o 2,60 € menej než kúpa 100 ml a 15 ml zvlášť“
- **Neistota vône:** „Neistý/á vôňou? Vyskúšaj 15 ml tester za 7,60 €. [OVERIŤ: či sa cena testera niekde odpočíta alebo počíta do 35 €]“ Bez sľubu, kým pravidlo nie je potvrdené.
- **Tester zadarmo, jedna veta:** „Pri objednávke od 35 € pridáme 15 ml tester bez krabičky zadarmo. [OVERIŤ: pridáva sa automaticky, alebo na požiadanie; výber vône; kombinácia s ďalšími akciami] Podrobnosti: Podmienky akcií.“ „Zadarmo“ len ak je cena v objednávke 0 € (LEGAL-4).
- **Blok pod CTA:** „Doprava Packeta od 3,29 € · Doručenie [OVERIŤ: lehota] · Doprava zadarmo od [OVERIŤ: 59 € alebo 65 €] · Vrátenie do 14 dní [OVERIŤ: pravidlo pre otvorený parfum podľa VOP] · Záruka 2 roky“. Cena 3,29 € je z JSON-LD (V).
- **Boreal, popis:** „YODEYMA Boreal je intenzívna orientálna kvetinová vôňa v koncentrácii EDP. [OVERIŤ: vonné noty podľa karty dodávateľa] Pre [OVERIŤ: jednotne s parametrom Určené pre].“ Výdrž a sillage len s písomným podkladom dodávateľa.
- **Caribbean, úvod:** „YODEYMA Caribbean EDP je svieža drevnatá vôňa pre mužov s bergamotom, korením a ambroxanom [OVERIŤ: noty podľa karty dodávateľa]. 15 ml od 7,49 €, 100 ml za 27,50 €.“
  - Zrušiť H2 „Alternatíva k …“, „Prečo Caribbean vs …“, „5.30€ vs 120€ originál“, „433 recenzií“, „2+1 zdarma“ (do vydania Podmienok akcií), „Výdrž 8-12h“ a odkaz na interné vyhľadávanie s názvom značky (`?string=[značka]`).
  - Meta title a description opraviť rovnako.
- **Recenzie (nič vymyslené):** zobraziť skutočný počet a dátum posledného hodnotenia. Žiadosť po nákupe: „Ako sa ti vôňa páči? Pár viet od teba pomôže ďalším zákazníkom.“ Bez odmeny.

Off-Shoptet náhľad hlavičky a bloku ponuky (HI-1, QW-2, QW-3): `docs/onlinovo/mockups/2026-10-28-boreal-price-header-offer-block.html`.

## 5. Mobilné UX problémy

Mobil nemám overený vizuálne (F). Všetko je z HTML a desktopových screenshotov.

- **M1 [N]:** poradie prvej obrazovky (fotka → názov → cena → variant → CTA) a či je CTA nad zlomom.
- **M2 [V desktop, N mobil]:** bublina Smartsupp s textom „špeciálny zľavový kód“ a odznakom „3“. [H] Na mobile môže kolidovať s CTA alebo cookie lištou. V košíku a pokladni je Smartsupp vypnutý (V).
- **M3 [V]:** `#ono-pop` je fixný prekryv so z-index 99999, predvolene skrytý. Účel je N.
- **M4 [V]:** widget „Zľava 2 € … CHCEM ZĽAVU / NECHCEM“. [H] Na mobile je to zvyčajne modálne prekrytie obsahu.
- **M5 [V]:** dropdown „Zvoľte variant“ je extra krok a na mobile skrýva rozdiely €/ml medzi variantmi [H].
- **M6 [V desktop]:** dlaždica „Súvisiaci tovar“ nesie 5 signálov naraz: odznak testera, „až –X %“, „od X €“, €/ml a sklad.
- **M7 [N]:** rýchlosť načítania a Core Web Vitals nemerané.
- **Overenie:** 2 telefóny, screenshoty troch stavov (prvá obrazovka, po výbere variantu, košík). CRO_UX-1 z Q4 plánu to už predpisuje.

## 6. Chýbajúce dáta a otázky pre majiteľa

Najprv 1–4, ostatné môžu ísť potom.

1. **GA4 export** alebo obnova Supermetrics: item views, add_to_cart, begin_checkout, purchases, tržby podľa zariadenia, posledných 28 dní, obe URL. Formát: CSV alebo screenshot.
2. **Export objednávok Shoptet** za 28 dní: tržby, nákup, doprava, kód a pridané testery.
3. **Reálny náklad testera:** Leadhub 0,01–0,10 € vs podklady 4,59–5,77 €. Aká je báza DPH?
4. **Pravidlá testera:**
   - Presné pravidlá pre 35 / 79 / 149 / 199 €.
   - Dá sa tester vyberať?
   - Počíta platený tester 7,60 € do 35 €?
   - Pridáva sa automaticky, alebo ručne?
5. Je „špeciálny zľavový kód“ v chate reálny a kto ho nastavil?
6. Sú štítky `BLACK25` a „nad 70 €“ vo feede aktívne, naplánované, skryté alebo zostatkové?
7. Čo je `#ono-pop`?
8. Je Packeta zadarmo od 65 €, alebo od 59 €? Aké sú podmienky vrátenia otvoreného parfumu?
9. Je vypredaný variant Caribbean SET?
10. Odkiaľ je „433 recenzií“?
11. Prečo sú P0 texty z 10.10. stále živé? Bežala CRO_UX-1 (matica 14 košíkov)?
12. Omnibus a referenčná cena 39,90 € (právnik).
13. Baseline sessions: 3,6 tis./mes. (Q4 plán) vs 8 695 za 28 dní (Leadhub).
14. Dá sa v admin Shoptetu nastaviť 100 ml ako predvolený variant?

## 7. 7-dňový plán (st 28.10. – ut 3.11.)

| Deň | Krok | Kto |
|---|---|---|
| st 28.10. | GO/NIE na QW-1. Odpovede 1–6, exporty z bodov 1–2 | majiteľ |
| št 29.10. | QW-1 v Shoptete ručne (Boreal, Caribbean, top-8 SKU). Katalóg do 31.10., tvrdý limit 15.11. | majiteľ |
| pi 30.10. | Znovu stiahnem stránky a overím reťazce. MF-2: baseline z objednávok | ja (read-only) |
| so 31.10. | Mobilné snapshoty (2 telefóny) a košík bez odoslania objednávky | majiteľ |
| ne 1.11. | Voľno | – |
| po 2.11. | Admin: možnosť predvoleného 100 ml. Off-Shoptet náhľad hlavičky a bloku (hotový vopred, viď časť 4) | majiteľ, ja |
| ut 3.11. | GO na HI-1 a QW-2/3. ON od 3.11. do 19.11. (≈ 2,4 týždňa), potom zámrz | majiteľ |

## 8. NEROBIŤ

- Nemeniť URL produktov a kategórií.
- Nemeniť ceny a zľavy do 31.12. (zámok od 24.10.) a nespúšťať nové akcie 20.11.–20.12.
- Nespúšťať web A/B test, na to nie je návštevnosť.
- Nepísať „zadarmo“ tam, kde cena nie je 0 €, a nemiešať platený tester, SET a tester zadarmo do jednej vety.
- Nepridávať falošnú naliehavosť (odpočty, „posledné kusy“ mimo reálneho skladu) ani vymyslené recenzie či počty.
- Nepoužívať mená značiek, % podobnosti, „imitácia“, „dupe“, „vonia ako“.
- Nemeniť GTM ani súhlasy bez analytika, neinštalovať pluginy a nerobiť redizajn celej stránky.
- Neberať Leadhub „est. GP“ ako dôkaz zisku.
- Nezavádzať automatiku testera, kým nie je známy jeho náklad (CRO_UX-4).

## 9. Zmeny čakajúce na explicitné GO

Nič z toho nie je nasadené ani pripravené v Shoptete.

| GO | Zmena |
|---|---|
| GO QW-1 | Čistka tvrdení |
| GO QW-2 | Jedna ponuka = jedna veta |
| GO QW-3 | Blok doprava/vrátenie/záruka |
| GO HI-1 | Predvolený 100 ml a cenová hlavička |
| GO HI-2 | Cesta k vyskúšaniu vône (až po MF-2) |
| GO HI-3 | Proces recenzií |
| GO MF-1 | Obnova GA4 a oprava dataLayer |
| GO MF-2 | Profitový baseline (potrebuje exporty) |

## 10. Finálne rozhodnutie

- **Prvé 3 zmeny:** MF-2, QW-1, HI-1.
  - MF-2 dáva baseline, bez ktorého sa zisk nedá dokázať.
  - QW-1 uzatvára právne a dôverové riziko, ktoré je v Q4 pláne už P0.
  - HI-1 je jediná skutočná CRO páka a meniť cenu pritom nemusím.
- **Ak je kapacita len na jednu:** HI-1. QW-1 je záväzok z Q4 plánu, nie voľba, takže CRO páka je HI-1.
- **Pred produkciou overiť:**
  1. admin: dá sa nastaviť predvolený 100 ml,
  2. pravidlá testera a nová jednoveta,
  3. mobilný snapshot,
  4. znenie od právnika,
  5. baseline z objednávok.
- **Ako poznať, že rástol zisk, nie kliky:**
  - Primárna metrika je realizovaný príspevok na session (objednávky − nákup − doprava − tester − reklama), rovnaký zdroj v menovateli.
  - Druhý ukazovateľ je Q4 KPI ≥ 3,6 € na vybavenú objednávku po reklame.
  - Guardy: marža, AOV, storná, testerov na objednávku.
  - Pod MDE ≈ 42 % platí „nepreukázané“, bez vymysleného uplift %.

**Konštitúcia v2 (12-otázkový Founder Reality Check):** Q1 = NIE, takže strop je VALIDATE (nie BUILD). Všetky zmeny sú text a konfigurácia Shoptetu, ≈ 0 h repo vývoja. Q8 je neskórované (Stripe krok C nehotový). Záznam je v `memory/decisions.md`.

## 11. Dôkazové kotvy (aby sa tvrdenia dali znovu overiť)

Dôkazové súbory z tohto auditu (`boreal.md`, `carib.md`, `*_meta.json`, `*_links.json`) boli v efemérnom kontajneri a nie sú v repozitári. Kotvy nižšie sú to, čo sa dá znovu overiť novým stiahnutím oboch URL (Firecrawl scrape, 28.10.2026). Názvy originálov a značiek sú zámerne vynechané.

**Boreal** (`https://www.onlinovo.sk/tovar/yodeyma-boreal-edp/`)

| Kotva | Výsledok |
|---|---|
| „ZADARMO nad 35“ | 36× |
| Hlavička ceny | `od 7,60 €` |
| „Záruka:“ nasledovaná „2 roky“ | 3 riadky za sebou (text rozdelený cez riadky, regex na jeden riadok vráti 0) |
| „Nezamieňajte s …“ | 1× (názov originálu, tu vynechaný) |
| „99.9% podobnosťou vône … inšpirované vôňami, ktoré používajú iné svetové značky“ | 1× |
| Riadok parametra | `Určené pre: ženy` |
| Widget „Zľava 2 …“ | 1× |
| „špeciálny zľavový“, „BLACK25“, „nad 70“ v texte stránky | 0× |
| „Priemerné hodnotenie produktu je 5,0 z 5 hviezdičiek“ | 15 hodnotení |
| JSON-LD ceny ponúk | 32.90, 8.70, 19.50, 7.60, 39.00 |
| dataLayer `view_item` | položka `17415/51` (tester), hodnota 6.18 |

**Caribbean** (`https://www.onlinovo.sk/tovar/yodeyma-caribbean-edp/`)

| Kotva | Výsledok |
|---|---|
| „ZADARMO nad 35“ | 23× |
| Variant „Vypredané“ | 1× |
| Úvodný odsek | „Hľadáš lacnú alternatívu k [značka]? … verná imitácia vône … od 5.30€, akcia 2+1 zdarma. Výdrž 8-12h. Hodnotenie 5.0/5“ (obsahuje aj „433“) |
| „Cena: 5.30€ vs 120€ originál“ | 1× |
| „Výdrž: 8-12h EDP“, „2+1 zdarma na Onlinovo.sk“ | po 1× |
| Počty reťazcov | „5.30“ 5×, „2+1“ 2×, „8-12“ 2×, názov značky 4×, „imitácia“ 1× |
| Meta `product:price:amount` | 7.49 |
| Meta `ratingValue` / `ratingCount` | 5 / 3 |
| Meta og text | „…lacná alternatíva k [značka] do 15€. Od 5.30€, 2+1 zdarma, výdrž 8-12h. 5.0/5 (433 recenzií)“ |
| Widget „Zľava 2 €“ | 1× |

**Opakovanie kontroly po QW-1:** znovu stiahnuť obe URL a vyhľadať reťazce z tabuliek vyššie; zakázané reťazce (názov originálu aj značky, „99.9“, „imitácia“, „433“, „5.30“, „2+1“, „8-12“) musia dať 0 výskytov.

## 12. Limity

- Tvrdenie o chat bubline a widgete „Zľava 2 €“ je z screenshotov foundera (desktop), nie zo scrapu stránky. Widget sa v scrape objavil (riadok s „Zľava 2“), chat bublina nie.
- Citáty existujúcich textov obchodu („99.9 %“, „verná imitácia“, „Nezamieňajte s …“ a ďalšie) sú nájdený text, nie naše odporúčané znenie. Uvádzame ich len ako dôkaz a na odstránenie.
- Čísla z Leadhub sú ČV. „Conversion rate“ a „est. GP“ nie sú session CR ani realizovaný zisk (viď časť 0 a MF-2).
- Mobil je odvodený z HTML/CSS. Rýchlosť a Core Web Vitals nemerané.
- Košík, pokladňa, Shoptet admin, VOP a pravidlá testera neboli k dispozícii. Všetko, čo od nich závisí, je N a v texte označené `[OVERIŤ]`.
- Právne posúdenie referenčnej ceny (Omnibus), odkazov na originály a „imitácie“ nie je súčasťou auditu. Znenie potvrdí právnik (LEGAL-1/2/4/6).
- Uplift sa nevyčísľuje. Pri ≈ 2 % CR a dostupnej návštevnosti je MDE ≈ 42 % relatívne, preto platí „nepreukázané“, nie vymyslené percento.
- Dátumy a ceny sú k 28.10.2026 a po zámrze cien (24.10.–31.12.) sa nemenia.
