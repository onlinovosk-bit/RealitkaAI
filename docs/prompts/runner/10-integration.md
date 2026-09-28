# 10 — INTEGRATION

Integrujú sa **iba overené** výstupy workerov. Neúspešný worker je izolovaný,
vlna kvôli nemu nepadá.

---

## Kde sa integruje

**Vo worktree prvého úspešného workera.** Nie v hlavnom checkoute.

```
git checkout -B batch/<wave> v hlavnom checkoute prepne founderovi vetvu
pod rukami a môže zlyhať na špinavom strome.
```

Vedľajší zisk: žiadny štvrtý worktree, žiadne štvrté `node_modules` (~1,2 GB),
a v hlavnom checkoute sa dá ďalej pracovať, kým vlna integruje.

---

## Postup

```
1. pre každého workera: kontrola územia (08)
2. integračná vetva z BASE_SHA
3. git merge --no-ff <každá overená vetva>
4. konflikt -> STOP celej vlny
5. git diff --name-only BASE_SHA..HEAD -> presne očakávaná množina
6. Judge nad integračnou vetvou
```

Krok 3 by mal byť bezkonfliktný z princípu: tri vetvy meniace tri rôzne súbory
git zlúči vždy. Napriek tomu sa **overuje, nepredpokladá.** Ak konflikt nastane,
návrh má dieru a beh sa má zastaviť — nie „vyriešiť ručne".

---

## Merge konflikt

```
Konflikt rieši founder, alebo sa vlna zahodí. NIKDY agent.
```

Toto je najdrahšia lekcia 16. 9. 2026. Agent dostal zadanie vyriešiť konflikt
na `batch/tc-1`, vyriešil ho poslušne a korektne — a pri tom pushol commit
`15ef093d2`, ktorý do PR pridal `apps/crm/scripts/judge.mjs`, súbor mimo
deklarovaného rozsahu. Zmergovalo sa šesť súborov namiesto troch a popis PR
tvrdil opak.

Nikto neurobil nič zle. Zadanie bolo zlé.

---

## B7 — kontrola rozsahu pri MERGE

Toto je jadro nápravy. Brána, ktorá overuje rozsah pri verdikte, nechráni okno
medzi posledným overením a merge.

```yaml
# .github/workflows/scope-guard.yml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
```

```
1. nájdi task kontrakt prislúchajúci tomuto PR
2. načítaj scope.repo_paths z jeho front matter
3. porovnaj so zoznamom súborov PR
4. súbor mimo repo_paths      -> FAIL, vypíš ktorý
5. kontrakt sa nedá nájsť      -> FAIL, nie skip
```

Krok 5 je dôležitejší než vyzerá. „Kontrakt sa nenašiel, tak preskočím" je presne
tá tichá diera, ktorú celá táto vrstva zatvára.

`synchronize` v `types` zaručí, že sa brána spustí **po každom ďalšom commite**,
vrátane toho z riešenia konfliktu.

### Povolené výnimky

Ledger a task kontrakt sú vedľajšie produkty behu a do PR patria. Deklarujú sa
**v kontrakte**, nie v kóde brány:

```yaml
scope:
  repo_paths: [...]
  implicit_allow:
    - .ai/bus/ledger/**
    - .ai/bus/tasks/**
```

Čo nie je v `repo_paths` ani v `implicit_allow`, je porušenie rozsahu.

---

## PR

```
jeden PR na vlnu, nie jeden PR na uzol
```

17 súborov ako 7 dávok je 7 PR namiesto 17 — merge kapacita sa nezaťaží viac,
zaťaží sa **menej**, lebo jeden merge vybaví tri súbory.

Popis PR musí obsahovať:

```
ktoré brány bežali a s akým výsledkom
ktoré brány NEBEŽALI a prečo (chýbajúce na báze, presunuté do CI)
verdikt, run_id, a pri HUMAN aj že vlna prešla podpisom a nie bránou
hash nástroja, ktorý verdikt vydal, ak nebol z main
známe nedeterministickosti
```

Popis, ktorý tvrdí niečo o rozsahu, musí byť po merge stále pravdivý.
B7 je poistka práve na to.

Po vytvorení PR sa jeho číslo zapíše do zámku. Zámok `OPEN` bez čísla PR je
zámok bez identity a `MAX_OPEN_PRS` ho nevie s ničím spárovať.
