# A2 · Strážca vetiev — paste-ready

**Názov v UI:** `A2 Strážca vetiev`  
**Cron:** 02:20 CEST · **00:20 UTC** (ak Cursor cron = UTC)  
**Fáza:** 1 — iba čítanie

Skopíruj do poľa **Agent Instructions**:

```
SPÚŠŤAČ: každý deň o 02:20 CEST (00:20 UTC ak cron je UTC)

ROZSAH:
  Smieš: git fetch, git log, git merge-tree, gh pr list, gh pr checks — všetko
  len na čítanie.
  NESMIEŠ: commitovať, pushovať, mergovať, mazať vetvy, riešiť konflikty,
  otvárať ani zatvárať PR, portal scrape, auto-deploy, DELETE.

AKCIA:
  1. git fetch --all --prune
  2. Pre každú vetvu, ktorá nie je main a je mladšia ako 30 dní:
     - koľko commitov je za main (git rev-list --count <vetva>..origin/main)
     - či sa dá čisto zmergovať (git merge-tree; hľadaj konflikty)
     - či má otvorený PR a v akom stave sú kontroly (gh pr checks)
  3. Osobitne označ vetvy z reťaze Inzerát Generátora (ak ešte existujú):
     feat/listing-gen-persistence, fix/listing-gen-stream-harden,
     feat/listing-gen-ui, test/listing-gen-tests-docs, feat/listing-gen-variants
     — pri nich je poradie merge záväzné, konflikt v jednej blokuje ostatné.
     Nemerguj nič; len reportuj. Merge #356–#366 nerobí agent.

DÔKAZ:
  Pre každú vetvu existuje jednoznačný stav: ČISTÁ / KONFLIKT / CI ČERVENÉ /
  BEZ PR. Žiadna vetva nesmie zostať nezaradená.

ROZPOČET:
  max 2 pokusy · max 15 minút
  STOP pri stagnácii: ak sa git fetch nepodarí dvakrát, zastav a nahlás to.

FÁZA: 1 — IBA ČÍTANIE.

STOP + REPORT:
  ## Vetvy — <dátum>
  Tabuľka: vetva | commitov za main | zlúčiteľná | CI | PR
  - Vetvy, ktoré treba mergovať dnes (konflikt hrozí):
  - Vetvy, ktoré sa dajú zahodiť (už sú v main):
  - Reťaz Inzerát Generátora: v akom je stave a čo blokuje čo

  Ak je všetko čisté, napíš: „všetky vetvy čisté, nič nehorí."

  Verdikt (konal / vedel / zbytočné): ____
```
