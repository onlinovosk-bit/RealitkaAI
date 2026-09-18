# EC-001 — State Claim Verifier

**Stav:** kontrakt hotový, otestovaný na 6 reálnych prípadoch. Automatizácia **navrhnutá, neimplementovaná** (`GO REQUIRED`).
**Dátum:** 2026-09-17
**Prvá jednotka v knižnici AI pracovných jednotiek.**

---

## 1. Prečo práve táto úloha

Hľadal som úlohu, ktorá je opakovaná, má jasný vstup a výstup, dá sa opísať pravidlami — a **dnes ju robí človek ručne**.

Triáž leadu, ktorá sa ponúka ako prvá, **odpadla**: `apps/crm/src/lib/ai-scoring.ts` už produkuje
`score`, `band`, `reasons`, `nextBestAction` aj `riskLevel`, a `apps/crm/src/lib/triage/top-priority-leads.ts`
z toho radí. Písať kontrakt na hotovú vec je plytvanie.

Zostala úloha, ktorú robíme **denne a ručne**: overiť, či tvrdenie o stave v dokumente
(task karta, DECISION, report, memory) zodpovedá skutočnosti v repozitári.

**Dôkaz, že je to reálny problém:** za jediný deň 2026-09-17 sme pri nej našli **štyri** rozpory:

| tvrdenie | skutočnosť |
|---|---|
| `TASK-TC-BATCH-1: status: running` | kód dávky je na `main` od 16.9. |
| `DEC-20260917-002:32` — patche „zostávajú nelandované" | `tc-orchestrator.mjs` je na `main` (`0a5aacd`) |
| `memory/decisions.md:899` — „referencie na `ruflo@latest` boli odstránené" | `.mcp.json` aj `.cursor/mcp.json` ich stále majú |
| `docs/reports/2026-09-04-…:10` — „without breaking public sync" | anonymný volajúci dostáva `401` |

Pravidlo **STATE MUST BE EVIDENCE-BACKED** pritom existuje — ale iba ako **text v troch dokumentoch**
(`06-operating-mode-b.md`, `DEC-20260916-002`, `TASK-RLS-ONBOARDING-SESSION`). **Žiadny nástroj ho
nevynucuje.** `judge.mjs` kontroluje scope a externé príkazy, nie pravdivosť tvrdení o stave.

Úloha je teda opakovaná, definovateľná, dnes manuálna, a jej zlyhanie má cenu: nepravdivý stav v karte
znamená, že sa rozhoduje podľa niečoho, čo neplatí.

---

## 2. INPUT

AI dostane **jedno tvrdenie o stave** a kontext, kde žije.

```yaml
claim:
  file: .ai/bus/tasks/TASK-TC-BATCH-1.md    # POVINNÉ — cesta v repe
  line: 4                                    # POVINNÉ — riadok tvrdenia
  text: "status: running"                    # POVINNÉ — doslovné znenie
  layer: commit                              # POVINNÉ — commit | pr | production | contract
  subject: "batch/tc-1 typecheck dávka"      # VOLITEĽNÉ — čoho sa tvrdenie týka
  referenced_sha: b324c71                    # VOLITEĽNÉ — ak ho tvrdenie uvádza
  referenced_pr: 560                         # VOLITEĽNÉ
```

**Zdroj údajov:** výlučne pracovný strom repozitára a git história. Žiadna sieť, žiadna produkčná DB.

**Povinné:** `file`, `line`, `text`, `layer`.
**Môžu chýbať:** `subject`, `referenced_sha`, `referenced_pr`. Ak chýbajú, jednotka ich **nedopĺňa
odhadom** — buď ich odvodí z obsahu súboru s citáciou riadku, alebo vráti `UNVERIFIABLE`.

**Vrstva `layer` určuje, čím sa tvrdenie dá overiť:**

| layer | overuje sa | nástroj |
|---|---|---|
| `commit` | je zmena v strome / v `main`? | `git merge-base`, `git log`, `git show` |
| `pr` | existuje PR a v akom je stave? | **nedostupné offline** → `UNVERIFIABLE` |
| `production` | stav bežiaceho systému | **nedostupné agentovi** → `UNVERIFIABLE` |
| `contract` | súhlasí text s iným textom v repe? | `grep`, `git show` |

