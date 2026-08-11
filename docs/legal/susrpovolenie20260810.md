# ŠÚ SR — povolenie a zdroj regionálnych realizačných cien (2026-08-10)

**Cieľová cesta:** `docs/legal/susr-povolenie-2026-08-10.md`
**Zdroj:** email od Mariána Antalu (Odbor komunikácie, ŠÚ SR), 10.8.2026,
vlákno „index cien nehnuteľností — regionálne členenie a podmienky použitia"

---

## Doslovné jadro odpovede

> Na regionálnej úrovni máme k dispozícii indexy realizačných cien
> nehnuteľností — databáza DATAcube, tabuľka **sp3801qr**
> (Indexy realizačných cien nehnuteľností - regionálne, štvrťročne).
> Tabuľku nájdete aj v API Otvorených údajov ŠÚ SR.
>
> Využívanie našich dát je možné aj na komerčné účely.
> Štatistické informácie zverejnené prostredníctvom internetových stránok
> ŠÚ SR je možné: šíriť · využívať a citovať v iných dielach ·
> **využívať komerčne**.

## Čo to znamená

| Smie sa | Podmienka |
|---|---|
| Komerčné použitie tabuľky sp3801qr (aj šírenie, aj v produkte) | Citácia zdroja: **„Zdroj: Štatistický úrad Slovenskej republiky"** (autorský zákon 185/2015 Z. z. — dáta sú chránené, použitie je dovolené s citáciou) |

## Prečo je to pre kalibráciu zlato

Doterajšia dátová mapa mala dieru presne tu:

| Zdroj | Úroveň | Typ ceny |
|---|---|---|
| Eurostat prc_hpi_q | národná | realizačná |
| NBS krajské rady | krajská | ponuková |
| **ŠÚ SR sp3801qr** | **krajská** | **realizačná** ⭐ |
| Barometer RÚ SR | mestská | ponuková (⏳ súhlas) |

sp3801qr dáva to, čo žiadny iný zdroj: **realizačné ceny po krajoch,
štvrťročne**. Pre model to znamená krajský koeficient ponuková→realizačná
(NBS kraj vs. ŠÚ SR kraj) — doteraz sme ho vedeli len národne z Eurostatu.

## Technické údaje pre ingesciu

- Tabuľka: `sp3801qr` — DATAcube:
  https://datacube.statistics.sk/#!/view/sk/vbd_sk_win2/sp3801qr/v_sp3801qr_00_00_00_sk
- API šablóna (overená v help): 
  `https://data.statistics.sk/api/v2/dataset/sp3801qr/PARAM1/PARAM2/...?lang=sk&type=json`
  — počet PARAM = počet dimenzií kocky; hodnoty podporujú `all`, rozsahy
  `2020:2026`, wildcardy (`SK04*` = Východné Slovensko/Prešovský kraj podľa NUTS)
- Dimenzie kocky: zistiť cez
  `https://data.statistics.sk/api/v2/dimension/sp3801qr/<dim_code>?lang=sk`
- Návod: https://data.statistics.sk/api/html/help-sk.html

## Mini-zadanie pre Cursor (pripojiť k A1 vlne kalibrácie)

```
ÚLOHA: ingescia sp3801qr (ŠÚ SR) do kalibračných dát.
1. NAJPRV ZISTI: dimenzie kocky sp3801qr cez API (kódy krajov, typy
   nehnuteľností, bázický rok indexu). Napíš mi ich, kým začneš.
2. Stiahni celú tabuľku pre Prešovský a Košický kraj (skript, nie ručne),
   ulož ako data/susr-sp3801qr.json s meta: {source: "Štatistický úrad
   Slovenskej republiky", table: "sp3801qr", fetched: <dátum>, licencia:
   "komerčné použitie s citáciou — docs/legal/susr-povolenie-2026-08-10.md"}.
3. Nič nezapájaj do výpočtu — to je A1-C. Toto PR je len dáta + meta.
4. Do atribučného riadku widgetu (pr-nbs-atribucia.md) pridaj
   „Štatistický úrad SR" AŽ KEĎ dáta vstúpia do výpočtu, nie skôr.
```

## Stav dátových zdrojov po 10.8.2026

✅ NBS (atribúcia povinná) · ✅ Eurostat · ✅ **ŠÚ SR (citácia)** · ⏳ Barometer RÚ SR
