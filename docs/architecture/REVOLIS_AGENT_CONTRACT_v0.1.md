---
id: REVOLIS_AGENT_CONTRACT_v0.1
type: contract
status: experiment
owner: founder
created_at: 2026-09-16T22:30:00+02:00
extends:
  - .ai/bus/README.md
  - .ai/bus/AGENT_PROTOCOL.md
  - .ai/bus/message.schema.md
  - docs/prompts/runner/07-worker-contract.md
gate0_question: "Can the protocol eliminate Founder-as-BUS?"
---

# REVOLIS AGENT CONTRACT v0.1

**Cieľová cesta:** `docs/architecture/REVOLIS_AGENT_CONTRACT_v0.1.md`

Tento kontrakt je **protokolový experiment pre Gate 0**, nie architektúra.
Nepridáva runtime, `.mjs`, pamäťový systém, router ani MCP adaptér. Rozširuje
existujúci bus v0.1 (`.ai/bus/`) o šesť pravidiel. Kde je v rozpore s bus v0.1,
platí tento kontrakt, ale iba pre artefakty s `contract: REVOLIS_AGENT_CONTRACT_v0.1`.

Transport zostáva git: artefakt existuje až vtedy, keď je dosiahnuteľný
z `base.ref`. Chat nie je transport.

---

## §1 Agent Contract — roly a oprávnenia

Rola sa viaže na **artefakt**, nie na model. Tabuľka je hranica, nie odporúčanie.

| rola | typický držiteľ | smie emitovať | nesmie |
|---|---|---|---|
| `founder` | Andy | `DECISION`, všetko ostatné | — |
| `orchestrator` | Claude (Kontrolór) | `FINDING` `PROPOSAL` `EVIDENCE` `ACTION`¹, handoff, prepis `DECISION` od foundera² | vlastné `DECISION` |
| `executor` | Claude, Cursor | `FINDING` `PROPOSAL` `EVIDENCE` `ACTION`¹ | `DECISION`, zápis mimo `write_set` |
| `synthesizer` | ChatGPT | `FINDING` `PROPOSAL` (syntéza **po** nezávislých výstupoch) | `DECISION`, `ACTION` |
| `challenger` | Grok | `FINDING` `PROPOSAL` `EVIDENCE` | `DECISION`, `ACTION`, zápis do `tasks/` a `decisions/` |

¹ `ACTION` iba s `side_effects: none | repo_local` vo vlastnom `write_set`. Čokoľvek iné
potrebuje `authorized_by: <DEC id>`.
² Prepis je platný iba s `source` (§4). Bez neho ide o `PROPOSAL`.

---

## §2 Typed output — päť druhov položiek

Každý výstup agenta je markdown súbor v `.ai/bus/outbox/` a jeho front matter má
zoznam `items:`. **Položka bez `kind` z tejto množiny je neplatná.**

```yaml
items:
  - id: E1
    kind: EVIDENCE
    cmd: "git show <sha>:<path> | grep -n ..."   # alebo
    file: "<path>@<sha>:<line>"
    result: "doslovný výstup alebo jeho presná časť"
  - id: F1
    kind: FINDING
    claim: "jedna overiteľná veta"
    evidence: [E1]                                 # povinné, ≥1
  - id: P1
    kind: PROPOSAL
    proposal: "jedna konkrétna zmena alebo krok"
    based_on: [F1]
    gate: AUTO-SAFE | GO REQUIRED | STOP
    requires_decision: true | false
  - id: A1
    kind: ACTION
    action: "čo sa vykonalo"
    side_effects: none | repo_local | external | production
    authorized_by: null | DEC-...                  # povinné ak external/production
    evidence: [E2]
  - id: D1
    kind: DECISION
    decided_by: founder                            # jediná povolená hodnota
    decides: P1
    source: "<artifact path>" | "chat:<ISO date>: \"<doslovná citácia>\""
```

---

## §3 Claim / Evidence semantics

