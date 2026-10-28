# Riadenie konverzácií

Platí pre ďalšiu väčšiu úlohu. Tento súbor nespúšťa presun ani premenovanie.

## Pred väčšou úlohou

1. Vyber oblasť v [taxonomy.md](taxonomy.md).
2. Ak už práca beží v projekte tej oblasti, zostaň v ňom.
3. Ak beží inde, pomenuj cieľovú oblasť a nechaj presun človeku, kým nástroj presun nepotvrdí.
4. Chat, ktorý v projekte nevznikol pred tvojimi očami v nástroji, tak nenazývaj.

Oblasť C už má projekt, ktorého beh sa volá **Revolis Security Audits**. Ďalší bezpečnostný projekt sa nezakladá.

Oblasť F je sekcia v repe. Cursor projekt pre vydania sa nezakladá, kým jeho vznik nepotvrdí nástroj.

Oblasť G sa v tomto repe neotvára ako práca na kóde Onlinovo.

## Čo v tomto behu nástroje naozaj vedia

Zistené 2026-10-23 v tomto cloud agentovi. Podrobnosti a odkazy sú v [správe](../reports/2026-10-23-revolis-project-os.md).

| Nástroj | Čo vrátil |
|---|---|
| `cursor-cloud` / `run-info` | Identita tohto behu: názov, repozitár, stav, URL. Pole projektu v odpovedi nie je. |
| `cursor-cloud` / `list-cloud-agents` | Zoznam cloud agent behov viditeľných pre tohto principála v tomto prostredí. Názov, stav, zdroj, repozitár, URL. Pole Cursor projektu v odpovedi nie je. |
| `cursor-cloud` / `rename-chat` | Schéma prečítaná. Premenuje len tento chat. V tomto behu sa nevolal. |
| Vyhľadanie názvov nástrojov `project`, `createProject`, `moveChat`, `conversation` | Žiadny nástroj. |

Z toho vyplýva manuálny postup, nie automatický presun. Checklist je v správe.

## Názov

Dohodnutý tvar je v [taxonomy.md](taxonomy.md). Existujúce chaty sa podľa neho samy nepremenujú. `rename-chat` vie zmeniť len bežiaci chat a len keď to zadanie výslovne chce.

## Čo sa do popisu projektu nedáva

Tajomstvá, prihlasovacie údaje, osobné údaje, zákaznícke záznamy, celé vlákna chatov. Brief odkazuje na súbor v repe. Rozhodnutie a dnešný fakt sú dve vety s cestou k zdroju.

## Jeden domov

Konverzácia sa nekopíruje do druhej oblasti. V druhej oblasti je odkaz: názov, prečo tam nie je, kde je primárny domov.
