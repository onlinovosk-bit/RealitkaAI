# FOUNDING PRINCIPLES — prvé princípy neskopírovateľnosti

**Cieľová cesta:** `brain/identity/FOUNDING-PRINCIPLES.md`
**Status:** zakladajúci dokument. Nadradený roadmapám, nie však ústave
a ZAKÁZANÝM AKCIÁM. Ak je funkcia v rozpore s princípom, ustupuje funkcia.
**Perspektíva:** Revolis 2032 — 50 M leadov, 20 M nehnuteľností,
500 M udalostí, tisíce kancelárií. Otázka: čo z toho sa nedá skopírovať?
**Testovacia otázka pre každý princíp:** *Keby konkurent zajtra dostal
náš zdrojový kód, náš model a neobmedzený kapitál — čo mu aj tak chýba?*

---

## 1. Čas sa nedá dohnať kapitálom
Hodnotu má dáta viazané na okamih, keď vznikli — odhad ceny daný majiteľovi
v marci 2027, stav trhu v ten deň, informácia, ktorú vtedy mal maklér.
**Moat:** nie je to objem dát (ten sa dá kúpiť), ale ich časová ukotvenosť.
**Neskopírovateľné:** konkurent v 2032 nedokáže spätne vytvoriť predikciu
z 2027 — nie preto, že nemá prístup, ale preto, že vtedy neexistoval.
**Kumuluje sa:** každý deň prevádzky pridáva vrstvu, ktorú nikto neskôr
nedoplní. Náskok rastie lineárne s časom a nedá sa skrátiť peniazmi.

## 2. Zaznamenávaj aj to, čo sa nestalo
Každý systém eviduje uzavreté obchody. Takmer nikto neeviduje neuskutočnené:
kontakt, ktorý nikto nezavolal; ponuku, ktorú majiteľ odmietol; kanceláriu,
ktorá odišla ku konkurencii.
**Moat:** negatívny priestor nie je nikde publikovaný — nie je v portáloch,
katastri ani vo verejných dátach. Vzniká len tam, kde bol niekto prítomný
v momente zlyhania.
**Neskopírovateľné:** neúspech nezanecháva stopu. Kto ho nezachytil vtedy,
nemá ho odkiaľ získať.
**Kumuluje sa:** predikcia sa učí z rozdielu medzi úspechom a neúspechom.
Systém trénovaný len na úspechoch má strop, ktorý sa dátami nedá prekonať.

## 3. Rozhodnutie bez stavu poznania je len výsledok
Ukladaj nielen *čo sa rozhodlo* a *ako to dopadlo*, ale **čo rozhodujúci
v tej chvíli vedel** — snímku informácií, na ktorých rozhodnutie stálo.
**Moat:** dvojica (poznanie → rozhodnutie → výsledok) je hotový tréningový
príklad. Databáza bez snímky vie len stav, nie kauzalitu.
**Neskopírovateľné:** databázy uchovávajú *aktuálny* stav. Ani vlastník dát
nedokáže spätne rekonštruovať, čo systém vedel pred rokom — pokiaľ to
vtedy nezapísal.
**Kumuluje sa:** každé rozhodnutie pridá označený príklad. Po miliónoch
rozhodnutí vzniká model správania, nie štatistika.

## 4. Poznať vlastnú chybovosť je cennejšie než byť presný
Merať, ako často sa systém mýli, a v čom — a toto meranie uchovávať ako
prvotriedne dáta.
**Moat:** kto pozná svoju kalibráciu, môže presnosť **sľúbiť zmluvne**.
Kto ju nemeria, môže ju len tvrdiť.
**Neskopírovateľné:** kalibrácia je funkciou vlastnej histórie predikcií
a ich overených výsledkov — cudzia kalibrácia je pre iné dáta neplatná.
**Kumuluje sa:** meranie umožňuje zlepšenie, zlepšenie sa opäť meria.
Kto nemeria, zlepšuje sa náhodne; rozdiel sa každým cyklom rozširuje.

## 5. Rozhoduje rýchlosť uzavretia slučky, nie jej existencia
Slučku rozhodnutie → výsledok → poučenie má každý. Podstatné je, **za ako
dlho sa uzavrie** a či sa poučenie premietne do ďalšieho rozhodnutia.
**Moat:** organizácia učiaca sa v dňoch predbehne tú, ktorá sa učí
v kvartáloch — aj keď má menej dát.
**Neskopírovateľné:** latencia slučky je vlastnosť procesu a kultúry,
nie softvéru. Kúpou nástroja sa neprenáša.
**Kumuluje sa:** kratší cyklus znamená viac cyklov, každý s lepším
vstupom. Efekt je multiplikatívny, nie sčítací.

