# 06 — DISPATCH

Najčastejšia chyba celej tejto architektúry sa robí presne tu.

---

## Čo robí skript a čo robí model

```
DETERMINISTICKÉ  → skript
  git worktree add, npm ci, generovanie PROMPT.md, čakanie na workerov,
  kontrola územia, integračný merge, push, gh pr create, zámky, ledger

INTELIGENTNÉ     → agent
  „oprav typovú chybu v tomto jednom súbore bez as any"
```

Pravidlo: **čo sa dá overiť príkazom, nerobí model.**

## Jedna agentná session nie je tri

> „Nechaj orchestrátora, aby si sám vytvoril tie tri worktrees a workerov."

Toto nefunguje a je to jediný dôvod, prečo tento súbor existuje.

**Cursor agent session je jeden agent.** Vie otvoriť tri terminály, ale nie tri
agentné kontexty, ktoré samy premýšľajú nad kódom. Keď dostane takýto pokyn,
urobí tri worktrees a opraví v nich tri súbory **po sebe**, a nazve to
paralelným behom.

Skutočný paralelizmus vzniká tak, že orchestrátor pripraví tri worktrees
a **tri samostatné agentné okná** dostanú každé svoj `PROMPT.md`. Tri procesy,
tri kontexty, tri stromy.

```
Ak sa v ktoromkoľvek kroku zdá, že agent má orchestrovať, krok je zle napísaný.
```

---

## Ruflo Swarm

Ruflo je **execution substrate, nie zdroj pravdy.** Zdrojom pravdy je stav
repozitára a ledger.

```
1. over runtime príkazom
2. neoveriteľný runtime -> nevymýšľaj API -> použi tc-orchestrator.mjs
                          alebo označ uzol BLOCKED "ruflo_runtime_unverified"
3. verzia sa pripína, nikdy `latest` (rozlišuje sa na alfa)
4. použitá verzia ide do ledgeru
```

Swarm dostane **iba aktuálnu vlnu.** Nikdy uzly z budúcich vĺn, ani „na
prípravu". Vlna je jednotka overenia; uzol z budúcej vlny nemá platný BASE_SHA.

Každý agent vo swarme má:

```
unique agent_id · unique task_id · unique write territory
explicit acceptance · explicit validation · explicit completion signal
```

Ak ktorékoľvek z tých šiestich chýba, agent sa nespúšťa.

---

## Čo dostane worker do rúk

```
worktree              vlastný, z BASE_SHA, na vlastnej vetve fix/<slug>
PROMPT.md             sedem vrstiev, vygenerované, needitované
node_modules          po npm ci, vlastné
.git/info/exclude     PROMPT.md a .done.json, aby neskončili v commite
```

Nič iné. Žiadne credentials, žiadny `.env`, žiadny prístup k iným worktrees.

---

## Completion signal

Worker skončí zápisom `.done.json` do koreňa svojho worktree.

```
UTF-8 BEZ BOM. BOM rozbije JSON.parse na strane orchestrátora.
```

Toto nie je teoretická poznámka — `ef bb bf` v tomto súbore ukázal 16. 9. 2026
hotového workera ako chybného a stálo to hodinu hľadania.

Orchestrátor číta marker s odstránením BOM aj tak. Obe strany sú opatrné,
lebo jedna strana nestačila.

---

## Rozdelenie práce pri zlyhaní jedného workera

```
BLOCKED worker    jeho uzol vypadne z vlny, dôvod sa zapíše
                  ostatní pokračujú
celá vlna padá    iba pri zlyhaní write-probe alebo merge konfliktu
```

Nestrhávaj vlnu kvôli jednému uzlu. Práca ostatných je platná a overená
samostatne.
