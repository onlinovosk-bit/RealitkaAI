# Kataster, stavebné povolenia a územné zmeny ako dátová vrstva Revolis.AI

**Dátum:** 2026-08-31 · **Typ:** posúdenie stávky (bet assessment) · **Stav:** research hotový, rozhodnutie na Andrejovi

---

## 0. Zhrnutie na jednu obrazovku

Podklad, ktorý si poslal, mal správnu intuíciu a **šesť vecných chýb**. Tá najdôležitejšia: tvrdil, že komerčný API prístup k vlastníkom neexistuje. **Existuje.** Geodetický a kartografický ústav (GKÚ) má v cenníku platnom od 1. 1. 2026 elektronické služby ISKN s ročným predplatným — *Vlastníci a oprávnené osoby* za 600 €/rok, *Práva k nehnuteľnostiam* za 600 €/rok, *Informácie o nehnuteľnostiach* za 600 €/rok. To je zmluvná, legálna, strojová cesta k presne tým dátam, o ktorých podklad tvrdil, že sú nedostupné.

Druhá najdôležitejšia vec ide opačným smerom a podklad ju vôbec nespomenul: **ÚGKK pripravil novelu katastrálneho zákona, ktorá zavádza povinnú autentifikáciu cez eID a výslovne zakazuje automatizované hromadné spracúvanie údajov katastra softvérovými robotmi na marketingové účely alebo na vytváranie databáz.** Účinnosť je podľa zdrojov 1. 7. 2026 alebo 1. 1. 2027 — zdroje si protirečia a treba to overiť v Zbierke. Ak to platí, potom celý biznis model „notifikácie o zmene vlastníka pre maklérov", ktorý bol jadrom podkladu, je model, ktorý štát práve zakazuje.

Z toho vyplýva zásadné preorientovanie. **Peniaze v katastrálnych dátach pre Revolis nie sú v akvizícii leadov. Sú v transakčnej vrstve** — v overení, že predávajúci je naozaj vlastník, v odhalení spoluvlastníkov a tiarch skôr, než maklér investuje tri mesiace, a v tom, že údaje o nehnuteľnosti tečú do zmluvy bez preklepu, takže návrh na vklad neskončí prerušením konania. Táto vrstva má čistý právny základ (plnenie zmluvy, nie marketing), stojí ~1 920 €/rok na vstupných dátach a rieši bolesť, ktorú každý maklér pozná.

A ak chceš predsa lead radar, existuje zdroj, ktorý nikto na Slovensku systematicky nesleduje a ktorý je právne oveľa čistejší než kataster: **Centrálny register energetických certifikátov budov na inforeg.sk má vyhľadávanie s filtrom „účel: predaj".** Energetický certifikát je pri predaji povinný a vzniká *pred* inzerciou. Nový záznam s účelom predaj je teda predstihový signál, že konkrétna nehnuteľnosť ide na trh — a majiteľ už rozhodnutie predávať urobil, takže námietka o nevyžiadanom marketingu je podstatne slabšia.

---

## 1. Šesť opráv voči podkladu

**Oprava 1 — komerčný prístup k vlastníkom existuje.** Podklad citoval stanovisko, že „pre komerčné subjekty neexistuje oprávnený záujem ani možnosť byť napojený na kataster cez API". Cenník GKÚ platný k 1. 1. 2026 obsahuje približne štrnásť elektronických služieb ISKN s ročným predplatným, vrátane *Vlastníci a oprávnené osoby* (600 €), *Práva k nehnuteľnostiam* (600 €), *Informácie o nehnuteľnostiach* (600 €), *Výpisy z listov vlastníctva* (3 000 €), *Priestorové informácie* (3 000 €), *Registre a číselníky* (120 €) a *Metaúdaje* (0 €). Výročná správa GKÚ uvádza, že služby umožňujú poskytovanie údajov z ISKN v tvare umožňujúcom strojové spracovanie a že sa na ne môžu integrovať rôzni konzumenti. K ročnému predplatnému sa podľa cenníka pripája mesačný poplatok vo výške 3 % z ceny údajov pri rozsahu do 1 400 katastrálnych území, resp. 1 % pri rozsahu nad 1 400 — účtovaný bez ohľadu na reálne čerpanie. GKÚ nie je platcom DPH.

**Oprava 2 — mapsfy nie je zdroj dát.** Podklad ju uviedol ako alternatívny komerčný zdroj s dennými zmenami katastra. Na vlastnom blogu MAPSFY s. r. o. explicitne uvádza, že *neposkytuje dáta katastra SR*. Je to softvér na import a vizualizáciu formátov VGI, DBF a FPU — samosprávy si dáta musia objednať samy z GKÚ. Ako dodávateľ dát je to slepá ulička.

**Oprava 3 — URBION nie je dnešný informačný systém.** Historicky to bol Inštitút urbanizmu a územného plánovania. Dnešný systém je **ISUV** (Informačný systém územného plánovania a výstavby), ktorého štruktúru a prevádzku upravuje **vyhláška č. 60/2025 Z. z.** účinná od 1. 4. 2025. Súčasťou je Portál výstavby s registrom výstavby a registrom stavieb.

**Oprava 4 — register stavieb nie je verejný.** Z textu vyhlášky 60/2025 vyplýva, že prístup do systému je až po registrácii a prihlásení, niektoré funkcie výlučne cez eID, a vyhláška nespomína API, open data ani hromadné publikovanie. Portál `vystavba.uupv.sk` blokuje automatizované čítanie. Podklad predpokladal scraping obcí ako riešenie — realita je, že štát tie dáta centralizoval a zároveň zavrel.

