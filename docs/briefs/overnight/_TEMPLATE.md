# Šablóna overnight briefu — povinná sekcia „Spoľahlivosť behu"

> Stav: v0.1 · 2026-10-27 · rozsah: **iba** tri povinné pravidlá spoľahlivosti (R1–R3).
> Ostatnú štruktúru briefu (PHASE 0, dôkaz nepretínania, akceptačné kritériá po agentoch) táto šablóna
> nedefinuje ani nemení.
>
> Použitie: sekciu nižšie vlož do každého nového overnight briefu bez úprav. Odchýlku zapíš priamo
> do briefu aj s dôvodom.
>
> Stavy dôkazu (`PASS` · `FAIL` · `BLOCKED` · `NOT_VERIFIED`) a pravidlo „hotovo" sú kanonicky
> v `docs/architecture/cross-agent-engineering-contract.md` §4. Táto šablóna ich nepreberá, iba ich viaže
> na overnight beh. Pri rozpore platí kontrakt.

---

## Spoľahlivosť behu (povinné)

### R1 — Zlyhaná kontrola nie je „bez zmeny"

- Zdroj, ktorý sa nepodarilo načítať, overiť alebo úplne skontrolovať, sa **nikdy** nezaznamená ako
  „bez zmeny".
- „Bez zmeny" smie zaznieť iba vtedy, keď prebehlo celé porovnanie s posledným úspešným snapshotom
  a je k nemu odkaz na dôkaz.
- Inak je výsledok `BLOCKED` (kontrola sa nedala spustiť) alebo `NOT_VERIFIED` (spustila sa neúplne
  alebo bez dôkazu), vždy s presnou chybou.
- Chýbajúci baseline snapshot je `NOT_VERIFIED`, nie „bez zmeny". Závery, ktoré od takého zdroja
  závisia, ostávajú otvorené.

### R2 — Ohraničené pokusy a checkpointy

- Predvolene najviac **2 pokusy** (= 1 retry) na tú istú zlyhávajúcu operáciu. Druhý pokus iba vtedy,
  keď sa zmenilo niečo, čo môže chybu vyriešiť. Platí pre operácie bez vedľajších účinkov: čítanie,
  fetch, testy.
- Operácia, ktorá mení stav alebo môže byť nevratná (zápis, commit/push, PR, platený provider call,
  odoslanie správy), sa pred opakovaním najprv overí: neuspel už prvý pokus? Neistý výsledok sa
  reconciluje, nikdy sa slepo neopakuje. Ak sa to overiť nedá, výsledok je `BLOCKED` a operácia sa
  neopakuje.
- Checkpoint sa ukladá do výstupného adresára lane po každej dokončenej hranici: zdroj získaný → dôkaz
  extrahovaný → výstup vytvorený → kontroly prebehli.
- Pri zlyhaní: ulož hotovú prácu, zapíš presnú chybu, dotknutý výstup a najmenší ďalší krok.
  Pokračuj v práci, ktorá od zlyhania nezávisí.
- Resume načíta checkpoint a opakuje iba nedokončenú operáciu. Dokončené úlohy sa znova nespúšťajú.
- Ak retry riadi skript, limit musí byť aj v skripte, nielen v texte briefu.

### R3 — Hotovo iba s dôkazom ku každej povinnej kontrole

- Každá povinná kontrola a každé akceptačné kritérium má stav podľa kontraktu §4 a odkaz na dôkaz:
  cesta k súboru, CI log, výstup príkazu alebo commit.
- Výsledok, v ktorom je čo i len jedna povinná kontrola mimo `PASS`, sa neoznačí ako hotový ani
  prijatý (ACCEPTED). Vráti sa so zoznamom nevyriešených kontrol a ich stavov.
- Tvrdenie agenta „overené" bez odkazu na dôkaz má stav `NOT_VERIFIED`.
