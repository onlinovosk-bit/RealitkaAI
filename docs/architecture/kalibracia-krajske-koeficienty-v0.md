# Kalibrácia — krajské koeficienty v0 (PO + KE)

**Stav:** locked_unpaired — koeficienty sa **nevypočítali** (žiadna improvizácia).  
**Dátum:** 2026-08-12  
**Artefakt dát:** [data/krajske-koeficienty-v0.json](../../data/krajske-koeficienty-v0.json)  
**Zapojenie do estimate-engine:** NIE (A1-C, sekvenčne s founderom)

---

## Verdikt pre foundera

| Otázka | Odpoveď |
|---|---|
| Je medzi PO a KE materiálny rozdiel koeficientu realizačná/ponuková (> 3 p. b.)? | **Neposúditeľné** — rady sa nedajú spárovať |
| Má A1-C hotový krajský koeficient? | **Nie** — treba najprv NBS časový rad (alebo abs. realizačné úrovne) |
| Je národný Eurostat koeficient v repe na porovnanie? | **Nie** ako vypočítaný artefakt (len heuristika 5–10 % v meta NBS snapshotu) |

---

## Cieľ lane

Vypočítať pre **Prešovský (SK041 / PO)** a **Košický (SK042 / KE)** kraj časový rad pomeru

`
koeficient_t = realizačná_cena_t / ponuková_cena_t
`

za spoločné štvrťroky (posledných 8–12), porovnať kraje a voči národnému Eurostat koeficientu, ak je v repe.

---

## Zdroje (legálne + súbory v repe)