**Oprava 5 — Open Data smernica vlastníkov neotvára, naopak ich vylučuje.** Vykonávacie nariadenie (EÚ) 2023/138 o súboroch údajov s vysokou hodnotou definuje pri katastrálnych parcelách rozsah ako jedinečný identifikátor, geometriu, kód parcely a odkaz na správnu jednotku. **Mená vlastníkov v tom rozsahu nie sú.** Recitál 8 navyše vyžaduje súlad s GDPR a odporúča anonymizáciu. Nádej, že sa vlastníci raz stanú open data, je teda nepodložená.

**Oprava 6 — právny stav sa mení proti tomuto modelu, nie preň.** Podklad uviedol „zmena legislatívy" ako riziko s mitigáciou „diverzifikácia zdrojov". Novela katastrálneho zákona (LP/2025/434) zavádza povinnú autentifikáciu pre prístup k údajom vlastníkov, obmedzuje dátum narodenia, trvalý pobyt a tituly nadobudnutia na autentifikovaný prístup, a zavádza nové priestupky za neoprávnené nakladanie s údajmi. Dôvodová správa formuluje zámer priamo: skutočnosť, že niektoré osobné údaje sú verejne dostupné, v žiadnom prípade neznamená, že môžu byť ďalej šírené, zverejňované alebo inak spracovávané. Diverzifikácia zdrojov to nerieši, lebo obmedzenie nie je o zdroji, ale o účele.

**Čo podklad naopak trafil správne:** INSPIRE HVD parcely sú reálne a zadarmo, DATAcube je reálny zdroj štatistík, konkurencia s katastrálnymi notifikáciami na Slovensku naozaj chýba, a fraud detection cez overenie vlastníka je dobrý nápad — je to dokonca najlepší nápad v celom podklade, hoci bol zaradený až medzi okrajové prípady.

---

## 2. Čo sa reálne dá získať

### 2.1 Kataster

| Zdroj | Čo dáva | Cena | Licencia / limit |
|---|---|---|---|
| **Elektronické služby ISKN (GKÚ)** — zmluva | vlastníci a oprávnené osoby, práva k nehnuteľnostiam, informácie o nehnuteľnostiach, výpisy z LV; strojovo | 120–3 000 €/rok za službu + 1–3 % mesačne | zmluvne; **technická dokumentácia nie je verejná — treba vyžiadať** |
| **Dávkové dáta VÚGK** (SPI + VKM) | popisné info a vektorová mapa po katastrálnych územiach, denná aktualizácia | 9–250 €/k. ú. (SPI), 9–75 €/k. ú. (VKM); 50 % zľava pri opakovanej objednávke do 12 mes. | ~3 500 k. ú. v SR ⇒ celoplošne desiatky až stovky tisíc €; dodacia lehota 30 dní; bez rodných čísel |
| **WMS/WMTS katastrálnej mapy (GKÚ)** | obrázky mapy, S-JTSK/WGS84 | zadarmo | **CC BY 4.0, komerčne OK** — ale vracia rastry, nie atribúty |
| **Open data AKO 3.0** (`ako.vugk.sk`) | parcely registra C a E s vybranými atribútmi, katastrálne územia, GeoPackage | zadarmo | aktualizácia **len raz za tri mesiace**; **bez vlastníkov a bez čísel LV** |
| **INSPIRE HVD** (geoportal.gov.sk, rpi.gov.sk) | katastrálne parcely C KN / E KN, ATOM/WFS | zadarmo | HVD ⇒ bezplatné a strojové; geometria, nie vlastníci |
| **Sledovanie zmien na LV** (`ks_336503`, ÚGKK) | notifikácia o zmene na LV | **zadarmo** | vyžaduje eID a **funguje len pre nehnuteľnosti prihláseného používateľa** — nedá sa preto predávať ako služba tretej strane |
| **Cribis (CRIF)**, `kataster-portal.sk` | lustrácia nehnuteľností osoby alebo firmy podľa mena, dátumu narodenia alebo IČO | ceny nezverejnené | existujúci komerční hráči — merať sa treba voči nim |

Zhrnuté ľudsky: **geometriu máš zadarmo, vlastníkov len za peniaze a na zmluvu, a zmeny vlastníctva v reálnom čase nemá zadarmo nikto.** Bezplatná služba sledovania zmien na LV je zámerne postavená tak, aby ju nešlo preposielať ďalej.

Právny rámec je § 68 a § 69 zákona 162/1995 Z. z. Katastrálny operát je verejný a sprístupňuje sa meno, priezvisko, rodné priezvisko, dátum narodenia a miesto trvalého pobytu; nesprístupňuje sa rodné číslo a ceny poľnohospodárskych a lesných pozemkov. Správne poplatky za listinné výstupy sú 8 € za výpis z katastra za každých začatých 20 parciel v rámci jedného k. ú., 8 € za kópiu z mapy, 15 € za grafickú identifikáciu parciel, 3 € za nahliadnutie.

**Prevádzkové riziko, ktoré treba brať vážne:** ÚGKK utrpel kybernetický útok, otvorené dáta boli obnovené až 27. 8. 2025 a k 18. 2. 2026 bolo podávanie návrhov cez ÚPVS stále nefunkčné. Dostupnosť katastrálnych služieb nie je vec, na ktorej sa dá postaviť SLA bez cache a fallbacku.

### 2.2 Stavebné povolenia

Zákon o výstavbe 201/2022 sa v pôvodnej podobe neuplatnil a bol nahradený novým **stavebným zákonom č. 25/2025 Z. z.** účinným od 1. 4. 2025. Zákon 200/2022 o územnom plánovaní platí ďalej v znení k 1. 3. 2026. Územné rozhodnutie a stavebné povolenie nahradilo jedno **konanie o stavebnom zámere**, ktoré vedú obce ako stavebné úrady, špeciálne stavebné úrady pre líniové stavby a regionálne úrady ÚÚPV. Kompetencia teda ostáva rozdrobená na stovky úradov.

