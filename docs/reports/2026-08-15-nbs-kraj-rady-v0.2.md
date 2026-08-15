# NBS krajské časové rady — report v0.2 (honest pairing)

**Stav:** `blocked_unpaired` — koeficient realizačná/ponuková sa **nevypočítal**. Žiadna improvizácia.  
**Dátum:** 2026-08-15  
**Lane:** Revolis CRM Vlna 4 / V4-D  
**Artefakt dát:** [data/nbs-kraj-rady-v0.2.json](../../data/nbs-kraj-rady-v0.2.json)  
**Zapojenie do estimate-engine:** NIE

Povinná NBS atribúcia (NBS email 2026-08-10, [docs/legal/nbs-povolenie-2026-08-10.md](../legal/nbs-povolenie-2026-08-10.md)):

> Spracované údaje Národnej banky Slovenska na základe údajov poskytovaných externými poskytovateľmi United Classifieds a NARKS.

Citácia ŠÚ SR (ak sa sp3801qr spomína ako realizačná strana): **Zdroj: Štatistický úrad Slovenskej republiky** ([docs/legal/susr-povolenie-2026-08-10.md](../legal/susr-povolenie-2026-08-10.md)).

Disclaimer NBS: https://nbs.sk/disclaimer-sk/

---

## Verdikt

| Otázka | Odpoveď |
|---|---|
| Podarilo sa stiahnuť verejný NBS štvrťročný rad PO + KE? | **Áno** — oficiálny CSV export, 86 kvartálov `2005Q1`–`2026Q2`, jednotka €/m² (ponuková) |
| Páruje sa s ŠÚ SR `sp3801qr` na výpočet `realizačná_t / ponuková_t`? | **Nie** — geografia a prekrývajúce sa kvartály áno, **jednotky nie** (index vs. €/m²) |
| Status voči v0 (`docs/architecture/kalibracia-krajske-koeficienty-v0.md`)? | Ostáva **`blocked_unpaired`**. NBS strana už nie je jednorazový snapshot; realizačná strana stále nemá €/m² úroveň |
| Vypočítaný krajský koeficient? | **null** — žiadny nepárový koeficient sa nepublikuje |

---

## 1. Retrieval (merané, nie odhadnuté)

| Pole | Hodnota |
|---|---|
| Stránka | https://nbs.sk/statisticke-udaje/vybrane-makroekonomicke-ukazovatele/ceny-nehnutelnosti-na-byvanie/ceny-nehnutelnosti-na-byvanie-podla-krajov/ |
| Export URL | https://nbs.sk/export/sk/real-estate-price-by-region/csv |
| Súbor | `real-estate-price-by-region.csv` (`Content-Disposition: attachment`) |
| Formát | CSV; UTF-8 BOM; oddeľovač `;`; desatinná čiarka; medzera ako oddeľovač tisícov |
| HTTP | 200, `Content-Type: text/csv; charset=UTF-8` |
| Veľkosť | 11 885 B |
| SHA-256 | `043e4e94742018326658fda7cf455cd84808c9d5888d58ed25457ee7142bb78c` |
| Retrieval datetime | **2026-08-15T12:36:33+00:00** (UTC) |
| Widget na stránke | `wp-block-iq-real-estate-region` (`data-type="realEstateByRegion"`), odkaz „Na stiahnutie / export.csv“ → ten istý export path |
| Jednotka (hlavička CSV) | Ceny nehnuteľností na bývanie podľa krajov v €/m² |
| Typ ceny | ponuková (NBS verejná rada; United Classifieds + NARKS) |

HTML tabuľka na stránke zaokrúhľuje na celé € (napr. PO `1Q 2026` = 2 412). **Tento report a JSON používajú CSV presnosť** (PO `2026Q1` = 2411.7708).

CSV mieša **ročné priemery** (riadky `2002`–`2025`) so **štvrťrokmi** (`1Q 2005`–`2Q 2026`). Štvrťročné riadky pred `2005Q1` v exporte nie sú (2002–2004 len rok). Párovanie používa **len štvrťročné riadky**.

---

## 2. Čo sa zmenilo oproti v0

