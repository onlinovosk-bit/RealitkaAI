# TASK: BRAIN OS + OBSIDIAN VAULT — zapnúť to, čo už existuje

**Pre:** Cursor agent
**Branch:** `chore/brain-os-activation`
**PR:** `chore(brain): commit audits, widen registry, make vault a reading surface`
**Merge:** NIKDY agentom.

> **Nahrádza časť T2 zo zadania `task-znalostna-hygiena.md`.** Tá sekcia bola
> postavená na chybnom zistení — viď sekcia 0.

---

## 0. Oprava predchádzajúceho zadania (dôležité)

V zadaní `chore/knowledge-hygiene` som napísal, že `decisions.md` má 7 riadkov
a treba ho začať plniť. **To bolo nesprávne.** Pozrel som sa na koreňový
`decisions.md`. Skutočný stav:

```
memory/decisions.md      960 riadkov, aktívny, posledné záznamy 24.8.2026
decisions.md (koreň)       7 riadkov, jeden záznam z 27.6.2026 — MŔTVA DUPLICITA
```

A `.github/workflows/memory-engine-report.yml` to má priamo zapísané:

```
# D-2026-08-17-01 Variant A: memory/decisions.md is the only SoT.
```

**Ak si už `chore/knowledge-hygiene` poslal do Cursoru, jeho sekcia T2 by vytvorila
druhý zdroj pravdy — presne to, čo CI zakazuje.** V tomto PR to opravíme.

---

## 1. Nález — Brain OS existuje a beží

```
brain/ENGINE.md          špecifikácia, status: active, review_by: 2026-08-19 (prešlo)
brain/src/               ingest · catalog · audit · weekly · schema · loader · repo
brain/registry/index.json    24 indexovaných dokumentov
brain/lessons/            3 lekcie, všetky z 22.7.2026
brain/audits/             posledný audit 24.7.2026 — potom nič
package.json              brain:ingest · brain:check · brain:audit · brain:weekly
.github/workflows/memory-engine-report.yml   beží pri KAŽDOM pull requeste
```

Motor nie je mŕtvy. **Beží pri každom PR a nikto z toho nič nemá.**
Tri konkrétne dôvody:

### Dôvod 1 — audit je iba poradný
```yaml
- name: Run advisory repository audit
  continue-on-error: true
```
Nikto nemusí jeho výstup ani otvoriť.

### Dôvod 2 — výstup sa vyparí
```yaml
- uses: actions/upload-artifact@v4
  retention-days: 14
```
Audit skončí ako GitHub artefakt, ktorý za 14 dní zmizne. **Preto sa
`brain/audits/` zastavilo 24. júla** — vtedy sa prestali commitovať a odvtedy
existujú len ako expirujúce prílohy, ktoré nikto nesťahuje.

### Dôvod 3 — registry pozná 24 dokumentov z 309
Brain nenájde to, čo nemá v indexe. Preto sme za 24 hodín „objavili" päť vecí,
ktoré už v repe boli.

---

## T1 — Zrušiť mŕtvu duplicitu rozhodnutí

Koreňový `decisions.md` **nemaž** — nahraď jeho obsah ukazovateľom:

```markdown
# Decisions — presunuté

Jediný zdroj pravdy pre rozhodnutia je **`memory/decisions.md`**
(D-2026-08-17-01, Variant A; vynucuje `.github/workflows/memory-engine-report.yml`).

Tento súbor obsahoval jeden záznam z 27. 6. 2026, ktorý bol prenesený
do `memory/decisions.md`. Nové záznamy sem nepíš.
```

Ten jeden záznam z 27. 6. prenes do `memory/decisions.md` v jeho formáte,
s poznámkou `(prenesené z decisions.md, 2026-09-04)`. **Nič neprepisuj ani
nedopĺňaj** — prenes doslovne.

---

## T2 — Audit sa musí zapisovať do repa

Uprav `.github/workflows/memory-engine-report.yml`:

1. Audit naďalej `continue-on-error: true` **pri PR** — nechceme blokovať prácu
   poradným nálezom.
2. **Pridaj druhý job, ktorý beží raz týždenne** (`schedule`, pondelok ráno)
   nad `main` a jeho výstup **commitne** do `brain/audits/YYYY-MM-DD.md` a `.json`
   cez PR, nie priamo do main.
3. Artefakt s 14-dňovou retenciou nechaj — je užitočný pri konkrétnom PR.

Ak `brain:weekly` už presne toto robí, **nepíš nový skript** — zisti, čo robí,
napíš to do PR a zapoj ho. (Ústava, princíp 1: prefer reuse.)

---

## T3 — Rozšíriť registry