Register stavieb v ISUV existuje od 1. 4. 2025, ale je **neverejný**. Verejné a použiteľné ostávajú tri veci:

Prvá je **DATAcube ŠÚ SR** — API bez registrácie, JSON-stat/CSV/XML/XLSX, licencia **CC-BY 4.0 s povoleným komerčným použitím**, endpointy typu `https://data.statistics.sk/api/v2/dataset/{kocka}/...`, limit 2 000 znakov URL a 10 000 položiek na požiadavku. Dáva agregované počty povolení a dokončených bytov, štvrťročne, historicky na úrovni kraja a okresu. Presné kódy kociek pre vydané povolenia sa v tomto kole nepodarilo potvrdiť a granularita na úrovni obce je neoverená. Pre lead generation to je nepoužiteľné — nie sú tam adresy ani investori. Pre trhové analytiky a pre content marketing to je zadarmo a hneď.

Druhá je **portál územného plánovania na `stavebnyurad.info`**, spustený 1. 4. 2024, s registrom obcí, registračnými listami územnoplánovacej dokumentácie a verejnými vyhláškami. Dokumenty sú reálne stiahnuteľné cez `aktovka.stavebnyurad.info`. API nie je dokumentované, takže ide o scraping — a licencia tam nie je deklarovaná, čo treba právne posúdiť pred nasadením.

Tretia je **CUET** (`cuet.slovensko.sk`), centrálna úradná elektronická tabuľa, ktorá agreguje tabule obcí a úradov a **má RSS, ale per inštitúcia** — vyhľadáva sa podľa názvu, IČO, lokality alebo kategórie orgánu. Globálny feed ani bulk export neexistuje. Prakticky to znamená približne tri tisíc RSS odberov, čo je realizovateľné, ale krehké, a obce zverejňujú nekonzistentne.

Mestské open data portály nepomôžu: Bratislava má `opendata.bratislava.sk` a silnú ArcGIS platformu s územným plánom, ale stavebné povolenia medzi datasetmi nie sú; Košice majú pilot s ~28 datasetmi, tiež bez povolení.

### 2.3 Územné zmeny

Celoslovenská GIS vrstva funkčného využitia plôch alebo zastavaného územia **neexistuje**. Na `rpi.gov.sk` je záznam „Územné plány" označený ako TEST. ZBGIS dáva zadarmo pod CC-BY 4.0 územné a správne usporiadanie, katastrálne územia, hranice obcí, okresov a krajov, ortofoto a LLS/DMR — teda podklad, nie zonáciu. Obce majú do 31. 3. 2032 povinnosť digitalizovať papierovú územnoplánovaciu dokumentáciu; do vtedy je to per obec.

Bratislava je výnimka s vlastným územným plánom na ArcGIS Experience a `bratislava.gisplan.sk`. Ak by mal produkt začať s jedným mestom, je to Bratislava.

### 2.4 Zdroje, ktoré podklad vôbec nespomenul

Toto je časť, kde je najviac nevyužitej hodnoty, lebo sú to verejné, lacné a v realitnom kontexte prakticky nesledované registre.

| Zdroj | Signál | Prístup | Hodnota |
|---|---|---|---|
| **Centrálny register energetických certifikátov** `inforeg.sk/ec/SearchEC.aspx` | budova ide na predaj alebo prenájom — **filter „účel: predaj"**, plus kraj/okres/obec/parcela/kategória | verejné vyhľadávanie zadarmo (email+heslo), dataset aj na data.gov.sk; API neoverené, pravdepodobne scraping | ★★★★★ predstihový signál pred inzerciou |
| **Obchodný vestník — štruktúrované údaje** | dražby nehnuteľností s LV, k. ú., parcelným a súpisným číslom a najnižším podaním; konkurzy, likvidácie | XML export po registrácii (schválenie ~mesiac); **sťahovať len 19:00–7:00 v pracovných dňoch**, cez víkend bez obmedzenia | ★★★★★ nehnuteľnosti identifikované priamo v texte |
| **Slovensko.Digital Datahub** | Obchodný vestník (konkurzy, likvidácie), RPO v2, CRZ, register účtovných závierok, dlžníci SP a VšZP | `datahub.ekosystem.slovensko.digital/api/data/<zdroj>/sync` + SQL API; 60 req/min zadarmo, potom **9 / 36 / 72 €/mes**; licencia dovoľuje komerčné použitie | ★★★★★ najrýchlejšia cesta k dátam vôbec |
| **Notársky centrálny register dražieb** `notar.sk/drazby` | dobrovoľné dražby nehnuteľností | verejný formulár, API/RSS neoverené ⇒ scraping | ★★★★ prekrýva sa s OV, ale dopĺňa |
| **CUET** `cuet.slovensko.sk` | zámery obcí previesť alebo prenajať nehnuteľný majetok podľa § 9a zák. 138/1991 | RSS per inštitúcia | ★★★★ B2G leady, nikto ich nesleduje |
| **REPLIK** `replik.justice.sk` | súpisy majetku správcov, teda nehnuteľnosti úpadcov | verejná časť zadarmo; **pozor, `ru.justice.sk` sa presmerováva sem — staré integrácie sú rozbité** | ★★★ |
| **RPO API ŠÚ SR** `api.statistics.sk/rpo/v1/` | firemné údaje | zadarmo, **CC-BY** | ★★★ enrichment |
| **RPVS** `rpvs.gov.sk/opendatav2/swagger` | koneční užívatelia výhod firiem-vlastníkov | zadarmo, OData/Swagger | ★★★ enrichment |
| **Notársky centrálny register záložných práv** | záložné právo na nehnuteľnosť | verejný | ★★★ distress signál |
| **Centrálny register exekúcií** `cre.sk` | exekúcia voči osobe | **1,60 € za nahliadnutie**, webové služby cez klientsky certifikát | ★★ len ad hoc, plošne ekonomicky nezmyselné |
| **FinStat API** | firemné dáta | API až od PREMIUM **350 €/rok**, ELITE 1 200, ULTIMATE 2 750 | ★★ alternatíva k RPO |

