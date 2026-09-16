# Report — Claude cloud verifikácia AUDIT close-loop (2026-09-16)

**Cieľová cesta v repe:** `docs/reports/2026-09-16-claude-cloud-verification.md`  
**Nadväzuje na:** `docs/reports/2026-09-16-runner-audit-close-loop.md` @ `audit/2026-09-16` (`7020c9eb0`)  
**Režim:** read-only overenie + jedna oprava na vetve (nepushnutá v cloud session, bez merge, bez EXECUTION)  
**Prostredie (Claude cloud):** čistý blobless klon z GitHubu, Node 22.22.2 / npm 10.9.7, žiadny prístup k PC

## 0. PC addendum (Cursor, po doručení tohto reportu)

Overené na `C:\RealitkaAI-run\audit` po `git fetch`:

| N | cloud tvrdenie | PC stav teraz |
|---|---|---|
| N1 | `chore/tc-orchestrator` nie je na GitHube | **už je** — `origin/chore/tc-orchestrator` = `8599e3e9d`, súbor `apps/crm/scripts/tc-orchestrator.mjs` existuje (`git cat-file -e` exit 0). Krok 1 zo §4 je hotový / netreba opakovať. |
| N3 patch | pripravený v Downloads | aplikovaný na vetvu `fix/judge-cost-usd-null` a pushnutý z PC (pozri git log tej vetvy). |

Cloud zistenia N2 (kalibrácia preflightu) a potvrdenia §3 ostávajú v platnosti. `open_prs` ostáva UNKNOWN, ak session nemá GitHub API.

---

## 1. UNKNOWN → uzavreté

| check z preflightu | predtým | teraz | evidence_cmd |
|---|---|---|---|
| `origin_main_fresh` | UNKNOWN | **OK**: `origin/main` = `7318e6159` = audit base, 0 nových commitov | `git rev-list --count 7318e6159..origin/main` → `0` |
| `open_prs` | UNKNOWN | **stále UNKNOWN**: táto session nemá povolený GitHub API | `api.github.com/.../pulls` → "GitHub access ... not enabled for this session" |
| remote branches | nezmerané | 483 heads na origin | `git ls-remote --heads origin \| wc -l` |

## 2. Nové zistenia (audit ich nemal)

### N1 — `chore/tc-orchestrator` NIE JE na GitHube (vysoké riziko)

> **Stav po PC addendum:** riziko uzavreté pushom — pozri §0. Pôvodný cloud nález nižšie ostáva ako história.

