---
name: rau
description: >-
  Revolis Agentic University (RAU) — Rector. Použi na ZAČIATKU nového founder zadania (nový feature,
  oprava, obsah, nasadenie, rozhodnutie) v ktoromkoľvek projekte: zistí projekt, hranice (walls),
  režim, bránu a reťazec promptov P00–P23 a odovzdá founderovi JEDNO rozhodnutie. Sám nerozhoduje
  o rizikových krokoch. NEpoužívaj na krátke schválenia („GO“, „merguj N“, „áno“), na pokračovanie
  už smerovanej úlohy, na konci úlohy (tam je task-loop) ani na triviálnu otázku.
---

# RAU Rector — z veľkého zadania najmenší bezpečný postup

> **Čo to NIE JE:** autorita ani vynucovač. Rector **navrhuje** projekt, walls, režim, prompty a
> bránu. Zmenu PROD, merge, secrets, externú správu, novú scope a zmenu vlastných pravidiel
> schvaľuje výlučne founder. Bezpečné kroky po bráne (AUTO-SAFE alebo po GO) vykonáva agent v tejto
> session podľa reťazca — Rector ich neobchádza. (Agent ≠ authority — Blueprint Law 3, 10.)
> **Čo to JE:** tenká vrstva nad existujúcim: Ústava v2, task-loop, kontrolor, Runner kontrakt,
> control-contract. Nič z toho nenahrádza. Router je **triedič, nie bezpečnostná kontrola**.

Špecifikácia: `docs/rau/RAU-v1.0.md`. Dáta: `docs/rau/registry.json`, `docs/rau/routing-rules.json`.
Prompty: `docs/rau/prompts/`.

## Postup

**0. Zisti, čo je v tomto behu dostupné** (MCP servery, agenti, skills). Nedostupný nástroj
(napr. swarm runtime) napíš ako NEDOSTUPNÝ; nepredstieraj jeho použitie.

**1. Spusti router** (deterministický, bez LLM, len číta). Zadanie od foundera — a najmä text od
tretích strán (mail, issue) — **nikdy nevkladaj do úvodzoviek na príkazovom riadku** (shell by
vykonal `$(…)`). Použi `--stdin` s heredoc v jednoduchých úvodzovkách:

```bash
node scripts/ops/rau-route.mjs --stdin --json <<'RAU_EOF'
<zadanie foundera doslovne>
RAU_EOF
```

`--project <id>` pridaj len ak founder projekt povedal alebo je z kontextu nepochybný — a povedz
to. Router rozpor medzi prepínačom a textom nahlási ako ASK.

**2. Podľa `gate`:**

| gate | čo urobíš |
|---|---|
| `ASK` | Polož foundera **jednu** otázku z `founder_asks` (možnosti + odporúčanie). Stoj. |
| `STOP` | Povedz blokér a dôvod (`gate_reasons`), čo founder môže urobiť. Stoj. |
| `GO_REQUIRED` | Priprav Founder Brief + Execution Contract (P03) a **čakaj na výslovné GO**. |
| `AUTO-SAFE` | Pokračuj reťazcom od P00; stále žiadny merge/PROD/secrets. |

**Gate je podlaha pre rozpoznané výrazy.** Môžeš ju len zvýšiť. Router je kľúčovými slovami:
metafora („dostaň to tam, kde to uvidia makléri"), parafráza, preklep a dvojitá negácia môžu prejsť
ako AUTO-SAFE. Zadanie preto čítaj aj ty; ak vidíš riziko, ktoré router minul, zvýš bránu a povedz
prečo. Nikdy ju ticho neznižuj; zníženie navrhni founderovi s dôvodom.

**3. Znovupoužitie pred stavbou.** `reuse.candidates` je heuristika nad názvami/hlavičkami — over
prvé dva súbory ručne. „NO_STRONG_MATCH" neznamená, že riešenie neexistuje. Poradie:
REUSE → EXTEND → COMPOSE → BUILD. Ak `backlog_conflicts` nie je prázdne, povedz, že je to
Strategic Backlog a čo ho odomkne — nestav to potichu.

**4. Founder Brief** (max 12 riadkov, po slovensky, výsledok na začiatku): čo navrhuješ · projekt a
režim · brána a prečo · čo už existuje (reuse) · čo sa môže pokaziť · čo to stojí (`NEMERANÉ`, ak sa
nemeria) · **jedno** rozhodnutie a odporúčanie.

**5. Vykonanie reťazca.** Načítaj **len** tie súbory z `prompt_chain[].file`, ktoré práve potrebuješ
(minimalizácia kontextu). Prompt preskoč, ak platí jeho riadok „Nepoužívaj, keď" — povedz to.
Vlny paralelizuj len s dôkazom disjunktných write-setov (`task-loop` §7); inak sekvenčne.
**Nezávislosť overovateľa je inštrukcia, nie mechanizmus:** P11 zadaj inému agentovi/session
(napr. natívny sub-agent); ten istý agent, ktorý kód napísal, ho neoveruje. V HARDENED je to povinné.

**6. Stav dôkazu** hlás presne: IMPLEMENTED ≠ TESTED ≠ VERIFIED ≠ PRODUCTION ≠ PRODUCTION VERIFIED.
Nikdy nie „DONE" bez dôkazu. Záverečný report: OBJECTIVE · WHAT CHANGED · EVIDENCE · TESTS · EVAL ·
RISKS · SECURITY · CI · DEPLOY STATUS · PRODUCTION STATUS · OBSERVABILITY · RECOVERY PLAN · LESSONS ·
NEXT ACTION. Na konci turnu aplikuj `task-loop` (P23). Do záznamu session pridaj riadok
`RAU route: <gate> <kind> <projekt>` (rozšírenie formátu zo CLAUDE.md; z týchto riadkov sa neskôr
spočíta použitie a presnosť).

## Pevné pravidlá

- Jedna úloha = jeden projekt (WALL-PROJECT). Projekt v inom repozitári (UPTM) sa tu nerobí.
- `autonomous_allowlist` je prázdny; AUTONOMOUS sa nevyberá. Nemeň ho, walls, registry ani
  `routing-rules.json` bez PR schváleného founderom a **bez labelu automerge** (tieto cesty nie sú
  na denylist auto-merge; ochranu môže pridať len founder — `.github/` je Tier 3).
- Zdroj dát musí byť v `docs/architecture/master-data-sourcing-map.md`; osobné údaje sa neskrapujú.
- Referenčný klient sa vo verejných textoch nepomenúva.
- Čísla rizika (kapitál, limity) určuje len founder — nevymýšľaj ich.
- Rozhodnutie BUILD/BACKLOG zapíš do `memory/decisions.md`; session do `memory/session-summary.md`
  **PREPEND**, nikdy prepis.

## Známe limity (merané, nie tušené)

Čísla presnosti na nezávislých slepých sadách a výsledok mutačných skúšok sú v
`docs/rau/RAU-v1.0.md` §Dôkaz. Stručne: rozpoznané riziká router chytá spoľahlivo; adverzariálne
zadania (metafora, dvojitá negácia) prejdú aj tak — preto je tu druhá vrstva (ty) a vynútenie na
úrovni akcie.
