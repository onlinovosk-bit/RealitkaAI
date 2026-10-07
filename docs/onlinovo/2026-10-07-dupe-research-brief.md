---
title: "Dupe parfémy pre onlinovo.sk — research brief"
type: research-brief
status: VALIDATE (nie BUILD)
created: 2026-10-07
---

# Dupe parfémy pre onlinovo.sk: research brief

> **Stav: VALIDATE, nie BUILD.** Toto je výskum, nie rozhodnutie o produkte ani právne poradenstvo.
> **Žiadny zdroj nebol prečítaný v plnom znení.** Sieťový proxy zablokoval stiahnutia (EUR-Lex vrátil prázdnu stranu,
> Google Ads Help bol blokovaný) a štyria výskumní agenti pracovali len z výsledkov vyhľadávania. Každé tvrdenie je preto
> najviac MEDIUM a čísla od predajcov sú LOW. Pred rozhodnutím treba zdroje otvoriť v nezablokovanom prostredí.

## 0. Brána Ústavy v2 (CLAUDE.md direktíva 7)

| Otázka | Odpoveď | Poznámka |
|---|---|---|
| Q1 Zaplatil by za to dnešný klient Revolisu? | **NIE** | Revolis je SaaS pre makléra. Dupe e-shop je iný biznis (onlinovo.sk). **VETO: strop VALIDATE.** |
| Q8 Správny čas? | nehodnotené | Stripe krok C (priorita #1) ešte nie je hotový. |

**Verdikt: VALIDATE.** Brief je obmedzený na výskum (žiadny kód, žiadne zásahy do produkcie). Na BUILD by bol potrebný
dôkaz dopytu v SK/CZ (sekcia 4), potvrdené marže a stanovisko právnika.

## 1. Čo sa tvrdí, že funguje (podľa zdrojov, s istotou)

| Stratégia | Istota | Čo presne máme |
|---|---|---|
| Vlastné názvy produktov a vlastná značka, postupný prechod na vlastné „Originals" (Dossier) | MEDIUM | Sacra cez súhrn: ~60 M $ tržieb v USA v 2025, +120 % rast. Vzťah k marži nie je dokázaný. |
| Discovery set + kredit na plnú fľašu (platnosť ~30 dní, od 50 ml) | MEDIUM mechanizmus, LOW čísla | Rozšírený mechanizmus. „25–40 % set → fľaša" sú tvrdenia predajcov, bez nezávislého zdroja. |
| Recenzie a dôvera | MEDIUM | Spiegel Research Center: 5 recenzií zvýši pravdepodobnosť nákupu o 270 % oproti žiadnej. Heureka tvrdí, že pre 44 % jej používateľov sú recenzie silnejšie než cena (marketing Heureky). |
| Automatizované flowy pred kampaňami | MEDIUM | Klaviyo, Omnisend (vendori). Fragrance repeat ~17 % (agregátor, LOW), takže kategória sa opakuje slabo. |
| Plytké balíčky (10–20 %) namiesto plošných zliav | MEDIUM | Pri 60 % hrubej marži vyžaduje 20 % zľava ~50 % nárast kusov, aby sa vyrovnala. Aritmetika je overiteľná. |
| Sezónnosť Q4, darčekové sety | MEDIUM | USA: december ~60 % Q4 (Circana). Notino ~28 % ročných kusov v nov–dec. Nie sú to CZ/SK dáta. |
| Predplatený kredit alebo členstvo | MEDIUM mechanizmus | Žiadne čísla retencie. |
| Maloobchodné partnerstvá | MEDIUM | Alt. v Sally Beauty, Lattafa na Amazone. |

**Nepodložené:** marže a ziskovosť z blogov, „48× ROI SMS", vplyv TikToku a influencerov, retencia predplatného, miera
chargebackov, akýkoľvek údaj o veľkosti trhu v CZ/SK.

## 2. Právne červené čiary (nie je to právne poradenstvo)

Zdroje: L'Oréal v Bellure (C-487/07), smernica 2006/114/ES čl. 4, smernica 2005/29/ES príloha I bod 13, zákon 147/2001
(SK). **Žiadny z nich nebol prečítaný v plnom znení** (sekcia 7). Písmená jednotlivých ustanovení preto neuvádzam.

1. Nepoužívať meno originálu v názvoch, popisoch, meta tagoch, alt texte ani reklame. Tvrdí sa, že ide o najjasnejšiu expozíciu podľa Bellure a súdu v Bruseli (24. 3. 2026, jediný zdroj, len úryvok).
2. Nepoužívať slová „imitácia", „replika", „klon", „ekvivalent X". Zákaz prezentovať tovar ako imitáciu značkového tovaru je v smernici 2006/114/ES (čl. 4, písmeno neoverené) a v SK zákone o reklame.
3. Nekopírovať fľašu, obal ani podobný názov (neregistrovaný komunitárny dizajn: 3 roky ochrany, len proti kopírovaniu).
4. Cudzie meno nepoužívať ako kľúčové slovo v reklame ani v texte inzerátu.
5. Žiadne nepodložené tvrdenia „rovnaká kvalita" alebo „99,9 % podobnosť".
6. Kozmetická regulácia 1223/2009: zodpovedná osoba v EÚ, notifikácia CPNP, bezpečnostné hodnotenie. Alergény podľa nariadenia 2023/1545: nové produkty po 31. 7. 2026 musia vyhovovať.
7. Omnibus: zľava sa počíta z najnižšej ceny za 30 dní. Cenový test teraz ovplyvní referenčnú cenu pre Black Friday.
8. Google Ads a Meta zakazujú „knock-off, replica, imitation, clone" pri značke (Google Ads policy 176017 nebol otvorený). Google môže pozastaviť účet bez varovania. Pre „inspired by" nemáme primárne potvrdenie.

**Prípady (len sekundárne zdroje):** Equivalenza (FR/ES, korelačné tabuľky), Brusel 2026, nemecký BGH „Creation Lamis" 2011
(napätie s Bellure), Coty v Petite Mort (NL, LOW). **CZ/SK judikát sme nenašli.**

## 3. Testy, ktoré by dali odpoveď (nič sa nespúšťa bez GO)

Počty sú plánovacia heuristika, nie štatistický výpočet.

| # | Test | Hypotéza | KPI | Poznámka |
|---|---|---|---|---|
| T1 | Zber recenzií (Heureka Overené zákazníkmi + vlastné, QR na kartičke v balíku) | ≥5 recenzií na SKU zvýši konverziu | konverzia SKU pred a po | potrebuje ~1 000 návštev na SKU za obdobie |
| T2 | Discovery set s kreditom na 50 ml+ (30 dní) | kredit zvýši konverziu set → plná fľaša | podiel kupujúcich setu, ktorí do 30 dní kúpia plnú veľkosť | ≥100 kupujúcich setu, unikátny kód |
| T3 | Duo/trio balíček 10–20 % vs. plošná zľava | balíček zvýši príspevok na objednávku | príspevok na objednávku (nie AOV) | A/B 2–3 týždne, ~200 objednávok na rameno |
| T4 | Flowy v LeadHube pred kampaňami (po nákupe, žiadosť o recenziu, doplnenie) | flow vyhrá nad kampaňou na príjemcu | tržby na príjemcu | **zápis do LeadHubu je BLOCKED, len návrh** |
| T5 | Kartička s kódom na druhý nákup + e-mail deň 30–45 | zvýši 90-dňový repeat | 90-dňový repeat | striedať objednávky |
| T6 | Prah dopravy zdarma ~15 % nad súčasným AOV | zvýši AOV | AOV a konverzia | striedať po týždňoch |
| T7 | Darčekové sety a banner s termínom doručenia | zvýši podiel Q4 | podiel setov na Q4 tržbách | porovnať s minulým rokom |
| T8 | Referenčná cena pre Omnibus pred BF | zabráni sankcii | história cien bez sporu | právna nutnosť, nie rastový test |

## 4. CZ/SK konkurenti (videné vo výsledkoch vyhľadávania, **nič nebolo overené**)

| Predajca | Pozícia | Čo treba overiť |
|---|---|---|
| Essens (essens-shop.cz) | MLM „inšpirované svetovými značkami" | názvy produktov (menujú originály?), cena, prah dopravy |
| Bi-es cez Darrparfum.cz | ~169–189 Kč / 100 ml, „inšpirované francúzskymi vôňami" | tie isté |
| Yodeyma (Kaufland.cz, yodeymaparis.sk) | ~416 Kč / 50 ml, ~746 Kč / 100 ml, tvrdí „99,9 % podobnosť" | právne riziko ich vlastného textu |
| Anabis (anabis.com/cz, /sk) | arabské značky (Lattafa, Armaf), Khamrah ~740 Kč | najbližší benchmark modelu „arabské parfémy pod vlastným menom" |
| Parfem Plus, Parfen.sk a ďalší | spomenuté na fóre modrykonik.sk (anekdota, LOW) | existencia a model |

Dopyt: globálne „perfume dupes" ~464 K hľadaní mesačne (vendorský agregátor, LOW). **CZ/SK Google Trends a Keyword Planner nemáme.**

## 5. Čo chýba (UNKNOWN, nič sa nehádalo)

- CZ/SK dopyt pre „parfémy inšpirované", „alternatíva parfému", „arabské parfémy" (Keyword Planner, Trends).
- Naše nákupné ceny a marže (bez nich je každé „70–90 % lacnejšie" a marža bez významu).
- `txcd_` kódy a DPH pre SaaS a kredity (účtovníčka) — týka sa Stripe, nie tohto briefu.
- Pravidlá Heureky, Zboží a Shoptetu pre „inšpirované" značky (nenašli sa).
- Právne stanovisko SK/CZ.
- Zdroj pre akúkoľvek dátovú funkciu: podľa direktívy 4 treba pred stavaním niečoho, čo čerpá dáta, nájsť zdroj v `docs/architecture/master-data-sourcing-map.md`. Tento brief žiadnu dátovú funkciu nestavia.

## 6. Otázky pre slovenského IP/reklamného právnika

1. Je po Bellure popis „podľa nôt" alebo „parfumová rodina" zákonný, ak sa nikde (HTML, alt text, recenzie) nepoužije meno originálu?
2. Ako slovenské súdy uplatňujú „bez riadneho dôvodu" a „riadne obchodné zvyklosti" pri dupeoch?
3. Existuje slovenský alebo český judikát o dupe parfémoch?
4. Aké sú aktuálne paragrafy pre nekalú súťaž a porovnávaciu reklamu (Obchodný zákonník, zákon o reklame, ČR: zákon 40/1995, Občiansky zákonník)?
5. Dá sa proti slovenskému predajcovi získať EÚ-široký zákaz ako v Bruseli a aký je reálny náklad obrany?
6. Zodpovedáme za „dupe of X" v recenziách zákazníkov a influencerov?
7. Vyžadujú SK/CZ pravidlá úplný preklad kozmetických štítkov?
8. Ako v praxi funguje oznámenie značky na Google, Meta a marketplaceoch a aké je riziko vyradenia?
9. Môžeme prijať porovnávacie stránky od tretích strán?
10. Je „inspirované" ako slovo samo problém?

## 7. Zdroje (stav: **nestiahnuté**; podľa výsledkov vyhľadávania)

Primárne, pokus o stiahnutie neúspešný: eur-lex.europa.eu (CELEX 32006L0114, 32005L0029, 62007CJ0487), support.google.com/adspolicy/answer/176017.

Sekundárne (len výsledky vyhľadávania): sacra.com/c/dossier, shopify.com/blog/dossier-affordable-luxury-accessible-perfume-pricing, glossy.co (dupe fragrance mainstream, sampling), cosmeticobs.com (Equivalenza), modaes.com (Puig vs Equivalenza), intepat.com a dreyfus.fr (ochrana vône), hpra.ie a exponent.com (alergény), spiegel.medill.northwestern.edu, heureka.group (case study), eightx.co a tyviso.com (balíčky a marže), mediaguru.cz a finance.cz (CZ Black Friday), lupa.cz (Omnibus), anabis.com, kaufland.cz/m/yodeyma, essens-shop.cz, darrparfum.cz, modrykonik.sk (fórum), ictrechtswijzer.be (Brusel), ra-plutte.de a lto.de (BGH).

## 8. Odporúčanie

1. **Neštartovať dupe model**, kým nie je (a) CZ/SK dopyt z Keyword Planner, (b) naša skutočná marža, (c) právne stanovisko.
2. Ak sa pôjde dopredu, začať **arabskými značkami pod ich vlastným menom** alebo vlastnými názvami a popisom nôt, nie „inšpirovaným XY".
3. Testy T1, T2 a T3 sú lacné a nezávisia od dupe modelu. Dajú sa spustiť na existujúcom sortimente.