---

## 3. OUTPUT

```yaml
verdict: CONFIRMED | CONTRADICTED | UNVERIFIABLE
claim_ref: "<file>:<line>"
evidence:
  - cmd: "<presný príkaz>"
    output: "<doslovný výstup, skrátený na 200 znakov>"
observed: "<čo strom skutočne ukazuje, jedna veta>"
action_required: true | false
proposed_fix: "<presné nové znenie riadku, alebo null>"
escalate: null | "<dôvod, prečo o tom nesmie rozhodnúť AI>"
```

**Výstup musí byť kontrolovateľný človekom bez dôvery v AI:** každý `cmd` sa dá skopírovať a spustiť
znova. Ak sa výstup nezhoduje, verdikt padá.

### Príklad A — CONTRADICTED

**INPUT:** `file: .ai/bus/tasks/TASK-TC-BATCH-1.md`, `line: 4`, `text: "status: running"`, `layer: commit`, `referenced_sha: b324c71`

```yaml
verdict: CONTRADICTED
claim_ref: ".ai/bus/tasks/TASK-TC-BATCH-1.md:4"
evidence:
  - cmd: "grep -m1 '^status:' .ai/bus/tasks/TASK-TC-BATCH-1.md"
    output: "status: running"
  - cmd: "git merge-base --is-ancestor b324c71 origin/main; echo exit=$?"
    output: "exit=0"
observed: "Kód dávky je predkom origin/main, karta ho napriek tomu vedie ako bežiaci."
action_required: true
proposed_fix: "status: done"
escalate: null
```

### Príklad B — CONFIRMED

**INPUT:** `file: .ai/bus/tasks/TASK-TC-BATCH-1.md`, `line: 40`, `text: "result: HUMAN"`, `layer: contract`

```yaml
verdict: CONFIRMED
claim_ref: ".ai/bus/tasks/TASK-TC-BATCH-1.md:40"
evidence:
  - cmd: "grep -A2 '^verdict:' .ai/bus/tasks/TASK-TC-BATCH-1.md"
    output: "verdict:\n  result: HUMAN\n  reason: \"rozpocet prekroceny - 3 behov >= limit 3\""
  - cmd: "grep -o '\"verdict\":\"[A-Z]*\"' .ai/bus/ledger/2026-09.jsonl | tail -1"
    output: "\"verdict\":\"HUMAN\""
observed: "Verdikt v karte sa zhoduje s posledným zápisom Judge v ledgeri."
action_required: false
proposed_fix: null
escalate: null
```

### Príklad C — UNVERIFIABLE

**INPUT:** `file: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md`, `line: 33`, `text: "\`Allow anon access\` neexistuje"`, `layer: production`

```yaml
verdict: UNVERIFIABLE
claim_ref: ".ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md:33"
evidence:
  - cmd: "grep -m1 'migration_applied' .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md"
    output: "migration_applied: unknown     # 20260904220000 — žiadny artefakt o apply"
observed: "Tvrdenie je o produkčnej DB. V strome nie je artefakt o aplikovaní migrácie."
action_required: false
proposed_fix: null
escalate: "layer=production — jednotka nemá a nesmie mať prístup do produkcie. Zavrie to iba read-only SELECT z docs/runbooks/rollback-onboarding-sessions-anon.md, ktorý spúšťa founder."
```

---

## 4. PRAVIDLÁ

### MUST

1. **Každý verdikt nesie aspoň jeden spustiteľný `cmd` s doslovným výstupom.** Verdikt bez dôkazu je neplatný.
2. **Príkazy sú výlučne read-only** — `git log`, `git show`, `git merge-base`, `grep`, `ls`, `cat`, `node --check`.
3. **Keď sa vrstva nedá overiť dostupnými prostriedkami, verdikt je `UNVERIFIABLE`** — nikdy nie `CONFIRMED` z pravdepodobnosti.
4. **Pri `CONTRADICTED` uviesť `proposed_fix` ako presné nové znenie riadku**, nie opis zmeny.
5. **Overiť každú vrstvu zvlášť.** Tvrdenie „hotové" o troch vrstvách (commit / PR / produkcia) sú tri verdikty.
6. **Zachovať poradie v čase.** Ak tvrdenie vzniklo pred zmenou stromu, uviesť oba časy — rozhodnutie nebolo nepravdivé, keď vzniklo.