Dve slepé uličky, aby sme sa k nim nevracali: **dedičské konania sú nepoužiteľné** — Notársky centrálny register závetov je výslovne neverejný a žiadosti sa nevyhovie za života poručiteľa, takže „zombie properties" detekcia z podkladu nemá zdroj. A **dane z nehnuteľností sú daňové tajomstvo**; verejné sú len zoznamy daňových dlžníkov, ktoré obce zverejňujú na vlastných tabuliach.

---

## 3. Právna brána

Toto je časť, ktorá rozhoduje o tom, čo sa vôbec smie postaviť, a preto sa rieši prvá, nie naposledy.

**Kataster nemá v § 68 explicitné obmedzenie účelu.** Obmedzenie prichádza z GDPR a z pripravovanej novely, nie z katastrálneho zákona. To je dôležité rozlíšenie: „je to verejné" nie je právny základ na spracúvanie.

**Článok 14 GDPR je pre tento produkt najväčšie riziko.** Pri údajoch získaných inak než od dotknutej osoby musíš osobu informovať najneskôr do jedného mesiaca. Výnimka „neprimerané úsilie" znie lákavo, ale poľský úrad ju v prípade **Bisnode** (2019, pokuta ~220 000 €) odmietol: firma scrapovala verejné registre a informovala len tých, ku ktorým mala e-mail; úrad to označil za vedomé komerčné rozhodnutie, ktorého náklady patria do ceny produktu, a zverejnenie informácie na webe označil za príliš pasívne. Praktický dôsledok pre nás je ostrý: **pri adresnom liste sa článok 14 splní ľahko, lebo informačná doložka je priamo v liste. Pri budovaní databázy vlastníkov bez kontaktu je to prakticky nesplniteľné.**

**Rakúsky precedens je najsilnejší pozitívny argument.** Rakúsky dozorný úrad v rozhodnutí DSB-D123.626/0006-DSB/2018 z 23. 4. 2019 uznal oprávnený záujem podľa čl. 6 ods. 1 písm. f) na spracúvaní verejne dostupných údajov z pozemkovej knihy na účel priamej reklamy — s podmienkami, že ide o **jednorazový poštový kontakt**, údaje pochádzajú z verejného registra a na požiadanie sa vymažú. Česká cesta je opačná: ČÚZK zdôrazňuje účelovú viazanosť a marketing medzi účely katastra nepatrí.

**Kanály sú tvrdo regulované.** Podľa § 116 zákona 452/2021 o elektronických komunikáciách je na **e-mail, SMS, automatické volacie systémy a fax voči fyzickej osobe potrebný predchádzajúci preukázateľný súhlas**, uchovávaný minimálne štyri roky. Telefonáty s ľudským operátorom sú od 1. 2. 2022 v režime opt-out — ale zakázané, ak je číslo v **Robinsonovom zozname**, ktorý vedie Úrad pre reguláciu elektronických komunikácií a poštových služieb na `nevyziadanevolania.sk`; telemarketér sa musí registrovať, overovať čísla dvakrát mesačne k 1. a 16. dňu a volať z predvoľby **(0)888**. Sankcie idú od 200 € až do **5 % obratu**. Výnimka pre B2B platí len ak firma zverejnila kontaktné údaje — na vlastníka-fyzickú osobu sa nevzťahuje. K tomu § 3 ods. 4 zákona 147/2001 o reklame: reklama sa nesmie šíriť adresne, ak adresát doručenie vopred odmieta, dozor má SOI.

**Verdikt.** Bezpečné je: jednorazový adresný list s vloženou informačnou doložkou podľa čl. 14, rešpektovanie odmietnutí cez vlastný suppression list, B2B kontakt na firmy so zverejnenými kontaktmi, a práca s neosobnými technickými údajmi (parcely, výmery). Šedá zóna: telefonát fyzickej osobe (legálny len s kontrolou Robinsonovho zoznamu a predvoľbou 0888), budovanie databázy vlastníkov bez okamžitého kontaktu, opakované oslovovanie, a oprávnený záujem bez zdokumentovanej LIA. Zakázané: e-mail alebo SMS fyzickej osobe bez súhlasu, automatizované hromadné sťahovanie katastra na marketing alebo na tvorbu databáz, ďalší predaj údajov vlastníkov tretím stranám, a volanie na číslo v Robinsonovom zozname.

Pre Revolis to znamená jednu vetu: **nesmieme postaviť produkt, ktorý za makléra hromadne vyťaží vlastníkov a pošle mu ich do CRM.** Môžeme postaviť produkt, ktorý overí konkrétnu nehnuteľnosť v konkrétnom obchode, a produkt, ktorý sleduje verejné komerčné oznámenia.

---

## 4. Tri produktové vrstvy, ktoré stoja za peniaze

### Vrstva 1 — Transakčná istota (odporúčam začať tu)

Toto je jadro. Maklér zadá číslo LV alebo parcelu, Revolis vytiahne z ISKN vlastníkov, podiely a práva k nehnuteľnosti, a odpovie na štyri otázky, ktoré rozhodujú o tom, či je obchod reálny.

Prvá: **je ten, kto podpisuje sprostredkovateľskú zmluvu, naozaj vlastník?** Podľa dát z odvetvia zažila väčšina maklérov pokus o predaj nehnuteľnosti osobou, ktorá nebola oprávnená ju predať. Automatická kontrola mena voči LV je triviálna funkcia s obrovskou vnímanou hodnotou.