`git ls-remote --heads origin | grep orchestr` → nič (v čase cloud behu). `batch/tc-1` na origin je, ale `tc-orchestrator.mjs` neobsahuje.
**Dôsledok (vtedy):** jediná kópia orchestrátora (BLOCK #2) bola na disku `C:\RealitkaAI`. Nedala sa zrevidovať z cloudu a pri strate disku alebo worktree by bola preč.
**Náprava (1 príkaz, reverzibilné):** `git push -u origin chore/tc-orchestrator`

### N2 — BLOCK #1 je iba prostredie a preflight check je chybne nakalibrovaný

- `npm ci --ignore-scripts` (23 s) → Judge načíta `js-yaml` ✅
- Repo je **npm workspace** (`apps/crm` ∈ root `workspaces`). `npm ci` inštaluje do **root** `node_modules`, `apps/crm/node_modules` nevznikne.
  → check `Test-Path apps/crm/node_modules` zostane **False aj po oprave**.
- `judge.mjs` **nemá `--help`**. Bez `--task` vracia exit **2** (`Chýba --task ...`), a to aj pri nainštalovaných deps.
  → check `judge.mjs --help → exit 0` **nemôže byť nikdy zelený**.

**Navrhovaná náhrada checku `judge_exists`** (PowerShell):

```powershell
node apps/crm/scripts/judge.mjs 2>&1 | Select-String "Chýba --task"   # nájdené = Judge beží; ERR_MODULE_NOT_FOUND = BLOCK
```

Pozor: Judge pri **každom** behu s `--task` appenduje do `.ai/bus/ledger/`, aj bez `--write-verdict`. Preflight preto nesmie spúšťať Judge proti reálnemu kontraktu.

### N3 — `cost_usd: 0` má presnú príčinu a opravu (hotové na vetve)

Príčina: `judge.mjs:326`, `cost_usd: Number(process.env.JUDGE_RUN_COST_USD ?? 0)`.
Oprava: vetva `fix/judge-cost-usd-null` (+ patch `0001-fix-judge-cost-usd-null-when-unmeasured.patch`), iba `apps/crm/scripts/judge.mjs`.

**Runnable negative_case (overené v cloud):**

| Judge | env | ledger `cost_usd` | `cost_measured` |
|---|---|---|---|
| origin/main (pred) | — | `0` ❌ | chýba |
| fix | — | `null` ✅ | `false` |
| fix | `JUDGE_RUN_COST_USD=0.42` | `0.42` ✅ | `true` |
| fix | `JUDGE_RUN_COST_USD=abc` | `null` ✅ | `false` |

Konzument: jediný je `ledgerSpend()` v tom istom súbore (`Number(e.cost_usd ?? 0)`), null je bezpečný.
Týmto má uzol `gate:cost_usd` runnable negative_case, takže podmienku z `dag-summary.md` spĺňa.

**Otvorené na rozhodnutie foundera (nemenené):** keď kontrakt má `max_cost_usd` a cena sa nemeria, rozpočtová brána stále ticho prejde (suma nameraných nulových nákladov je 0). Kontrakt 09 hovorí, že `max_cost_usd` sa má generovať iba ak sa cena meria. Možnosti: (a) Judge → HUMAN, keď je limit bez merania; (b) generátor kontraktov `max_cost_usd` nevkladá. Druhá možnosť má menšie riziko.

## 3. Potvrdené na aktuálnom `origin/main`

| rozpor z auditu | stav | evidence |
|---|---|---|
| `tc-orchestrator.mjs` chýba | potvrdené | `test -e` → MISSING |
| `scope-guard.yml` (B7) chýba | potvrdené | `test -e` → MISSING |
| TASK-0100 `open`, verdict null | potvrdené | `grep ^status` → `open` |
| TASK-NS-001 `IN_PROGRESS` vs ledger ACCEPT | potvrdené | 2× `"verdict":"ACCEPT"` v `2026-09.jsonl` |
| `cost_usd: 0` na všetkých riadkoch | potvrdené 9/9 | `grep -o '"cost_usd":[^,}]*' \| uniq -c` |

## 4. Upravené ďalšie kroky (nahrádza §„Čo ďalej" v pôvodnom reporte)

| # | akcia | kto | reverzibilné | PC stav |
|---|---|---|---|---|
| 1 | `git push -u origin chore/tc-orchestrator` | Andy (PC) | áno | **hotové** (origin má vetvu) |
| 2 | `npm ci` v **roote** repa; check podľa N2 | Andy / operátor | áno | otvorené |
| 3 | Aplikovať patch N3 → PR `fix/judge-cost-usd-null` | Andy push, Claude pripravil | áno | patch na PC; PR podľa founder GO |
| 4 | Opraviť preflight checky v `docs/prompts/runner/01-*` (N2) | Claude, po GO | áno | čaká GO |
| 5 | Land `tc-orchestrator` (samostatný PR, risk high → HUMAN) | founder | — | vetva na origin pripravená na review |
| 6 | Písomné GO EXECUTION až po zelenom preflighte | founder | — | čaká |

## 5. North-star (Kontrolór)

Žiadna položka registra ani tohto reportu neprejde otázkou č. 1 „Prinesie to zákazníka?". Všetko je infraštruktúra továrne. Vidím riziko, že cyklus runner → audit → brány → orchestrátor bude brať founderov čas, ktorý by inak išiel do predaja. Rozhodnutie, koľko kapacity sem dať, patrí founderovi. Kroky 1–3 sú spolu ~5 minút a potom sa dajú odložiť bez straty.

## Čo Claude (cloud) neurobil

Nepushol (session nemala GitHub write), nemergoval, nespúšťal EXECUTION ani vlnu, nemenil bus kontrakty (TASK-0100, TASK-NS-001) ani runner docs, nesiahol na prod.

Patch artifact (cloud): `0001-fix-judge-cost-usd-null-when-unmeasured.patch` (doručený do `Downloads` na PC).