v0 ([kalibracia-krajske-koeficienty-v0.md](../architecture/kalibracia-krajske-koeficienty-v0.md), [data/regional-prices.json](../../data/regional-prices.json)):

- NBS v repe = **jeden** kvartál **2026Q1** (PO 2411.77, KE 2682.32, SK 3005.25), retrieved 2026-07-20.
- ŠÚ SR `sp3801qr` = krajské **indexy** YoY (`b_romr`) a QoQ (`b_predch_obd_f`), nie €/m².
- Verdikt: `blocked_unpaired`.

v0.2 (tento PR):

- NBS ponuková strana: **časový rad 86Q** (`2005Q1`–`2026Q2`) z verejného exportu. `2026Q1` sa zhoduje so snapshotom v `data/regional-prices.json` (PO 2411.7708, KE 2682.3243, SK 3005.25). Pribudol `2026Q2`.
- Realizačná strana: **bezo zmeny** — `data/susr-sp3801qr.json` (fetched 2026-08-11), meradlá `b_romr` / `b_predch_obd_f`.
- Párovanie: stále **blocked**, lebo jednotky sa nepárujú. Časový rad na ponukovej strane **nestačí**, kým realizačná strana nie je úroveň v €/m² (alebo explicitná, founderom podpísaná metodika index→úroveň).

`data/regional-prices.json` sa v tomto PR **nemenil**.

---

## 3. NBS ponuková úroveň — PO / KE (posledných 12Q)

Zdroj: CSV export vyššie. Stĺpce PO = Prešovský kraj (SK041), KE = Košický kraj (SK042).

| Obdobie | PO €/m² | KE €/m² | SK €/m² |
|---|---:|---:|---:|
| 2023Q3 | 1794.7154 | 2016.1288 | 2438.0453 |
| 2023Q4 | 1785.8203 | 2076.2923 | 2432.9751 |
| 2024Q1 | 1767.1496 | 2011.4425 | 2422.9968 |
| 2024Q2 | 1817.9340 | 2087.0147 | 2461.5872 |
| 2024Q3 | 1898.8263 | 2087.1201 | 2520.3183 |
| 2024Q4 | 1955.6184 | 2222.0876 | 2596.0585 |
| 2025Q1 | 1985.3942 | 2348.8622 | 2699.9528 |
| 2025Q2 | 2177.5390 | 2508.4764 | 2777.3259 |
| 2025Q3 | 2179.3889 | 2410.6321 | 2814.0845 |
| 2025Q4 | 2171.8765 | 2607.7836 | 2906.3616 |
| 2026Q1 | 2411.7708 | 2682.3243 | 3005.2500 |
| 2026Q2 | 2309.7950 | 2796.0716 | 3041.4123 |

Úplný rad 2005Q1–2026Q2 je v JSON artefakte. Toto **nie sú** koeficienty.

---

## 4. ŠÚ SR sp3801qr — realizačná strana (inventár, nie pomer)

Tabuľka: `sp3801qr` — *Indexy realizačných cien nehnuteľností - regionálne, štvrťročné*.  
API / DATAcube: pozri meta v [data/susr-sp3801qr.json](../../data/susr-sp3801qr.json).  
Meradlá kocky: `b_romr` (rovnaké obdobie predchádzajúceho roka = 100), `b_predch_obd_f` (predchádzajúce obdobie = 100). Hodnota `NUM_VALUE`. Segment `TOTAL`.

Geografia: SK041 Prešovský kraj, SK042 Košický kraj — **páruje sa s NBS PO/KE**.

Non-null YoY TOTAL: **2022Q2–2026Q1** (16 bodov / kraj). `2026Q2` v ŠÚ SR artefakte je null (NBS `2026Q2` teda nemá realizačný pár ani časovo).

YoY index TOTAL (`b_romr`) — posledných 12 non-null Q (rovnaké čísla ako v0 kalibrácia):

