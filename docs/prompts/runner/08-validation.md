# 08 — VALIDATION

Overuje sa **integrovaný výsledok vlny**, nie jednotliví workeri. Integrovaný
výsledok je to, čo sa merguje.

---

## Kontrola územia (pred integráciou)

Pre každého workera:

```
git diff --name-only <BASE_SHA>..<jeho vetva>
```

```
množina súborov ⊆ jeho write_territory   -> pokračuje
čokoľvek navyše                          -> worker vypadne z vlny, dôvod sa zapíše
```

Scaffolding (`PROMPT.md`, `.done.json`) je v `.git/info/exclude` a v diffe byť
nesmie. Ak tam je, orchestrátor ho pri zakladaní worktree nevylúčil — to je
chyba orchestrátora, nie workera, a zapíše sa tak.

---

## Acceptance vlny

Každá položka má `id`, doslovný `cmd`, `expect` a kategóriu.

```
SHELL      Judge ju spustí a porovná výsledok
EXTERNAL   Judge ju nespúšťa; overí, že miesto jej behu existuje
```

`EXTERNAL` vznikla preto, že kontrola bežiaca v CI proti credentials sa v slučke
spustiť nedá a nesmie. Nie je to výnimka — je to zápis, kde sa kontrola
vykonáva. **Neexistujúce miesto behu = FAIL, nikdy tiché preskočenie.**

### Pravidlá pre acceptance

```
prázdny výsledok                      -> BLOCKED
príkaz tvaru echo / true / :          -> BLOCKED
exit 127, Cannot find module,
  command not found, No such file     -> BLOCKED, nie REJECT
```

Rozdiel medzi `BLOCKED` a `REJECT` je rozdiel medzi „nevieme" a „vieme, že nie".
Nezlučovať.

---

## Ratchet, nie absolútny prah

Kontrola, ktorá padá na dlhu existujúcom pred zmenou, je alarm, ktorý sa naučíš
ignorovať — a potom prehliadneš ten pravý.

```
typecheck   baseline + fail len na NOVEJ chybe
testy       hermetický suite; RLS a integration bežia v CI proti ephemeral DB
lint        baseline, ak existuje
```

**Žiadna vlna nespúšťa `--write-baseline`.** Baseline sa znižuje raz, na konci,
po merge. Keby ho znižovala každá vlna, všetky PR by menili ten istý súbor
a disjunktnosť by bola preč.

---

## Nedeterministické brány

Brána, ktorá raz padne a raz prejde nad tým istým vstupom, je horšia než žiadna:
ACCEPT aj REJECT sú sčasti hod kockou, a keď sa raz začnú behy opakovať,
kým nevyjde ten správny, brána prestala existovať.

Postup pri podozrení na flake:

```
1. spusti podozrivý súbor izolovane
2. spusti celý suite znova, nezmenene
3. porovnaj trvanie oboch behov
```

```
izolovane prejde + opakovanie prejde + pomalší červený beh  -> flake pod záťažou
padne izolovane                                             -> nie je flake
padne dvakrát po sebe rovnako                               -> nie je flake
```

Flake sa **zapíše do kontraktu** ako známa nedeterministickosť s číslami oboch
behov, a naprav sa mimo tejto vlny. Nikdy sa nerieši vylúčením padajúceho testu.

**Test sa smie vylúčiť pre vlastnosť testu, nikdy pre jeho výsledok.**

---

## Negatívny prípad každej novej kontroly

Pred prvým ostrým použitím:

```
prípad, ktorý má prejsť   -> PASS
prípad, ktorý má padnúť   -> FAIL
```

Obidva výsledky idú do ledgeru. Kontrola bez doloženého negatívneho prípadu
je v registri vedená ako `unverified_gate` a nesmie byť jediná, ktorá niečo
stráži.