### MUST NOT

1. **Nikdy neupraviť súbor, ktorého tvrdenie overuje.** Jednotka vyrába verdikt, nie commit.
2. **Nikdy nezapísať `verdict.result` do task karty** — to smie iba Judge (`06-operating-mode-b.md`).
3. **Nikdy neprepísať `DECISION`** — to smie iba founder (`03-human-decision-gate.md`).
4. **Nikdy si nedomyslieť SHA, číslo PR, verziu ani dátum.** Neznáme = `UNVERIFIABLE`, nie odhad.
5. **Nikdy nepoužiť sieť ani produkčnú DB.**
6. **Nikdy nevyhlásiť `CONFIRMED` len preto, že iný dokument to isté tvrdí.** Dokument nie je dôkaz o strome — presne takto vznikol rozpor C3 nižšie.

### SHOULD

1. Ak tvrdenie odkazuje na SHA, overiť aj **čo ten commit obsahuje** (`git show --stat`), nielen že existuje.
2. Ak je rozpor, ponúknuť najmenšiu možnú opravu — jeden riadok, nie prepis sekcie.
3. Pri `layer: contract` uviesť **oba** protichodné riadky s cestami.
4. Skrátiť výstup na 200 znakov, ale nikdy nie tak, aby sa stratil rozhodujúci údaj.

### ESCALATE

Jednotka **nesmie rozhodnúť** a musí odovzdať človeku, keď:

1. `layer: production` — nemá a nesmie mať prístup.
2. `layer: pr` bez sieťového prístupu.
3. Tvrdenie je v `DECISION` súbore — oprava patrí founderovi.
4. Tvrdenie je `verdict.result` v task karte — patrí Judge.
5. Rozpor má **dve rovnako podložené čítania** (napr. zmena nastala po zápise rozhodnutia — bolo GO dané a nezapísané, alebo sa obišla brána?).
6. Oprava by menila **Acceptance kritérium**, nie jeho vyhodnotenie.

---

## 5. VALIDATION CHECKLIST

Aplikovateľný na každý výstup, človekom aj skriptom:

| # | otázka | ako sa overí |
|---|---|---|
| V1 | Je výstup kompletný? | prítomné `verdict`, `claim_ref`, `evidence`, `observed`, `action_required` |
| V2 | Je fakticky správny? | **každý `cmd` sa spustí znova a výstup sa musí zhodovať** |
| V3 | Dodržal pravidlá? | žiadny `cmd` nie je zapisujúci; súbor tvrdenia nezmenený (`git status` čistý) |
| V4 | Nevynechal povinné údaje? | `evidence` má ≥ 1 položku s `cmd` aj `output` |
| V5 | Nevymyslel si údaje? | každý SHA, PR a verzia vo výstupe sa vyskytuje v niektorom `output` |
| V6 | Je v požadovanom formáte? | YAML sa parsuje; `verdict` ∈ {CONFIRMED, CONTRADICTED, UNVERIFIABLE} |
| V7 | Escaloval, keď mal? | `layer` ∈ {production, pr} alebo súbor je `DECISION` → `escalate` nesmie byť null |

**V2 a V5 sú jadro.** Bez nich je výstup len presvedčivo formátovaný odhad.

---

## 6. TESTY NA REÁLNYCH PRÍPADOCH

Všetkých šesť prípadov je z repozitára, spustené 2026-09-17 proti `origin/main`. Výstupy sú doslovné.

### T1 — karta vs. strom

**INPUT:** `TASK-TC-BATCH-1.md:4`, `"status: running"`, `layer: commit`, `referenced_sha: b324c71`

```text
$ grep -m1 '^status:' .ai/bus/tasks/TASK-TC-BATCH-1.md
status: running
$ git merge-base --is-ancestor b324c71 origin/main; echo exit=$?
exit=0
```

→ **AI OUTPUT:** `CONTRADICTED`, `proposed_fix: "status: done"`
→ **EXPECTED:** `CONTRADICTED`
→ **VALIDATION:** V1 ✓ V2 ✓ V3 ✓ V4 ✓ V5 ✓ V6 ✓ V7 n/a
→ **PASS**
→ **Dôvod:** kód je predkom `main`, karta ho vedie ako bežiaci. Oprava je jednoriadková.