| Obdobie | SK041 Prešov | SK042 Košice |
|---|---:|---:|
| 2023Q2 | 106.4 | 93.6 |
| 2023Q3 | 98.0 | 93.3 |
| 2023Q4 | 98.0 | 97.9 |
| 2024Q1 | 95.0 | 101.4 |
| 2024Q2 | 95.3 | 107.1 |
| 2024Q3 | 102.1 | 108.6 |
| 2024Q4 | 106.4 | 110.5 |
| 2025Q1 | 113.1 | 108.4 |
| 2025Q2 | 116.0 | 112.1 |
| 2025Q3 | 114.8 | 112.3 |
| 2025Q4 | 112.2 | 107.4 |
| 2026Q1 | 112.9 | 111.0 |

Tieto čísla sú **dynamika indexov**, nie realizačná €/m². Podiel YoY indexu a NBS €/m² **nie je** koeficient realizačná/ponuková.

---

## 5. Test párovania (povinná brána pred koeficientom)

`koeficient_t = realizačná_cena_t / ponuková_cena_t` len pre spoločné kvartály, kde obe strany sú **porovnateľné úrovne**.

| Požiadavka | NBS v0.2 | ŠÚ SR sp3801qr v repe | Pár? |
|---|---|---|---|
| Geografia PO/SK041 a KE/SK042 | Áno | Áno | Áno |
| Spoločné kvartály | 2005Q1–2026Q2 | non-null 2022Q2–2026Q1 | Áno (16Q) |
| Absolútna €/m² | Áno (ponuková) | **Nie** — len index | **Nie** |
| Realizačná úroveň v €/m² | Nie (toto je ponuka) | **Nie** | **Nie** |
| Spoločná indexová báza umožňujúca pomer úrovní | N/A (úroveň) | YoY/QoQ, nie spoločná hladina s NBS | **Nie** |

**Záver:** geografia a čas sa prekrývajú; **jednotky sa nepárujú**. Koeficient sa neráta.

| Obdobie | SK041 coefficient | SK042 coefficient |
|---|---|---|
| *(žiadny spoločný pár úrovní)* | — | — |

V JSON: `coefficients.*.coefficient_realization_over_offer = null`, `ratio_realization_over_offer = []`.

Zámerné non-akcie (anti-improvizácia):

- nerátať `index_SUSR / EUR_NBS`
- nerátať pomer dvoch YoY indexov a tváriť sa, že ide o haircut
- nerekkonštruovať fiktívnu realizačnú €/m² z indexu bez zdokumentovanej bázy a founder sign-off
- nepoužiť heuristiku 5–10 % z `regional-prices.json` methodology_note ako Eurostat/krajský koeficient

---

## 6. Materiálnosť PO vs KE (> 3 p. b.)

**Neposúditeľné.** Bez spárovaného radu pomerov nemožno tvrdiť, či |koef_PO − koef_KE| prekračuje 3 percentuálne body.

---

## 7. Čo tento PR nerobí

- Nemení `apps/crm/src/lib/valuation/estimate-engine.ts` ani `lib/acquisition/sync/`.
- Nemení `data/regional-prices.json` ani `data/susr-sp3801qr.json`.
- Nepridáva UI atribúciu ŠÚ SR (až keď realizačné dáta vstúpia do výpočtu).
- Nemerguje do `main`.

---

## 8. Čo by odblokovalo výpočet (nie súčasť tohto PR)

1. Realizačná **úroveň** €/m² po krajoch a kvartáloch (ak ŠÚ SR / Eurostat / iný povolený zdroj takú radu verejne dá), **alebo**
2. Explicitná metodika index→úroveň so zdokumentovanou bázou a founder sign-off — až potom pomer voči tomuto NBS radu.
3. Národný Eurostat vs. NBS pomer ako samostatný artefakt ostáva paralelný XS (v repe stále nie je vypočítaný).

Až po zelenom párovaní znovu vyhodnotiť materiálnosť PO vs KE.

---

## Súvisiace

- v0 kalibrácia: `docs/architecture/kalibracia-krajske-koeficienty-v0.md`
- NBS legal: `docs/legal/nbs-povolenie-2026-08-10.md`
- ŠÚ SR legal: `docs/legal/susr-povolenie-2026-08-10.md`
- L2 ingest ŠÚ SR: `data/susr-sp3801qr.json`
- NBS snapshot 2026Q1: `data/regional-prices.json`
