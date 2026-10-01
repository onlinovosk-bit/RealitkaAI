---
id: governance.engineering-constitution
title: Engineering Constitution — Builder / Judge / Decision Memory
type: governance
status: active
version: 1.0.0
owner: engineering
created_at: 2026-08-02
updated_at: 2026-08-02
review_by: 2026-11-02
confidentiality: internal
canonical: true
sources:
  - brain/ENGINE.md
  - docs/architecture/engineering-os-revolis-rightsized.md
  - docs/architecture/revolis-constitution-v2.md
  - memory/decisions.md
depends_on:
  - brain.engine
  - memory.decisions
related:
  - "[[revolis-constitution-v2]]"
  - "[[engineering-os-revolis-rightsized]]"
  - "[[memory-engine-canonical-model]]"
tags: [engineering, governance, builder, judge, decision-memory, reuse]
---

# Engineering Constitution

> **Rozsah:** Toto je **technická** ústava (ako písať kód). Biznis brána zostáva v
> [`revolis-constitution-v2.md`](revolis-constitution-v2.md). Produktové rozhodnutia
> a kódové odôvodnenia sa **nepíšu do paralelného logu** — idú do existujúceho
> Decision Memory (`memory/decisions.md` + projekcia `brain/decisions/index.json`).

Tri vrstvy: **Constitution** (nemenné princípy) → **Policy** (decision tree pre
Buildera) → **Enforcement** (Judge po úlohe). Judge = Kontrolór v režime
Engineering Constitution; nie je to auto-resolve — chýbajúce odôvodnenie vracia
Buildera späť.

---

## VRSTVA 1 — CONSTITUTION (5 nemenných princípov)

1. **Prefer reuse pred novým kódom** — pred novým súborom/modulom prehľadaj repo
   a `brain/registry/index.json`.
2. **Prefer natívne API/platformu pred vlastnou implementáciou** — Next.js, Supabase,
   Vercel, existujúce knižnice v monorepe.
3. **Nikdy neduplikuj existujúcu logiku** — extrahuj, rozšír, ale nekopíruj.
4. **Každá nová abstrakcia potrebuje dôkaz opodstatnenosti** — druhé použitie alebo
   merateľná úspora complexity; inak inline.
5. **Jednoduchosť má prednosť pred flexibilitou** — YAGNI; flexibilita až po dôkaze
   opakovaného vzoru.

Tieto princípy sa nemenia bez záznamu v Decision Memory a explicitného GO foundera
(protokol konfliktu: [`brain/ENGINE.md` §21](../../brain/ENGINE.md)).

---

## VRSTVA 2 — POLICY (Builder decision tree)

Pred pridaním **nového súboru**, **nového komponentu**, **novej závislosti** alebo
**novej abstrakcie** Builder prejde strom v tomto poradí (prvá platná vetva vyhráva):

| Krok | Otázka | Ak áno → |
|------|--------|----------|
| 1 | Existuje reuse v repe alebo v `brain/registry`? | Rozšír existujúce; zaznamenaj `path: reuse` |
| 2 | Rieši to natívne API platformy (Next/Supabase/Vercel/Node)? | Použi platformu; `path: native-api` |
| 2b | Rieši to štandardná knižnica už v `package.json`? | Použi ju; `path: existing-dep` |
| 3 | Rieši to stdlib / built-in bez novej dep? | Použi stdlib; `path: stdlib` |
| 4 | Inak | Nový kód alebo nová dep — **povinné odôvodnenie** (vrstva 3); `path: new-code` alebo `new-dep` |

Ak je vetva 4, Builder **nesmie** merge-núť bez Judge PASS na formát odôvodnenia.

---

## VRSTVA 3 — ENFORCEMENT (Judge)

**Judge** = Kontrolór ([`.claude/skills/kontrolor/SKILL.md`](../../.claude/skills/kontrolor/SKILL.md))
po dokončení Builder úlohy, keď diff obsahuje nový súbor/komponent/dep/abstrakciu.

### Povinný formát odôvodnenia (Builder)

Odôvodnenie je **blok v PR popise** alebo **záznam v Decision Memory** (odporúčané
pre trvalé rozhodnutia). Všetky polia sú povinné; chýbajúce pole = **RETURN to Builder**.

```markdown
## Engineering justification: [krátky názov]

- **Trigger:** new-file | new-component | new-dependency | new-abstraction
- **Decision path:** reuse | native-api | stdlib | existing-dep | new-code | new-dep
- **Alternatives considered:** [min. 1 konkrétna alternatíva + prečo nie]
- **Why not reuse:** [povinné ak path ≠ reuse; inak "N/A — reuse applied"]
- **Expected outcome:** [čo sa zlepší / čo sa nezhorší]
- **Related paths:** [súbory, registry ID, alebo rozhodnutia]
- **Contradiction check:** none | flag — [id alebo popis konfliktu s memory/decisions.md / ADR]
```

