# Night Operations — cieľová architektúra v3

**Cieľová cesta:** `docs/architecture/2026-08-03-night-operations.md`
**Nahrádza:** v2 · **Kategória:** Strategic Bet
**Stav:** pracovný návrh pripravený na GO

---

## 0. Čo zmenila táto revízia

| Námietka z boardu | Prijaté | Zmena |
|---|---|---|
| Fixné čísla v obchodných bránach nie sú univerzálne | **áno** | ADR-004 preformulované na princíp; čísla zostávajú ako **východisko s možnosťou výnimky** |
| Chýbajú brány na **odstránenie** uzla | **áno** | Nové ADR-005 + exit kritérium pri každom uzle (sekcia 3) |
| Chýbajú metriky úspechu na 30 a 90 dní | **áno** | Sekcia 4 — a zámerne to **nie sú metriky o automatizácii, ale o dopade** |

Doplnené nad rámec: **mechanizmus merania.** Bez neho by exit kritériá zostali
pri dobrom úmysle — uzol, ktorý nikto nečíta, sa sám neohlási.

---

## 1. ADR-004 — preformulované

**Pôvodné znenie (v2):** *4. uzol až po +10 oslovených, orchestrátor pri 3. platiacom,
Center pri 5 platiacich.*

Board má pravdu: to sú **východiská, nie zákon.** Ak príde veľký zákazník
s auditnou požiadavkou alebo regulačná povinnosť, dôvod postaviť uzol skôr
existuje bez ohľadu na počet platiacich.

> ### ADR-004 · Dvojité odôvodnenie
> **Nový uzol vyžaduje technické aj obchodné odôvodnenie. Ani jedno samo nestačí.**
>
> Predvolené prahy nižšie sú **východiskom, nie podmienkou.** Odchýlka je povolená,
> ak je v `memory/decisions.md` zapísaná spolu s obchodným dôvodom a dátumom revízie.
>
> | Uzol | Predvolený technický prah | Predvolený obchodný prah |
> |---|---|---|
> | 4. uzol | prvé tri sa čítajú | +10 oslovených kancelárií |
> | 5. uzol / orchestrátor | 4 uzly bežia | 3. platiaci zákazník |
> | 6.–8. uzol / Center | orchestrátor beží | 5 platiacich |
>
> **Uznané dôvody na výnimku:** zmluvná alebo regulačná požiadavka zákazníka ·
> auditná povinnosť · incident, ktorý by daný uzol bol zachytil · nový zákazník,
> ktorého objem prah beztak prekročí.
>
> **Neuznaný dôvod:** „bolo by to zaujímavé postaviť."

---

## 2. ADR-005 — životný cyklus uzla

> Uzol prechádza štyrmi stavmi. **Každý má definovaný výstup.**
>
> ```
> NÁVRH  →  BEŽÍ  →  VYHODNOTENIE (30 / 90 dní)  →  PONECHAŤ | ZLÚČIŤ | VYPNÚŤ
> ```
>
> **Vypnutý uzol sa nemaže.** Zostáva v repe s dátumom a dôvodom vypnutia —
> presne ako `schema-governance-guard.yml`, ktorý má v hlavičke napísané,
> kedy a prečo bol zastavený. To je najcennejší komentár v celom repe.

### Spúšťače vypnutia — stačí jeden

| Spúšťač | Ako sa meria |
|---|---|
| **30 dní bez verdiktu** | v `nodes-value.jsonl` chýba tvoj jednoslovný verdikt |
| **30 dní bez akcie** | uzol nevyprodukoval ani jedno rozhodnutie ani zmenu |
| **Trvalo červený** | 14 dní hlási to isté zlyhanie a nikto ho nerieši |
| **Nahradený** | iný uzol pokrýva to isté |
| **Prah splnený natrvalo** | uzol bol dočasný a jeho účel pominul |

Druhý spúšťač je najdôležitejší. **Report, ktorý nič nezmenil, nie je monitoring —
je to šum, a šum ťa naučí ignorovať aj ten užitočný.** Máš na to precedens
vo vlastnom repe.

---

## 3. Mechanizmus merania — jedno slovo denne

Exit kritériá potrebujú dáta. Najlacnejší poctivý spôsob:

**Po prečítaní reportu napíšeš jedno slovo.** Nič viac.

```
docs/audit/nodes-value.jsonl        (append-only, jeden riadok denne na uzol)

{"date":"2026-08-04","node":"morning-brief","verdict":"konal",
 "action":"volal Kališovi"}

verdict ∈ { konal | vedel | zbytočné }
  konal    — report ma priviedol k akcii, ktorú by som inak neurobil
  vedel    — potvrdil, čo som už vedel; nič som nezmenil
  zbytočné — nepriniesol nič
```

**Ak ti nestojí za to napísať jedno slovo, to JE odpoveď.** Prázdny riadok
30 dní po sebe spúšťa vypnutie. Nemeriaš tým uzol — meriaš, či ti stojí za pozornosť.