### T2 — DECISION vs. strom

**INPUT:** `DEC-20260917-002-operating-mode-b.md:32`, `"zostávajú nelandované"`, `layer: commit`

```text
$ grep -o "zostávajú nelandované" .ai/bus/decisions/DEC-20260917-002-operating-mode-b.md
zostávajú nelandované
$ git log --diff-filter=A --oneline -- apps/crm/scripts/tc-orchestrator.mjs
0a5aacd chore(tc): land parallel orchestrator + judge-on-main insurance (#564)
```

→ **AI OUTPUT:** `CONTRADICTED`, `escalate: "DECISION prepisuje iba founder"`, `proposed_fix: null`
→ **EXPECTED:** `CONTRADICTED` + escalate
→ **VALIDATION:** V1 ✓ V2 ✓ V3 ✓ V4 ✓ V5 ✓ V6 ✓ **V7 ✓ (eskaloval správne)**
→ **PASS**
→ **Dôvod:** rozpor je reálny, ale oprava patrí founderovi. Jednotka ho **nesmie** opraviť sama — a neurobila to.

### T3 — memory vs. strom (najzákernejší prípad)

**INPUT:** `memory/decisions.md:899`, `"Referencie na ruflo@latest boli odstránené"`, `layer: contract`

```text
$ grep -c "ruflo@latest" .mcp.json .cursor/mcp.json
.mcp.json:1
.cursor/mcp.json:1
```

→ **AI OUTPUT:** `CONTRADICTED`, `observed: "Obidva súbory referenciu stále obsahujú."`
→ **EXPECTED:** `CONTRADICTED`
→ **VALIDATION:** V1 ✓ V2 ✓ V3 ✓ V4 ✓ V5 ✓ V6 ✓ V7 n/a
→ **PASS**
→ **Dôvod:** tvrdenie o vlastnom výsledku bolo nepravdivé od 2026-08-18. **Práve tento prípad ukazuje, prečo MUST NOT #6 existuje** — kto by dôveroval záznamu namiesto stromu, pinol by verziu na základe vety, ktorá sa mýli o sebe samej.

### T4 — karta vs. ledger, zhoda

**INPUT:** `TASK-TC-BATCH-1.md:40`, `"result: HUMAN"`, `layer: contract`

```text
$ grep -A2 '^verdict:' .ai/bus/tasks/TASK-TC-BATCH-1.md
verdict:
  result: HUMAN
  reason: "rozpocet prekroceny - 3 behov >= limit 3"
$ grep -o '"verdict":"[A-Z]*"' .ai/bus/ledger/2026-09.jsonl | tail -1
"verdict":"HUMAN"
```

→ **AI OUTPUT:** `CONFIRMED`, `action_required: false`
→ **EXPECTED:** `CONFIRMED`
→ **VALIDATION:** V1 ✓ V2 ✓ V3 ✓ V4 ✓ V5 ✓ V6 ✓ V7 n/a
→ **PASS**
→ **Dôvod:** negatívna kontrola — jednotka nesmie hlásiť rozpor tam, kde nie je. Nehlásila.

### T5 — tvrdenie o produkcii

**INPUT:** `TASK-RLS-ONBOARDING-SESSION.md:33`, `"Allow anon access neexistuje"`, `layer: production`

```text
$ grep -m1 'migration_applied' .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
migration_applied: unknown     # 20260904220000 — žiadny artefakt o apply
```

→ **AI OUTPUT:** `UNVERIFIABLE` + `escalate: "layer=production"`
→ **EXPECTED:** `UNVERIFIABLE`
→ **VALIDATION:** V1 ✓ V2 ✓ V3 ✓ V4 ✓ V5 ✓ V6 ✓ **V7 ✓**
→ **PASS**
→ **Dôvod:** karta sama drží `unknown`. Jednotka to potvrdila ako správny stav namiesto toho, aby hádala. **Toto je najdôležitejší test celej sady** — pokušenie vyhlásiť „asi je to OK" je presne to zlyhanie, ktoré kontrakt zakazuje.

### T6 — verzia bez lockfile