Druhá: **koľko je spoluvlastníkov a v akých podieloch?** Toto je najpodceňovanejší killer obchodov na Slovensku. Podielové spoluvlastníctvo a bezpodielové spoluvlastníctvo manželov znamenajú, že jeden podpis nestačí. Maklér, ktorý to zistí až tri mesiace do exkluzivity, prišiel o kvartál. Revolis to má vedieť povedať v deň nula a rovno vygenerovať zoznam podpisov, ktoré treba zohnať.

Tretia: **aké sú ťarchy?** Záložné právo banky, vecné bremeno doživotného užívania, exekučné záložné právo. Každé z nich mení scenár obchodu a niektoré ho zabíjajú.

Štvrtá: **sedia údaje o nehnuteľnosti presne tak, ako musia byť v zmluve?** Parcelné číslo, register C alebo E, katastrálne územie, číslo LV, výmera, druh pozemku, súpisné číslo, spoluvlastnícky podiel. Preklep v ktoromkoľvek z nich znamená prerušenie konania o vklade, stratený poplatok a týždne navyše. Revolis už dokumenty generuje — toto je len naplnenie identifikačného bloku z autoritatívneho zdroja namiesto z pamäte makléra.

Právny základ je tu čistý: spracúvanie je nevyhnutné na plnenie zmluvy a na oprávnený záujem overiť protistranu, deje sa per nehnuteľnosť v konkrétnom obchode, nie plošne, a nesmeruje k marketingu. Presne to, čo novela nezakazuje.

### Vrstva 2 — Radar verejných oznámení (druhý krok, právne čistý)

Nie kataster, ale verejné komerčné oznámenia. Dražby z Obchodného vestníka a z Notárskeho centrálneho registra dražieb obsahujú nehnuteľnosť identifikovanú číslom LV, katastrálnym územím a parcelou, plus najnižšie podanie. Súpisy majetku úpadcov z REPLIK-u. Zámery obcí previesť majetok z CUET. Toto sú **oznámenia právnických osôb určené verejnosti**, nie osobné údaje na marketing — GDPR problém prakticky mizne a dražobník alebo správca je B2B kontakt.

Pre makléra to je dvojaká hodnota: nájde predajné príležitosti pre svojich kupujúcich klientov, a nájde protistranu, s ktorou sa dá legálne komunikovať e-mailom.

### Vrstva 3 — Predstihový signál z energetických certifikátov (najvyšší upside, treba overiť)

Energetický certifikát je pri predaji a prenájme povinný podľa zákona 555/2005 a vzniká pred inzerciou. Register na `inforeg.sk` je verejne prehľadávateľný a **má priamo filter na účel „predaj"**, plus filtre na obec, parcelu a kategóriu budovy. Denný diff nových certifikátov s účelom predaj v teritóriu makléra je zoznam nehnuteľností, ktoré idú na trh — typicky skôr, než sa objavia na portáloch.

Toto je najlepší nápad v celom dokumente a nikto ho na Slovensku nerobí. Tri veci treba overiť, kým sa naň staviame: licenciu datasetu a podmienky používania registra, frekvenciu aktualizácie, a či záznam obsahuje adresu v použiteľnej kvalite. A oslovenie majiteľa musí ísť cestou jednorazového listu podľa rakúskeho precedensu, nie e-mailom.

---

## 5. Uhly, na ktoré by nikto nepomyslel

**Signálom je absencia zmeny, nie zmena.** Výhradné sprostredkovateľské zmluvy bežia typicky tri až šesť mesiacov. Revolis vie, ktoré nehnuteľnosti v CRM makléra zostarli. Keď k tomu pridáme, že inzerát z portálu zmizol a v katastri **nenastala zmena vlastníka**, dostávame nehnuteľnosť, ktorú sa nepodarilo predať a ktorej exkluzivita práve vypršala alebo vyprší. To je moment s najvyššou konverziou v celom realitnom biznise a nevyžaduje z katastra žiadny osobný údaj — kontakt na majiteľa už maklér má, alebo je inzerát verejný. Nikto to nerobí, lebo všetci hľadajú udalosť namiesto jej neprítomnosti.

**Audit portfólia ako platený onboarding.** Každá realitka má CRM plné nehnuteľností popísaných z pamäte. Jednorazové zosúladenie s katastrom nájde zlé parcelné čísla, nehnuteľnosti, ktoré sú už dávno predané a stále sa inzerujú (čo je mimochodom riziko klamlivej reklamy podľa 147/2001), chýbajúce ťarchy a nesprávne podiely. Predávaj to ako platený onboarding audit — je to okamžitý WOW na demo, generuje hotovosť pred predplatným a je to prirodzený land-and-expand vstup.

**Compliance ako moat, nie ako brzda.** Toto je kontraintuitívne a preto to je najsilnejšie. Novela katastrálneho zákona zakáže robotické vyťažovanie na marketing. Ktokoľvek, kto medzitým postaví lead machine na scrapingu, má v roku 2027 produkt, ktorý je priestupkom. Revolis, ktorý je compliant by design a vie to majiteľovi realitky ukázať na papieri, predáva istotu, nie leady. Majiteľ realitky, ktorý ručí za GDPR svojej agentúry, je iná — a lepšie platiaca — cieľová osoba než maklér, ktorý chce viac telefónnych čísel.

**Predaj sledovanie zmien na LV ako asistovanú službu, nie ako dáta.** Štátna služba `ks_336503` je zadarmo, ale funguje len pre nehnuteľnosti prihláseného používateľa cez eID. To znamená, že **vlastník si ju vie zapnúť sám**. Revolis to nesmie robiť za neho hromadne, ale maklér môže klientovi pomôcť ju nastaviť ako súčasť služby — a Revolis môže byť miesto, kde sa výsledok eviduje. Z „nedostupnej dátovej služby" sa tak stane feature dôvery, ktorá nič nestojí.