## 6. Hodnota nesmie žiť v modeli
Všetko cenné — pamäť, rozhodnutia, kalibrácia, pravidlá — patrí do
vlastného úložiska. Model je vymeniteľná súčiastka.
**Moat:** každá generácia modelov je príležitosť pre teba a povinná
prestavba pre toho, kto staval *na* modeli.
**Neskopírovateľné:** nejde o technológiu, ale o disciplínu udržiavať
hranicu. Kto ju raz prekročil, platí migračnú daň navždy.
**Kumuluje sa:** modely sa menia každých pár mesiacov; s každou výmenou
sa rozdiel medzi tebou a závislým konkurentom zväčšuje.

## 7. Chyby sú aktívum, ak majú pamäť
Každé zlyhanie zaznamenať s príčinou, detekciou a prevenciou — strojovo
čitateľne, nie ako historku.
**Moat:** organizácia s piatimi rokmi zapísaných poučení nerieši tie isté
otázky druhýkrát. Rýchlosť rozhodovania je výsledok, nie talent.
**Neskopírovateľné:** chyby sa nezverejňujú. Nedajú sa naštudovať zvonku
ani kúpiť — dajú sa len zažiť, a zaplatiť za ne.
**Kumuluje sa:** druhov chýb je konečne veľa, príležitostí nekonečne.
Pokrytie druhov rastie; cena za opakovanie klesá k nule.

## 8. Ústava musí byť verzionovaná a vynútiteľná, nie odporúčaná
Pravidlá správania — čo systém smie, čo nikdy, kde rozhoduje človek —
majú byť vykonateľné, verzionované a auditovateľné.
**Moat:** konzistentné správanie naprieč generáciami modelov. Zároveň
doložiteľný dohľad — čo je pri regulácii AI predajný argument, nie záťaž.
**Neskopírovateľné:** ústava nie je text, ale sedimentovaná skúsenosť —
každé pravidlo je zjazvený incident. Prevzatý dokument bez tých incidentov
je kostým.
**Kumuluje sa:** každý incident pridá pravidlo; priestor na opakovanie
sa zužuje, dôveryhodnosť rastie.

## 9. Moat je aj v tom, čo odmietame robiť
Neobchodovať s dátami zákazníkov. Nekonkurovať vlastným zákazníkom.
Neodosielať nič v ich mene bez ich rozhodnutia.
**Moat:** dôvera je podmienkou prístupu k dátam, z ktorých vzniká všetko
ostatné. Bez nej sa princípy 1–4 nemajú z čoho živiť.
**Neskopírovateľné:** veľké platformy majú štrukturálny konflikt záujmov —
nemôžu sa zaviazať, že nebudú monetizovať dáta, lebo z toho žijú.
Toto je jediný princíp, ktorý je pre konkurenta neskopírovateľný *z
podstaty jeho obchodného modelu*, nie pre nedostatok času či peňazí.
**Kumuluje sa:** dôvera sa buduje pomaly a strácia naraz — čo je presne
dôvod, prečo je obranná.

## 10. Lokálna pravda sa nedá preložiť
Kataster, regionálne cenové správanie, vyjednávacie zvyklosti, ako reálne
pracuje slovenská kancelária.
**Moat:** globálni hráči optimalizujú na priemer trhu; lokálna pravda je
dlhý chvost, ktorý vyžaduje prítomnosť.
**Neskopírovateľné:** nie je zapísaná nikde — žije v tisíckach malých
pozorovaní z reálnej prevádzky.
**Kumuluje sa:** každý ďalší mikrotrh zvyšuje presnosť v susedných.
*Poctivá výhrada: tento princíp je najslabší z desiatich — dá sa
prekonať kapitálom a časom. Chráni skoré roky, nie rok 2032.*

---

## Ako sa princípy používajú
Pri každom väčšom rozhodnutí (nová funkcia, integrácia, partnerstvo,
zmena modelu) polož jednu otázku: **posilňuje to niektorý z desiatich
princípov, alebo ho oslabuje?** Funkcia, ktorá neposilňuje žiadny,
nie je zlá — je len bežná. Funkcia, ktorá niektorý oslabuje, sa nerobí,
aj keby ju zákazník žiadal.

**Poradie sily:** 1, 2, 3 a 9 sú tvrdé (neprekonateľné časom ani kapitálom).
4, 5, 7 sú disciplinárne (prekonateľné iným, kto je rovnako disciplinovaný).
6 a 8 sú architektonické (prekonateľné vedomým rozhodnutím konkurenta).
10 je dočasný.

**Nepohodlný dôsledok:** ani jeden z prvých štyroch princípov nevyžaduje
lepší model. Vyžadujú, aby sa **dnes zapisovalo to, čo bude mať hodnotu
o päť rokov** — v čase, keď to nikomu nechýba a nič to neprináša.
Preto je jediná skutočná hrozba pre tento moat vnútorná: odložiť zber
na neskôr.