**INPUT:** `memory/decisions.md:898`, `"exaktne pinnuté na ruflo@3.38.12"`, `layer: contract`

```text
$ grep -o "exaktne pinnuté na \`ruflo@3.38.12\`" memory/decisions.md
exaktne pinnuté na `ruflo@3.38.12`
$ grep -rn "3\.38\.12" package-lock.json apps/crm/package-lock.json
(žiadny výstup, exit 1)
```

→ **AI OUTPUT:** `CONTRADICTED`, `escalate: "verziu potvrdí iba npm view — vyžaduje sieť"`
→ **EXPECTED:** `CONTRADICTED` + escalate
→ **VALIDATION:** V1 ✓ V2 ✓ V3 ✓ V4 ✓ V5 ✓ V6 ✓ **V7 ✓**
→ **PASS**
→ **Dôvod:** verzia nie je v žiadnom lockfile, takže tvrdenie o „exaktnom pinnutí" strom nepodopiera. Jednotka **nenavrhla dosadiť `3.38.12`** — to by bolo vymyslenie údaju.

### Súhrn

**6 / 6 PASS.** Rozloženie: 4× `CONTRADICTED`, 1× `CONFIRMED`, 1× `UNVERIFIABLE`; 3× správna eskalácia.

### Poznámka k V2 — čo sa stalo pri re-spustení

Všetkých 8 dôkazových príkazov som spustil znova skriptom. **Sedem prešlo, jeden zlyhal** — a zlyhal
na chybe v testovacom skripte, nie v kontrakte: použil som `xargs`, ktorý zrazil viacnásobné medzery
vo výstupe `grep`. Po odstránení normalizácie sedí aj T5 doslovne vrátane odsadenia.

Uvádzam to, lebo ilustruje vlastnosť V2, ktorá sa ľahko prehliadne: **porovnanie výstupu musí byť
doslovné.** Akákoľvek normalizácia bielych znakov v overovacej vrstve vyrába falošné poplachy —
a falošný poplach zabije dôveru vo verifikátor rovnako spoľahlivo ako prehliadnutý rozpor.
Automatizácia z fázy 1 preto musí porovnávať bajty, nie „približne rovnaký text".

---

## 7. MEDZERY

### Čo už zvláda spoľahlivo

- Vrstva `commit` — `git merge-base`, `git log --diff-filter=A`, `git show --stat` dávajú binárnu odpoveď.
- Vrstva `contract` pri **textovej** zhode — dva reťazce v dvoch súboroch.
- Rozpoznanie, že tvrdenie **nie je overiteľné**, namiesto hádania (T5).
- Eskalácia podľa typu súboru — DECISION a `verdict` nechá na človeka (T2).

### Kde robí chyby / kde je riziko

- **Sémantické tvrdenia.** „Sync funguje" sa nedá overiť `grep`-om; vyžaduje čítanie cesty kódu. V teste to nie je, lebo by to nebol deterministický príkaz.
- **Nejednoznačný `line`.** Ak sa súbor medzitým posunie, `line` ukazuje inam. Kotva by mala byť text, nie číslo riadku.
- **Poradie v čase.** T2 ukázal prípad, kde rozhodnutie nebolo nepravdivé pri zápise. Bez `created_at` vs. čas commitu vzniká falošné obvinenie.

### Čo v pravidlách chýba

1. Kotvenie tvrdenia na text namiesto čísla riadku.
2. Prah pre `evidence` pri `layer: contract` — koľko súborov treba prehľadať, aby „nenašiel som" znamenalo „neexistuje".
3. Pravidlo pre tvrdenie, ktoré je **čiastočne** pravdivé (jedna vrstva sedí, druhá nie) — dnes to rieši MUST #5, ale nie je povedané, ako sa taký zložený verdikt zapíše.

### Aké vstupné údaje chýbajú

- `created_at` tvrdenia (kvôli poradiu v čase).
- Zoznam súborov, ktoré sa pri `layer: contract` majú prehľadať.

### Kde je potrebný človek

Nezastupiteľne: produkčné vrstvy, prepis DECISION, zápis verdiktu, a rozhodnutie medzi dvoma rovnako podloženými čítaniami rozporu.

---

## 8. EXECUTION CONTRACT