**Fragmentované spoluvlastníctvo ako produktová nika.** Pozemky s ôsmimi a viac spoluvlastníkmi na jednom LV sú na Slovensku bežné dedičstvo po komasáciách a sú prakticky nepredajné bez špecialistu. Identifikácia takých parciel z dát je jednoduchá. Oslovenie je právne citlivé a po novele pravdepodobne obmedzené, takže z toho nerob outbound stroj — ale ako **nástroj pre makléra, ktorý sa na túto niku špecializuje** a ktorý s tými ľuďmi už jedná, je to obrovská úspora práce.

**Čo naopak vyhoď.** Tokenizácia nehnuteľností a blockchain z podkladu nemá k dispozícii žiadny dátový vstup, ktorý by sme týmto výskumom získali, a nesúvisí s bolesťou slovenskej realitky v roku 2026. Detekcia „zombie properties" cez vek vlastníka nemá zdroj (dedičské registre sú neverejné), je z pohľadu GDPR toxická a po novele pravdepodobne priestupok. Outcome-based pricing ako percento z provízie je pekná myšlienka, ale robí z Revolisu spoludohadovača provízie a účtovne aj právne je to iná firma — nechaj to na neskôr.

---

## 6. Ekonomika

Minimálny zmysluplný balík ISKN pre transakčnú vrstvu je *Vlastníci a oprávnené osoby* + *Práva k nehnuteľnostiam* + *Informácie o nehnuteľnostiach* + *Registre a číselníky*, teda **600 + 600 + 600 + 120 = 1 920 €/rok**, plus mesačný poplatok podľa rozsahu katastrálnych území. Ak by sme neskôr chceli aj výpisy z LV a priestorové informácie, pridáva sa 6 000 €/rok, čiže plný balík vychádza okolo **7 920 €/rok** pred percentuálnym poplatkom.

K tomu Slovensko.Digital Datahub za **9 až 72 €/mesiac** podľa objemu, čo je v ročnom vyjadrení 108 až 864 €. Geometria, DATAcube, RPO, RPVS, ZBGIS a INSPIRE sú zadarmo.

Realistický ročný náklad na dáta pre vrstvu 1 a 2 je teda rádovo **2 000 až 3 000 €**. Pri programe za 199 €/mesiac to znamená, že **jeden zákazník na dvanásť mesiacov pokryje celý dátový náklad** a druhý ho už len znásobuje. To je veľmi príjemná jednotková ekonomika — dátová vrstva nie je variabilný náklad na makléra, je to fixný náklad, ktorý sa amortizuje pri treťom zákazníkovi a potom je marginálne zadarmo.

Nezanedbaj ale skryté náklady: právne posúdenie a LIA, ktoré treba urobiť pred spustením čohokoľvek s osobnými údajmi, a zmluvné rokovanie s GKÚ, ktorého trvanie a podmienky sú dnes neznáme. Registrácia na štruktúrované dáta Obchodného vestníka trvá podľa verejných skúseností približne mesiac a registračné číslo chodí poštou.

Ako to zabaliť do ceny: nerob z toho samostatný tier. Transakčná istota patrí do jadra programu, lebo to je dôvod, prečo si majiteľ realitky vyberie Revolis namiesto tabuľky — a lustrácia sa dá počítať ako kredit, čo sedí na existujúci credits engine v repe. Radar a predstihové signály sú prirodzený vyšší tier alebo doplnok. Audit portfólia je jednorazová platba pri onboardingu.

---

## 7. Riziká, zoradené podľa toho, čo skutočne bolí

Najväčšie riziko je **legislatívne**: novela katastrálneho zákona s povinnou autentifikáciou a zákazom robotického spracúvania. Ak sa Revolis oprie o lead-gen z katastra, stavia na piesku. Mitigácia je stavať vrstvu 1, ktorá zákaz neporušuje, a vrstvu 2, ktorá kataster nepotrebuje. Presnú účinnosť treba overiť v Zbierke — zdroje uvádzajú 1. 7. 2026 aj 1. 1. 2027.

Druhé je **zmluvné**: obchodné a licenčné podmienky VÚGK, konkrétne či dovoľujú **redistribúciu údajov v SaaS produkte**. Toto je binárne — buď to ide, alebo celá vrstva 1 padá. Zatiaľ neprečítané.

Tretie je **technické**: dokumentácia elektronických služieb ISKN nie je verejná, takže protokol, formáty, rate limity a existencia sandboxu sú neznáme. Nedá sa odhadnúť implementácia, kým to nemáme.

Štvrté je **prevádzkové**: dostupnosť ÚGKK po kybernetickom incidente. Cache a graceful degradation nie sú nice-to-have.

Piate je **GDPR**: bez zdokumentovanej LIA a bez suppression listu je aj legálny kanál napadnuteľný.

A šieste, ktoré sa ľahko prehliada: **AKO 3.0 sa aktualizuje raz za tri mesiace**. Ak by niekto v tíme navrhol postaviť „notifikácie o zmenách" na bezplatných open data, treba to zabiť hneď — kvartálny dataset nie je notifikačný zdroj.

---

## 8. Čo urobiť tento týždeň

Prvý krok stojí jeden e-mail a odomkne alebo zavrie celú stávku: **napísať GKÚ na `objednavky.vugk@skgeodesy.sk` a vyžiadať technickú dokumentáciu elektronických služieb ISKN, návrh zmluvy a obchodné a licenčné podmienky s dôrazom na to, či je povolená redistribúcia údajov v SaaS produkte.** Kým nemáme odpoveď, nepíše sa žiadny kód.

