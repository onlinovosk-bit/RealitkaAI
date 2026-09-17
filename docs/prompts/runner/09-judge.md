# 09 — JUDGE / GO GATE

Judge je **deterministický spúšťač brán**, nie posudzovateľ. Beží raz na
integrovanú vlnu, nie raz na workera.

```
0  ACCEPT    všetky brány prešli
1  REJECT    brána zlyhala
2  BLOCKED   brána sa nedala vykonať
3  HUMAN     rozhodnutie patrí founderovi
```

---

## Odkiaľ číta verdikt

```
VÝHRADNE z YAML front matter kontraktu, pole verdict.result.
Telo kontraktu je próza a Judge ju nečíta ako dáta.
```

Toto pravidlo vzniklo 16. 9. 2026, keď textové hľadanie verdiktu spustilo bránu
na dokumentačnom odseku v tele kontraktu. Čím poctivejšie sa kontrakt
dokumentoval, tým skôr spadol.

```
verdict.result neprázdny -> BLOCKED "verdikt smie zapísať iba Judge"
```

Vyčistiť blok smie iba príkaz `reopen`, ktorý pôvodný verdikt archivuje do tela,
zapíše dôvod do ledgeru a až potom blok vyprázdni. **Ručná editácia YAML pod
bránou je krok, ktorý sa raz urobí zle.**

---

## HUMAN a cesta späť

`HUMAN` nie je zlyhanie. Je to stav „rozhodne človek".

Dôvody: `risk >= high`, prekročený počet iterácií, rozpor, ktorý Judge nevie
rozhodnúť.

`finish` prijme `HUMAN` **len** pri podpísanom bloku v front matter:

```yaml
founder_approval:
  verdict_run_id: ""     # musí sa zhodovať s verdict.ledger_run_id
  approved_by: ""
  approved_at: ""        # nesmie byť skôr než verdict.checked_at
  reason: ""
```

Štyri poistky, a všetky musia platiť:

```
1. prepísať sa dá iba HUMAN. REJECT a BLOCKED nikdy.
2. verdict_run_id sa musí zhodovať — inak jeden podpis odomkne každý budúci HUMAN
3. approved_at < checked_at -> odmietnuť (podpis verdiktu, ktorý ešte neexistoval)
4. iba front matter, nikdy telo
```

Do ledgeru sa to zapíše ako `human_override`, **nie ako ACCEPT**, a do zámku
`approved_via: human`. Inak o mesiac nerozoznáš vlnu, ktorá prešla bránou,
od vlny, ktorú prepustil podpis.

```
Toto je procedurálna kontrola, nie kryptografická.
Viazanie na run_id obmedzuje dosah, nepravdivosť nevylučuje.
```

---

## Rozpočet, ktorý meria

```
max_iterations   počíta iterácie PRÁCE, nie opravy kontraktu
                 amendmenty kontraktu majú vlastné počítadlo
max_cost_usd     do kontraktu sa generuje IBA ak cost_usd naozaj meria
```

16. 9. 2026 zapísal ledger `cost_usd: 0` pri behu, ktorý spustil celý test
suite, proti limitu 2 USD. Brána merala konštantu — nemohla zasiahnuť nikdy.
Ten istý deň minuli tri behy rozpočtu dávky, ktorá bola v poriadku, lebo
počítadlo účtovalo opravy kontraktu ako pokusy o opravu kódu.

```
Buď to meria, alebo tam to číslo nie je. Tretia možnosť len upokojuje.
```

---

## Čo nasleduje po verdikte

```
ACCEPT   -> push, jeden PR na vlnu, zámok OPEN, číslo PR do zámku
REJECT   -> integračnú vetvu zahoď, zapíš, vytvor nápravný uzol do frontu
BLOCKED  -> STOP celej slučky, označ závislosť, replan
HUMAN    -> vlna čaká na podpis; slučka pokračuje ďalšou vlnou, ak na nej
            táto nezávisí
```

Posledný riadok je zmena oproti pôvodnému návrhu. `HUMAN` zastavil 16. 9. celú
slučku, hoci ďalšia dávka na zamietnutej nezávisela — čakanie na podpis nie je
dôvod zastaviť nezávislú prácu.

Dve vlny po sebe non-ACCEPT -> `STOP two_consecutive_failures`.