```yaml
TASK_NAME: state-claim-verifier
ID: EC-001
VERSION: 1.0

PURPOSE: >
  Overiť jedno tvrdenie o stave v repozitárnom dokumente proti skutočnému stavu stromu
  a vydať verdikt s dôkazom, ktorý sa dá spustiť znova. Vynucuje pravidlo
  STATE MUST BE EVIDENCE-BACKED, ktoré dnes existuje iba ako text.

INPUT:
  required: [file, line, text, layer]
  optional: [subject, referenced_sha, referenced_pr, created_at]
  layer_enum: [commit, pr, production, contract]
  source: pracovný strom repozitára a git história; žiadna sieť, žiadna produkčná DB

OUTPUT:
  format: YAML
  required: [verdict, claim_ref, evidence, observed, action_required]
  verdict_enum: [CONFIRMED, CONTRADICTED, UNVERIFIABLE]
  evidence_item: {cmd: string, output: string}

RULES:
  MUST:
    - každý verdikt nesie ≥1 spustiteľný cmd s doslovným výstupom
    - iba read-only príkazy
    - neoveriteľná vrstva = UNVERIFIABLE, nikdy CONFIRMED
    - CONTRADICTED nesie presné nové znenie riadku
    - každá vrstva sa overuje zvlášť
    - zachovať poradie v čase
  MUST_NOT:
    - upraviť overovaný súbor
    - zapísať verdict.result do task karty
    - prepísať DECISION
    - domyslieť SHA, PR, verziu, dátum
    - použiť sieť alebo produkčnú DB
    - vyhlásiť CONFIRMED na základe iného dokumentu

ESCALATION_RULES:
  - layer=production → človek (read-only SELECT spúšťa founder)
  - layer=pr bez siete → človek
  - súbor je DECISION → founder
  - pole je verdict.result → Judge
  - dve rovnako podložené čítania rozporu → founder
  - oprava by menila Acceptance → founder

VALIDATION: [V1 kompletnosť, V2 re-spustenie cmd, V3 read-only, V4 evidence≥1, V5 žiadny vymyslený údaj, V6 formát, V7 eskalácia]

TEST_CASES: 6 reálnych (T1–T6), 6/6 PASS, 2026-09-17

KNOWN_FAILURE_MODES:
  - sémantické tvrdenia sa nedajú overiť grepom
  - číslo riadku sa posunie pri zmene súboru
  - bez created_at vzniká falošné obvinenie pri zmene po zápise

HUMAN_HANDOFF:
  formát: verdikt + dôkaz + proposed_fix; človek rozhodne a vykoná
  kanál: FINDING do .ai/bus/outbox/, pri CRITICAL aj Telegram (EC-001 nikdy nepíše priamo)

SUCCESS_CRITERIA:
  - 100 % verdiktov má spustiteľný dôkaz
  - 0 vymyslených údajov (V5) — tvrdé kritérium, jedno porušenie ruší beh
  - 0 zápisov do overovaného súboru
  - každý production/pr claim eskalovaný, nie odhadnutý
```

---

## 9. Návrh automatizácie — `GO REQUIRED`, neimplementované

Podľa poradia, ktoré si sám určil: kontrakt a testy najprv, automatizácia až potom.

**Fáza 1 (malá, deterministická):** skript `apps/crm/scripts/verify-state-claims.mjs`, ktorý prečíta
`evidence.commands` zo všetkých kariet v `.ai/bus/tasks/`, spustí ich a porovná exit kód s tvrdeným
stavom. Pokrýva vrstvu `commit` — teda T1, T2, T4. Bez LLM.

**Fáza 2:** LLM extrahuje tvrdenia z voľného textu reportov a naplní `claim` štruktúru; overenie
zostáva deterministické. LLM navrhuje, skript rozhoduje.

**Fáza 3:** napojenie na `routeAlert` — `CONTRADICTED` v DECISION alebo v task karte je
`GOVERNANCE` severity, čo je presne tá vetva tvojej škály, ktorá ide okamžite.

Fáza 1 má hodnotu aj sama — dnes by našla rozpor T1 na `main`.

**Poznámka k nasadeniu:** `EC-001` nikdy nesmie upravovať to, čo kontroluje. Verifikátor, ktorý si
opravuje vlastné nálezy, prestáva byť verifikátorom.