Druhý krok je právny: **overiť v Zbierke zákonov účinnosť a finálne znenie novely katastrálneho zákona** (LP/2025/434), najmä rozsah zákazu automatizovaného spracúvania a či sa vzťahuje aj na spracúvanie na účel plnenia zmluvy.

Tretí krok je validačný a nestojí nič: **spýtať sa Smolka**, koľko obchodov mu za posledný rok padlo alebo sa predĺžilo pre spoluvlastníka, o ktorom nevedel, pre ťarchu, ktorá vyplávala neskoro, alebo pre prerušené konanie o vklade kvôli chybe v identifikácii nehnuteľnosti. Ak je odpoveď „ani jeden", vrstva 1 nie je taká hodnotná, ako si myslím, a treba sa vrátiť k radaru. Ak je odpoveď „dva-tri", máš case study skôr, než napíšeš prvý riadok.

Až štvrtý krok je technický a je zámerne najlacnejší: **ručne prejsť `inforeg.sk` s filtrom obec = teritórium Smolka a účel = predaj** a pozrieť sa vlastnými očami, koľko záznamov za posledný mesiac pribudlo a či sa dajú spárovať s reálnymi nehnuteľnosťami. Pol hodiny práce, ktorá povie, či má vrstva 3 zmysel.

Nič z toho nie je stavanie. To je zámer — pri tejto stávke je najdrahšia chyba postaviť pipeline skôr, než vieme, či ju smieme prevádzkovať.

---

## 9. Otázky, na ktoré potrebujem odpoveď od teba

Podklad sa ťa pýtal na tri veci a dve z nich si podľa mňa už zodpovedal svojím doterajším smerovaním: cieliš na malé až stredné realitky (Smolko je referenčný zákazník) a je to feature do existujúceho CRM, nie samostatný produkt. Ak to tak nie je, povedz.

Ostávajú tieto:

Prvá a najdôležitejšia: **si ochotný podpísať zmluvu s GKÚ a zaplatiť rádovo 2 000 € ročne za dáta pred tým, než máš platiaceho zákazníka, ktorý si o to povedal?** Ak nie, poradie sa mení — najprv sa validuje vrstva 3, ktorá je zadarmo, a ISKN sa rieši až keď zákazník ukáže na bolesť.

Druhá: **chceš, aby Revolis vôbec vstupoval do akvizície leadov?** Je to lákavé, ale je to iná firma než CRM. Transakčná vrstva ťa robí nenahraditeľným v obchode, ktorý už maklér má. Lead-gen ťa robí konkurentom portálov a stavia ťa do právne najhoršej pozície. Nemyslím si, že sa dajú robiť obe naraz dobre.

Tretia: **je pre teba ÚGKK dostupnosť blocker?** Ak Revolis sľúbi „vždy overená nehnuteľnosť" a kataster je týždeň dole, ako to má produkt komunikovať zákazníkovi?

A štvrtá, na ktorú som si nevedel odpovedať z repa: **generuje už Revolis kúpne zmluvy s identifikačným blokom nehnuteľnosti, alebo len sprostredkovateľské a preberacie protokoly?** Od toho závisí, koľko práce je vrstva 1 — ak ten blok už existuje, je to naplnenie polí; ak nie, je to nová šablóna.

---

## Zdroje