Dnes 24 dokumentov. Rozšír zdroje v `brain/src/ingest.ts` (alebo v jeho konfigurácii)
o:

```
docs/architecture/**       37 súborov — ADR, ústava, antipatterny, parked
brain/lessons/**            3
memory/*.md                11
docs/audit/**               8
```

**Nezaraďuj** `docs/reports/**` (76), `docs/briefs/**` (74) ani `docs/prompts/**` (45).
Sú to pracovné papiere s trojdňovou životnosťou. `ENGINE.md` to hovorí sám:
*„Brain OS nie je sklad ďalších stoviek strán."*

Cieľový rozsah indexu je **60–80 dokumentov**, nie 309.

Po rozšírení spusti `npm run brain:check` a do PR napíš, koľko dokumentov index
obsahuje a koľko validačných problémov sa objavilo.

---

## T4 — Vault ako čitateľský povrch, nie ďalší sklad

Obsidian má hodnotu v grafe, spätných odkazoch a rýchlom hľadaní **nad malou
kurátorovanou množinou**. Nad 309 súbormi je to nepoužiteľné.

### Čo vault zrkadlí (a nič iné)

```
memory/decisions.md
memory/*.md
brain/ENGINE.md
brain/lessons/**
brain/audits/**                    ← po T2 budú konečne existovať
docs/architecture/adr-*.md
docs/architecture/antipatterns-log.md
docs/architecture/l99-parked-concepts.md
docs/architecture/engineering-constitution.md
docs/architecture/revolis-constitution-v2.md
docs/audit/**
```

Zapíš tento zoznam do `docs/OBSIDIAN-VAULT-ACTIVATION.md` ako sekciu
**„Čo sa zrkadlí a čo nie"**, aj s dôvodom.

### Aby bol graf použiteľný

Obsidian kreslí hrany z odkazov `[[...]]`. Dnešné dokumenty odkazujú cez
markdownové cesty, takže graf je prázdny. **Neprepisuj 300 súborov.**

Namiesto toho vytvor **jeden rozcestník** `docs/architecture/MAPA.md`:

```markdown
# Mapa poznania Revolis

## Nemenné
- [[engineering-constitution]] — 5 princípov
- [[revolis-constitution-v2]]
- [[antipatterns-log]] — AP-001 … AP-013

## Rozhodnutia
- [[decisions]] (memory/decisions.md) — jediný zdroj pravdy
- ADR: [[adr-2026-09-03-growth-intelligence-principles]], …

## Zaparkované
- [[l99-parked-concepts]] — P-GI, P-MR a podmienky odparkovania

## Stav systému
- [[INDEX]] — generovaný zoznam všetkého
- brain/audits — týždenný audit
```

Jeden súbor s odkazmi `[[...]]` spraví graf navigovateľným. Ostatné pribudnú
prirodzene, ako sa budú dokumenty dotýkať.

### Ako sa vault plní
**Ručne, mimo swarmu, a zostáva to tak.** Rozhodnutie foundera zo 4. 9. 2026:
swarm nezapisuje do `RealitkaAI-Memory`. Tento PR len definuje, čo sa zrkadlí.

---

## T5 — `review_by` prešlo

`brain/ENGINE.md` má `review_by: 2026-08-19`. Je po termíne o dva a pol týždňa.

**Neaktualizuj dátum len tak.** Zapíš do PR nález: „ENGINE.md je po revízii,
vyžaduje rozhodnutie foundera" a pridaj riadok do `memory/decisions.md`.
Dátum posunie founder, keď spec prejde.

---

## Akceptačné kritériá

- [ ] koreňový `decisions.md` je ukazovateľ, jeho záznam je prenesený do `memory/decisions.md`
- [ ] týždenný job commituje audit do `brain/audits/` cez PR (alebo je zapojený `brain:weekly`)
- [ ] registry obsahuje 60–80 dokumentov; počet a validačné problémy sú v PR
- [ ] `docs/architecture/MAPA.md` existuje a používa `[[...]]` odkazy
- [ ] `docs/OBSIDIAN-VAULT-ACTIVATION.md` má sekciu „Čo sa zrkadlí a čo nie"
- [ ] `npm run brain:check` a `brain:test` sú zelené
- [ ] nález o `review_by` je v PR aj v `memory/decisions.md`

## ZAKÁZANÉ

```
mazať decisions.md, brain/ ani memory/
vytvárať brain/decisions/decisions.md — CI to explicitne zakazuje
zaraďovať docs/reports, docs/briefs a docs/prompts do registry
zapisovať čokoľvek do RealitkaAI-Memory
prepisovať odkazy v existujúcich 300 dokumentoch na [[...]]
posúvať review_by v ENGINE.md
```