### Verdikt Judge

| Verdikt | Význam |
|---------|--------|
| **PASS** | Formát kompletný, decision path konzistentný s diffom, žiadny nevyriešený konflikt |
| **FLAG** | Drobná medzera; doplniť pred merge, ak nie je blokujúce |
| **RETURN** | Chýba odôvodnenie alebo path nesedí s diffom — Builder doplní |
| **STOP** | Porušenie constitution (duplicita, nová dep bez alternatív, konflikt s canonical ADR) |

Judge **neauto-schvaľuje** konflikty — pri `Contradiction check: flag` platí
[`brain/ENGINE.md` §21](../../brain/ENGINE.md): zachovať oba zdroje, zastaviť
dependent update, founder rozhodne.

---

## Decision Memory — ingest (jeden graf, žiadny paralelný log)

| Vrstva | Úloha | Kanonický zdroj |
|--------|-------|-----------------|
| **Organizational / Decision Memory** | Historické a kódové rozhodnutia | `memory/decisions.md` |
| **Brain projection** | Strojovo čitateľný index (non-canonical) | `brain/decisions/index.json` |
| **Registry pointer** | Odkaz na governance + capability tag | `brain/registry/index.json` → `governance.engineering-constitution` |

### Ako Builder zapíše odôvodnenie

1. **Bežný PR (odporúčané):** vlož blok „Engineering justification" do PR popisu;
   po merge (alebo pri väčšom rozhodnutí pred merge) skopíruj do `memory/decisions.md`:

```markdown
## [YYYY-MM-DD] - Engineering justification: [názov] — BUILD

- **Trigger:** …
- **Decision path:** …
- **Alternatives considered:** …
- **Why not reuse:** …
- **Expected outcome:** …
- **Related paths:** …
- **Contradiction check:** none | flag — …
- **PR / vetva:** #NNN · `branch-name`
```

2. **Strategické / opakované vzory:** po schválení pridaj záznam do
   `brain/src/catalog.ts` → `DECISION_SPECS` (s `relatedAssets`:
   `["governance.engineering-constitution"]`) a spusti `npm run brain:ingest`.

3. **NIKDY:** samostatný JSON/MD log mimo `memory/decisions.md` a schválenej
   brain projekcie.

### Record type a polia (brain schema)

- **Typ v registry:** `governance` (`governance.engineering-constitution`)
- **Capability tag:** `engineering-justification` (filtrovanie v registry)
- **Decision projection:** existujúci `DecisionRecord` v `brain/src/schema.ts`
  — polia `problem`, `choice`, `rationale`, `alternatives`, `relatedAssets`;
  mapovanie z justification bloku:
  - `problem` ← Trigger + prečo reuse nestačil
  - `choice` ← Decision path + čo bolo pridané
  - `rationale` ← Why not reuse + Expected outcome
  - `alternatives` ← Alternatives considered
  - `relatedAssets` ← `governance.engineering-constitution` + cesty

Kategória `engineering-justification` sa vyjadruje **prefixom nadpisu** v
`memory/decisions.md` a **`relatedAssets`**, nie samostatným paralelným indexom.

### Contradiction protocol

Rovnaký ako Organizational Memory / Brain Engine §21:

1. Nové odôvodnenie nesmie potichu prepísať starší záznam.
2. Pri kolízii s ADR, `memory/decisions.md` alebo `.cursor/rules` →
   `Contradiction check: flag` + STOP až do founder rozhodnutia.
3. Po rozhodnutí: `supersedes` v decision zázname, nie vymazanie histórie.

### Regenerácia projekcie

```powershell
npm run brain:ingest
npm run brain:check
```

Ingest allowlist a bezpečnosť: [`memory-engine-runbook.md`](memory-engine-runbook.md).

---

## Väzba na existujúci stack

| Dokument | Vzťah |
|----------|-------|
| `revolis-constitution-v2.md` | Biznis GO/BACKLOG pred stavaním |
| `engineering-os-revolis-rightsized.md` | Right-sized Engineering OS; L3 ADR = Decision Memory |
| `architecture.mdc` | Tenancy, reuse lead pipeline, registry REUSE/EXTEND |
| `l99-engineering-constitution.mdc` | Stručná agent policy → tento dokument |
| Kontrolór skill | Judge enforcement (bod 11) |

---

## Príklad (skrátený)

**Trigger:** nový helper `formatGuardianStaleLabel.ts`

**Decision path:** `reuse` — logika už v `apps/crm/src/lib/guardian/rules.ts`;
PR len extrahuje existujúci string formát, žiadny nový modul.

Ak by helper bol tretí duplicate formátovania dátumov → **RETURN**: path musí byť
`reuse` cez existujúci `lib/dates` alebo odôvodniť `new-abstraction` druhým
call-siteom.
