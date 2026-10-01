# LESSONS — register poučení z chýb

**Cieľová cesta:** `brain/lessons/README.md`
**Vzťah k `brain/decisions/`:** decisions = prečo sme niečo urobili.
lessons = **čo sa pokazilo a ako to už nikdy nedopustiť.** Neprekrývajú sa;
lesson typicky *generuje* nové pravidlo alebo rozhodnutie.

## Kedy zapísať lesson
Vždy, keď nastane: prevádzkový incident · strata dát/peňazí/dôvery ·
duplicitná alebo zbytočná práca ≥2 h · takmer-nehoda (near miss), ktorá
mohla skončiť zle · porušenie vlastného pravidla.
**Nie** pre bežné bugy zachytené CI pred merge — to je normálna prevádzka.

## Povinná schéma (každý záznam)
```
id: rme-les-YYYYMMDD-NNN
nazov:
datum:
kategoria: TECH | BIZNIS | PRÁVO | PREVÁDZKA | TRH
chyba:            # čo sa stalo, faktami
dopad:            # koho a čo to reálne zasiahlo (peniaze/čas/dôvera)
rootCause:        # skutočná príčina, nie symptóm
detekcia:         # ako sme to zistili — a za ako dlho
fix:              # čo sme urobili teraz
prevencia:        # pravidlo/test/automat, ktorý to zopakovať nedovolí
prevenciaOverena: # true/false — existuje dôkaz, že prevencia funguje?
suvisiaceRozhodnutia: [rme-dec-…]
```
Kľúčové pole je **`prevenciaOverena`**. Lesson bez overenej prevencie je
len príbeh. Audit ho má hlásiť ako advisory.

## Kadencia
Review pri každom týždennom `brain:weekly`. Lesson s
`prevenciaOverena: false` starší než 30 dní = advisory finding.