> Doplň do reportu každého uzla poslednú vetu:
> *„Verdikt (konal / vedel / zbytočné): ____"*
> a nechaj priestor. Tri sekundy denne.

---

## 4. Metriky úspechu — dopad, nie prevádzka

**Zámerne to nie sú metriky o automatizácii.** Počet nálezov, dostupnosť uzla
ani počet behov nič nehovoria — uzol môže bežať bezchybne a byť zbytočný.

| Uzol | 30 dní | 90 dní | Exit, ak |
|---|---|---|---|
| **A1 · Architecture Guardian** | zachytil ≥1 regresiu na `main`, ktorú PR CI prepustilo | trend `contract_total` a `dead_total` **plochý alebo klesajúci** | 0 zachytených regresií a trend plochý → PR CI stačí |
| **A2 · Branch Guardian** | ≥1 vetva zmergovaná alebo zmazaná **kvôli** reportu | priemerný vek otvorenej vetvy klesol | <5 otvorených vetiev natrvalo → uzol stratil účel |
| **A3 · Morning Brief** | ≥5 verdiktov „konal" | **vek najstaršieho nekontaktovaného leadu klesol pod 3 dni** | 30 dní bez „konal" |
| Statický Profit Leak | ≥1 nález s vyčísleným dopadom | ≥1 nález, ktorý priniesol peniaze alebo odvrátil riziko | 2 behy po sebe bez nového nálezu → prejsť na štvrťročne |
| Dátový Profit Leak | prvý beh dá čísla, ktoré si nemal | ≥1 cenové alebo produktové rozhodnutie postavené na jeho dátach | nálezy sa opakujú a nikto ich nerieši |

### Metrika celého systému

> **Čas od vzniku problému po moment, keď o ňom viem.**

Dnešná východisková hodnota je merateľná a nepríjemná: **Igor Kališ, lead z 5. 7.,
ležal nekontaktovaný 28 dní.** Guardian ho hlásil, digest bol vypnutý, nikto sa
to nedozvedel.

**Ak po 90 dňoch neleží žiadny lead dlhšie než 3 dni, Night Operations funguje.
Ak stále ležia 28 dní, nezáleží na tom, aké zelené sú reporty.**

---

## 5. Rituál vyhodnotenia

| Kedy | Čo |
|---|---|
| **piatok 8. 8.** | prvá kontrola — čítal som reporty päť rán? *(kill kritérium z v2)* |
| **2. 9.** (30 dní) | prvé vyhodnotenie metrík z tabuľky vyššie · rozhodnutie o 4. uzle |
| **2. 11.** (90 dní) | druhé vyhodnotenie · rozhodnutie o orchestrátore |
| **štvrťročne** | prehodnotenie prahov v ADR-004 — sú stále rozumné? |

Bez zapísaného dátumu sa vyhodnotenie nekoná. To je poučenie z Guardian digestu,
ktorý je vypnutý dodnes, lebo nemal review dátum.

---

## 6. Zhrnutie ADR do `memory/decisions.md`

Zapísať dnes, review **8. 9. 2026**:

1. **ADR-001** — Piaty uzol = orchestrátor. Do štyroch sa reporty čítajú jednotlivo.
2. **ADR-002** — Každý uzol má vstupnú bránu. Uzol bez brány sa nestavia.
3. **ADR-003** — Vrstva 4 smie navrhovať, prioritizovať, odhadovať návratnosť
   a pripraviť PR. Nikdy commit, merge ani deploy bez človeka.
4. **ADR-004** — Nový uzol vyžaduje technické **aj** obchodné odôvodnenie.
   Predvolené prahy sú východiskom; odchýlka je povolená so zapísaným dôvodom.
5. **ADR-005** — Uzol má životný cyklus vrátane vypnutia. Vypnutý uzol sa
   nemaže, zostáva s dátumom a dôvodom.
6. **Kill kritérium** — ak 8. 8. nebudem vedieť povedať, že som reporty čítal
   päť rán po sebe, vypínam všetky tri a nestaviam štvrtý.

---

## 7. Čo dnes večer — nezmenené

1. Naklikaj tri automatizácie podľa `docs/automations/2026-08-03-setup-karta.md`
2. Do A1 pridaj kroky 7 a 8 (história a trend)
3. Do reportu každého uzla pridaj poslednú vetu **„Verdikt: ____"**
4. Zapíš šesť rozhodnutí zo sekcie 6
5. **Choď spať**

---

## 8. Posledná poznámka mimo architektúry

Tento dokument prešiel troma revíziami a je dobrý. Zároveň:

**Za ten istý čas neubudlo z čísla 40 oslovených / 1 odpoveď.**

Architektúra nočných automatizácií je teraz zrelšia než akvizičný proces, ktorý
má priviesť zákazníkov, pre ktorých tá architektúra existuje. To nie je výčitka —
je to presne ten druh driftu, pred ktorým `FOUNDER.md` varuje, a ADR-004
bol napísaný, aby sa to nezopakovalo.

Zajtra o 8:45 je GARANT REAL. **To je jediná vec v tomto týždni, ktorú
žiadny uzol neurobí za teba.**
