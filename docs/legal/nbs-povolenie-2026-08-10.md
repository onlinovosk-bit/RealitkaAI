# NBS — povolenie použitia údajov (2026-08-10)

**Cieľová cesta:** `docs/legal/nbs-povolenie-2026-08-10.md`
**Zdroj:** email od NBS, Odbor ekonomických a menových analýz, doručený 10.8.2026
na andrej@revolis.ai (vlákno: „Použitie údajov o cenách nehnuteľností na bývanie
v komerčnej aplikácii")

---

## Doslovné znenie odpovede

> Verejne dostupné agregované časové rady na stránke NBS je možné takýmto
> spôsobom využívať, avšak s uvedením, že ide o spracované údaje Národnou
> bankou Slovenska na základe údajov poskytovaných externými poskytovateľmi
> United Classifieds a NARKS.
>
> Detailnejšie údaje, ako tie, ktoré sú v súčasnosti verejne dostupné na
> stránke NBS Vám zo zmluvných dôvodov poskytnúť nemôžeme.
>
> Súčasne Vám zasielame link na Vyhlásenie o vylúčení zodpovednosti
> https://nbs.sk/disclaimer-sk/

## Čo z toho plynie

| Smie sa | Nesmie sa / nedostaneme |
|---|---|
| Verejné agregované časové rady NBS v komerčnej aplikácii (valuačný widget, kalibrácia) | Detailnejšie než verejné dáta (zmluvné dôvody NBS voči United Classifieds a NARKS) |
| Podmienka: **povinná atribúcia** (presné znenie nižšie) | Vydávať údaje za vlastné alebo za oficiálne stanovisko NBS (disclaimer) |

## Povinné znenie atribúcie (kdekoľvek sa NBS dáta zobrazujú alebo vstupujú do výpočtu)

> Spracované údaje Národnej banky Slovenska na základe údajov poskytovaných
> externými poskytovateľmi United Classifieds a NARKS.

Skrátená UI verzia (footer widgetu): *„Zdroj dát: spracované údaje NBS
(United Classifieds, NARKS)"* s odkazom na plné znenie.

## Stav zdrojov kalibrácie k 10.8.2026

| Zdroj | Stav | Poznámka |
|---|---|---|
| NBS krajské rady | ✅ POVOLENÉ s atribúciou | tento dokument |
| Eurostat HPI (prc_hpi_q) | ✅ voľné použitie s uvedením zdroja | štandard Eurostatu |
| Realitný barometer (Realitná únia SR) | ⏳ žiadosť odoslaná (JUDr. Plavec), odpoveď zatiaľ nie | v produkte 4 mestské kotvy s atribúciou; systematická mesačná ingescia až po písomnom súhlase |

## Súvisiace

- `docs/architecture/kalibracia-v1-metodika.md` — doplniť stav NBS: POVOLENÉ
- NBS disclaimer: https://nbs.sk/disclaimer-sk/ (odhady widgetu sú orientačné,
  NBS nezodpovedá za odvodené výpočty — kryje nás to spolu s vetou
  „Presnú cenu určí maklér")