Kataster a ÚGKK/GKÚ: [cenník GKÚ](https://www.gku.sk/files/gku/produkty-sluzby/cennik_gku.pdf) · [GKÚ – kataster nehnuteľností](https://www.gku.sk/gku/produkty-sluzby/kataster-nehnutelnosti/) · [výročná správa GKÚ 2020](https://www.gku.sk/files/gku/o-ustave/dokumenty/vs_gku_2020.pdf) · [VÚGK – ceny poskytovania údajov](https://www.vugk.sk/vugk/produkty-sluzby/poskytovanie-udajov-katastra-nehnutelnosti/ceny/) · [WMS katastrálnej mapy](https://www.gku.sk/gku/produkty-sluzby/kataster-nehnutelnosti/wms.html) · [AKO 3.0 open data](https://ako.vugk.sk) · [ZBGIS na stiahnutie](https://www.gku.sk/gku/produkty-sluzby/na-stiahnutie/zbgis.html) · [INSPIRE HVD parcely – geoportal](https://geoportal.gov.sk/gallery/datasets/detail/f48baf46-4fdc-4f89-a57c-1f9f0faaa5d3) · [RPI](https://rpi.gov.sk/en/metadata/1d9ceaef-b3c6-4441-96df-a3ec353c7451) · [sledovanie zmien na LV](https://www.slovensko.sk/sk/detail-sluzby?externalCode=ks_336503) · [ESKN portál](https://www.skgeodesy.sk/sk/ugkk/kataster-nehnutelnosti/elektronicke-sluzby-katastra-nehnutelnosti/) · [obnovenie open data po incidente](https://spravy.stvr.sk/2025/08/kataster-zverejnil-kedy-opatovne-spristupni-vsetky-otvorene-data/) · [Mapsfy – dáta KN](https://www.mapsfy.com/blog-data-kn) · [Cribis – kataster](https://www.cribis.sk/sluzby/kataster-nehnutelnosti/) · [kataster-portal.sk](https://kataster-portal.sk/vlastnici-firmy/)

Právo katastra a novela: [katastrálny zákon 162/1995 – šiesta časť](https://www.uzemneplany.sk/zakon/katastralny-zakon-zakon-c-162-1995-z-z-siesta-cast) · [slov-lex 162/1995](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/1995/162/) · [ÚGKK – výklad novely](https://www.skgeodesy.sk/sk/novinky/clanky/vyklad-novely-katastralneho-zakona-otazky-odpovede.html) · [epi.sk – pripravovaná novela](https://www.epi.sk/clanok-z-titulky/pripravovana-novela-katastralneho-zakona.htm) · [legalis.sk](https://www.legalis.sk/aktuality/1397/ugkk-sr-predklada-navrh-novely-katastralneho-zakona-pristup-k-udajom-bude-po-novom-podmieneny-autentifikaciou) · [MV SR – poskytovanie údajov katastra](https://www.minv.sk/swift_data/source/miestna_statna_sprava/okres_bytca/kataster/kataster_vlastne_1.pdf)

Výstavba a územné plánovanie: [stavebný zákon 25/2025](https://static.slov-lex.sk/static/SK/ZZ/2025/25/20250401.html) · [zákon 200/2022](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2022/200/) · [vyhláška 60/2025](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2025/60/20250401) · [EIC – vykonávacia vyhláška](https://www.eic.sk/vykonavacia-vyhlaska-k-novemu-stavebnemu-zakonu/) · [ÚÚPV](https://uupv.sk/) · [Portál výstavby](https://vystavba.uupv.sk/) · [portál územného plánovania](https://www.stavebnyurad.info/) · [ÚÚPV – regionálne úrady](https://uupv.sk/regionalne-urady-pre-uzemne-planovanie-a-vystavbu) · [CUET](https://cuet.slovensko.sk/) · [CUET RSS](https://cuet.slovensko.sk/sk/Rss) · [DATAcube API](https://data.statistics.sk/api/html/help-sk.html) · [opendata.bratislava.sk](https://opendata.bratislava.sk/) · [územný plán Bratislavy](https://experience.arcgis.com/experience/48bd4beb635d4a6189cb539bba855114) · [opendata.kosice.sk](https://opendata.kosice.sk/)

Ďalšie registre: [Obchodný vestník – štruktúrované údaje](https://www.justice.gov.sk/sluzby/obchodny-vestnik/spristupnenie-strukturovanych-udajov/) · [Slovensko.Digital otvorené API](https://ekosystem.slovensko.digital/otvorene-api) · [cenník Datahub](https://ekosystem.slovensko.digital/cennik) · [podmienky Datahub](https://ekosystem.slovensko.digital/podmienky) · [register energetických certifikátov](https://www.inforeg.sk/ec/SearchEC.aspx) · [register EC – byty](https://www.inforeg.sk/ec/SearchECbyt.aspx) · [dataset na data.gov.sk](https://data.gov.sk/dataset/centralny-register-energetickych-certifikatov-budov) · [SIEA – zákon 555/2005](https://www.siea.sk/bezplatne-poradenstvo/bezplatne-poradenstvo-pre-podnikatelov/zakon-c-555-2005-z-z-energeticka-certifikacia-budov/) · [notárske dražby](https://www.notar.sk/drazby/) · [register záložných práv](https://www.notar.sk/zalozne-prava) · [REPLIK](https://replik.justice.sk/ru-verejnost-web/) · [RPO API](https://susrrpo.docs.apiary.io/) · [RPVS OData](https://rpvs.gov.sk/opendatav2/swagger) · [FinStat služby](https://finstat.sk/Sluzby) · [CRE](https://cre.sk/) · [register adries](https://data.gov.sk/dataset/register-adries) · [NCR – neverejnosť registra závetov](https://www.notar.sk/ncr_popis/)

GDPR a marketing: [čl. 14 GDPR](https://www.privacy-regulation.eu/sk/14.htm) · [Bisnode – pokuta UODO](https://www.blakemorgan.co.uk/digital-marketing-agency-bisnode-fined-by-the-polish-dpa-for-failing-to-be-transparent-with-data-subjects/) · [rakúsky DSB – direct mail z pozemkovej knihy](https://www.dataprotect.at/2019/06/29/direktmarketing-und-postalische-zusendungen-durch-immobilienentwickler/) · [geuer.at – Grundbuch a ochrana údajov](https://www.geuer.at/2023/12/03/grundbuch-datenschutz/) · [ČÚZK – kataster a ochrana osobných údajov](https://cuzk.gov.cz/Je-dobre-vedet/Ochrana-osobnich-udaju/Katastr-nemovitosti-a-ochrana-osobnich-udaju.aspx) · [zákon 452/2021](https://www.zakonypreludi.sk/zz/2021-452) · [priamy marketing od 1. 2. 2022](https://www.podnikajte.sk/zakonne-povinnosti-podnikatela/priamy-marketing-pravna-uprava-od-1-2-2022) · [Robinsonov zoznam](https://www.podnikajte.sk/marketing/robinsonov-zoznam-nevyziadane-marketingove-hovory) · [zákon 147/2001 o reklame](https://static.slov-lex.sk/pdf/SK/ZZ/2001/147/ZZ_2001_147_20240701.pdf) · [HVD nariadenie 2023/138](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A32023R0138) · [ÚOOÚ – Proximus C-129/21](https://dataprotection.gov.sk/uoou/en/node/997) · [plán kontrol ÚOOÚ 2026](https://www.securion.sk/plan-kontrol-uradu-pre-ochranu-osobnych-udajov-slovenskej-republiky-na-rok-2026/)

---

**Neoverené položky, ktoré tento dokument zámerne netvrdí ako fakt:** technický protokol a dokumentácia elektronických služieb ISKN; či obchodné a licenčné podmienky VÚGK dovoľujú redistribúciu v SaaS; presná účinnosť novely katastrálneho zákona; presné kódy DATAcube kociek pre vydané stavebné povolenia a granularita na úrovni obce; licencia a frekvencia aktualizácie registra energetických certifikátov; existencia API pre NCRdr a REPLIK; ceny Cribis a kataster-portal.sk; či ZBGIS REST endpointy vracajú číslo LV.