| Strana | Zdroj | Licencia | Čo je v repe |
|---|---|---|---|
| Ponuková | NBS — ceny podľa krajov | [docs/legal/nbs-povolenie-2026-08-10.md](../legal/nbs-povolenie-2026-08-10.md) (atribúcia povinná) | [data/regional-prices.json](../../data/regional-prices.json) — **jeden** štvrťrok **2026Q1**, absolútne €/m² (PO 2411.77, KE 2682.32, SK 3005.25) |
| Realizačná | ŠÚ SR DATAcube **sp3801qr** | [docs/legal/susr-povolenie-2026-08-10.md](../legal/susr-povolenie-2026-08-10.md) (citácia) | [data/susr-sp3801qr.json](../../data/susr-sp3801qr.json) (#380) — krajské **indexy** YoY (_romr) a QoQ (_predch_obd_f), nie €/m² |
| Národný benchmark | Eurostat HPI prc_hpi_q (zmienka v NBS legal) | voľné s uvedením zdroja | **žiadny** JSON/CSV s vypočítaným národným pomerom realizačná/ponuková |

Povinná NBS atribúcia (pri akomkoľvek budúcom použití vo výpočte/UI):

> Spracované údaje Národnej banky Slovenska na základe údajov poskytovaných externými poskytovateľmi United Classifieds a NARKS.

Citácia ŠÚ SR: **„Zdroj: Štatistický úrad Slovenskej republiky“**.

---

## Metodika (čo sme skúsili)

1. Overiť L2 bránu: data/susr-sp3801qr.json je na origin/main (#380).
2. Načítať NBS ponukovú stranu z data/regional-prices.json + legal.
3. Načítať ŠÚ SR realizačnú stranu z data/susr-sp3801qr.json (TOTAL, _romr / _predch_obd_f, SK041 + SK042).
4. Hľadať spoločné štvrťroky, kde existujú **porovnateľné úrovne** (oba v €/m², alebo oba indexy s explicitnou spoločnou bázou umožňujúcou pomer úrovní).
5. Ak pár neexistuje → status locked_unpaired, coefficient = null (špecifikácia lane: *„nie improvizovaný koeficient“*).

### Prečo pomer nejde spočítať z toho, čo je v repe

| Požiadavka na pomer | NBS v repe | ŠÚ SR v repe |
|---|---|---|
| Absolútna €/m² | Áno, ale len **2026Q1** | Nie — len index |
| Časový rad 8–12Q | Nie | Áno (16 non-null TOTAL YoY bodov / kraj, 2022Q2–2026Q1) |
| Spoločná jednotka na pomer úrovní | Snapshot úroveň | Zmena voči minulému roku / predchádzajúcemu obdobiu |

Index YoY ≠ úroveň ceny. Podiel dvoch YoY indexov **nie je** koeficient realizačná/ponuková. Jednorazový NBS €/m² bez realizačnej €/m² v tom istom kvartáli tiež nedáva pomer.

Heuristicá v 
egional-prices.json meta (*„transakčné typicky 5–10 % nižšie“*) je pásmová poznámka enginu, **nie** Eurostat koeficient a **nie** krajský výpočet.

---

## Tabuľka — čo máme (nie pomer)

### A) NBS ponuková úroveň (jediný spoločný „kandidát“ kvartál)

| Kraj | Kód | 2026Q1 ponuková €/m² (all) |
|---|---|---|
| Prešovský | PO / SK041 | 2411.77 |
| Košický | KE / SK042 | 2682.32 |
| SR priemer | SK | 3005.25 |

Zdroj: data/regional-prices.json · obdobie meta 2026Q1 · retrieved 2026-07-20.

### B) ŠÚ SR realizačný YoY index TOTAL (_romr, rovnaké obdobie minulého roka = 100) — posledných 12Q

| Obdobie | SK041 Prešov | SK042 Košice | Rozdiel (PO−KE) p. b. indexu |
|---|---:|---:|---:|
| 2023Q2 | 106.4 | 93.6 | +12.8 |
| 2023Q3 | 98.0 | 93.3 | +4.7 |
| 2023Q4 | 98.0 | 97.9 | +0.1 |
| 2024Q1 | 95.0 | 101.4 | −6.4 |
| 2024Q2 | 95.3 | 107.1 | −11.8 |
| 2024Q3 | 102.1 | 108.6 | −6.5 |
| 2024Q4 | 106.4 | 110.5 | −4.1 |
| 2025Q1 | 113.1 | 108.4 | +4.7 |
| 2025Q2 | 116.0 | 112.1 | +3.9 |
| 2025Q3 | 114.8 | 112.3 | +2.5 |
| 2025Q4 | 112.2 | 107.4 | +4.8 |
| 2026Q1 | 112.9 | 111.0 | +1.9 |

**Upozornenie:** stĺpec „rozdiel“ je rozdiel **dynamiky indexov**, nie rozdiel koeficientov realizačná/ponuková. Slúži len ako inventár — **nesmie** sa interpretovať ako materiálnosť krajských haircutov.

### C) Rad pomerov realizačná/ponuková

| Obdobie | SK041 | SK042 |
|---|---|---|
| *(žiadny spoločný pár)* | — | — |

series.ratio_realization_over_offer v JSON je prázdny; coefficients.*.coefficient_realization_over_offer = null.

---

## Porovnanie s národným Eurostat koeficientom

V repe **nie je** artefakt typu „národný Eurostat koeficient = X %“ odvodený z prc_hpi_q vs. NBS ponuka.

- Legal mapa: Eurostat HPI je povolený (docs/legal/nbs-povolenie-2026-08-10.md).
- Produktová heuristika: 5–10 % pod ponukou (
egional-prices.json → methodology_note) — **nie** Eurostat výpočet.
- Porovnanie kraj vs. national coefficient: **blocked** (chýba obe strany rovnice aj national computed baseline).

---

## Odporúčanie (materiálnosť > 3 p. b.)

**Neposúditeľné.** Bez spárovaného radu pomerov nemožno tvrdiť, či |koef_PO − koef_KE| prekračuje 3 percentuálne body.

Praktický dôsledok pre A1-C:

1. **Nezapájať** fiktívne krajské koeficienty do estimate-engine.
2. **Unblock:** ingest NBS krajského **časového radu** absolútnych €/m² (verejný export, s atribúciou) pre PO+KE aspoň 8–12Q; potom spočítať pomer voči realizačnej **úrovni** (ak ŠÚ SR/Eurostat dodá úroveň), **alebo** zvoliť explicitnú metodiku index→úroveň so zdokumentovanou bázou (founder sign-off).
3. Paralelný XS: uložiť národný Eurostat vs. NBS pomer ako data/eurostat-nbs-national-coefficient-v0.json pre benchmark.
4. Až po zelenom párovaní znovu vyhodnotiť materiálnosť PO vs KE (> 3 p. b.) — ak nie je materiálna, A1-C môže ostať na jednom národnom haircute (nižšia komplexita).

---

## Čo tento PR NErobí

- Nemení pps/crm/src/lib/valuation/estimate-engine.ts ani 
egional-data.ts.
- Nemení data/regional-prices.json ani data/susr-sp3801qr.json.
- Nepridáva UI atribúciu ŠÚ SR (až keď dáta vstúpia do výpočtu — viď susr legal mini-zadanie).

---

## Súvisiace

- L2 ingest: #380 · data/susr-sp3801qr.json
- NBS legal: docs/legal/nbs-povolenie-2026-08-10.md
- ŠÚ SR legal: docs/legal/susr-povolenie-2026-08-10.md
- Lane špec: Ruflo Swarm Vlna 3 · LANE 10