1. `FINDING` je tvrdenie. Bez `evidence` ide o **hypotézu** a patrí do `PROPOSAL`
   (napr. „overiť, či ...").
2. `EVIDENCE` musí byť reprodukovateľné: `cmd` alebo `file@sha:line`. Parafráza nestačí.
3. Tvrdenie o externom systéme (prod DB, GitHub PR stav, Vercel) je `FINDING` iba vtedy,
   keď `EVIDENCE.cmd` naozaj bežal proti tomu systému. Inak je to `UNKNOWN` a patrí
   do `PROPOSAL` s gate.
4. Stav v task karte **nie je** dôkaz o stave repa. Karta je tvrdenie z času `created_at`.

---

## §4 Human Decision Gate

1. `DECISION` smie vzniknúť iba s `decided_by: founder` a `source`.
2. `source` je buď artefakt, ktorý founder napísal alebo podpísal, alebo doslovná
   citácia z chatu s dátumom. Agent smie prepísať founderove rozhodnutie do
   `.ai/bus/decisions/`, ale nesmie ho parafrázovať ani rozšíriť.
3. Súbor v `decisions/` bez `decided_by: founder` + `source` **nie je rozhodnutie**,
   je to `PROPOSAL`. (Príklad existujúcej nejednoznačnosti:
   `DEC-20260825-002` = „agent recommendation, not yet founder-signed".)
4. `PROPOSAL` s `gate: GO REQUIRED` sa nevykoná, kým neexistuje `DECISION`, ktorý naň
   ukazuje cez `decides`.
5. Founder rozhoduje **v artefakte alebo jednou vetou v chate**. Kontext ku
   rozhodnutiu mu agent ukáže odkazom, nie tým, že ho founder prenesie.

---

## §5 Handoff schema

Handoff je jediný vstup agenta. Je v `.ai/bus/inbox/`, `type: handoff`.

```yaml
---
id: MSG-YYYYMMDD-NNN-handoff-<slug>
type: handoff
contract: REVOLIS_AGENT_CONTRACT_v0.1
status: open
from: <rola>
to: [<rola>, ...]
created_at: <ISO>
base:
  repo: onlinovosk-bit/RealitkaAI
  ref: <commit sha>              # všetky refs sa čítajú z tohto commitu
task:
  ref: .ai/bus/tasks/<TASK>.md
  objective: "jedna veta: čo má výstup rozhodnúť alebo umožniť"
refs:                            # úplný kontext; nič mimo nich + súbory, ktoré citujú
  context: [<path>, ...]
  decisions: [<path>, ...]       # predchádzajúce rozhodnutia (DEC, memory/decisions.md#anchor)
  prior_outputs: [<path>, ...]
expected_output:
  path: .ai/bus/outbox/MSG-YYYYMMDD-NNN-<role>-<slug>.md   # {role} sa dosadí
  kinds_allowed_by_role: { <rola>: [<kind>, ...] }
  must_answer: ["otázka 1", ...]
constraints:
  write_set: [<expected_output.path>]
  forbidden: [prod_write, push, pr, merge, external_comms, read_other_role_outputs_before_own]
independent_first: true
decision_owner: founder
---
```

Výstup agenta musí mať v front matter:

```yaml
contract: REVOLIS_AGENT_CONTRACT_v0.1
in_reply_to: <handoff id>
role: <rola>
agent: <kto naozaj bežal, bez prikrášlenia>
resolution:                      # kritérium Gate 0 č. 2
  task: <path>
  objective: <vlastnými slovami, 1 veta>
  context_read: [<path>, ...]
  prior_decisions: [<path alebo anchor>, ...]
  expected_output: <path>
context_requests: []             # neprázdne = protokol zlyhal pre tohto agenta
inputs_read: [<path>, ...]       # pre independent-first
items: [...]
```

---

## §6 Independent-first

1. Každá rola, ktorá hodnotí (`executor`, `challenger`, `synthesizer`), napíše svoj
   výstup **iba z `refs`** skôr, než prečíta výstup inej roly k tomu istému handoffu.
2. `inputs_read` musí byť podmnožina `refs` ∪ súbory, na ktoré `refs` odkazujú ∪ repo pri `base.ref`.
   Cesta k výstupu inej roly v `inputs_read` = porušenie.
3. `synthesizer` beží až **po** tom, čo existujú všetky nezávislé výstupy. Jeho výstup
   musí citovať položky ostatných (`based_on: [<file>#<item id>]`).
4. Nezhoda medzi rolami je `FINDING`, nie chyba. Rozhoduje founder (§4).

---

## Gate 0 — kritériá úspechu (experiment)

| # | kritérium | ako sa meria |
|---|---|---|
| G0-1 | Founder ani raz ručne neprenesie kontext, ktorý už je v artefakte | počet founder správ s prenesením kontextu počas behu = 0 |
| G0-2 | Každý agent vyrieši task, kontext, predchádzajúce rozhodnutia a očakávaný výstup iba z refs | `resolution` úplné, všetky cesty existujú pri `base.ref`, `context_requests: []` |
| G0-3 | Každý výstup je typovaný | každá položka má `kind` ∈ {FINDING, PROPOSAL, DECISION, ACTION, EVIDENCE} |
| G0-4 | Grok (challenger) môže namietať a navrhovať, nie rozhodovať | challenger výstup nemá `DECISION` ani `ACTION`; validátor odmietne `DECISION` s `decided_by ≠ founder` |
| G0-5 | Human Decision Gate zostáva explicitný | žiadny `GO REQUIRED` krok nie je vykonaný bez `DECISION` |

Zlyhanie protokolu je **nález**, nie dôvod zastaviť Track B.

## Mimo scope v0.1

Runtime validátor, control plane, message queue, registry, MCP adaptéry,
Learning Router, nový pamäťový systém. O kodifikácii validátora sa rozhodne až
po Gate 0 (founder `DECISION`).
