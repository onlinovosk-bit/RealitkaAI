# Report — Claude cloud verifikácia AUDIT close-loop (2026-09-16)

**Cieľová cesta v repe:** `docs/reports/2026-09-16-claude-cloud-verification.md`  
**Nadväzuje na:** `docs/reports/2026-09-16-runner-audit-close-loop.md` @ `audit/2026-09-16` (`7020c9eb0`)  
**Cloud režim:** read-only overenie + patch N3 (cloud nepushol)  
**Cloud prostredie:** blobless klon, Node 22.22.2 / npm 10.9.7, bez PC / bez GitHub write

## 0. PC stav (Cursor) — po doručení cloud reportu

Aktualizované po merge **#562** (2026-09-16T19:48:13Z).

| # | cloud krok | PC stav | evidence |
|---|---|---|---|
| 1 | push `chore/tc-orchestrator` | **hotové** | `origin/chore/tc-orchestrator` = `8599e3e9d`, súbor na remote existuje |
| 2 | `npm ci` v roote + N2 check | **hotové** | root `node_modules=True`, `apps/crm/node_modules=False`; `judge.mjs` → `Chýba --task` |
| 3 | patch N3 → PR | **zmergované** | [#562](https://github.com/onlinovosk-bit/RealitkaAI/pull/562) → `main` `c9f0dd515`; `cost_usd: null` + `cost_measured` na `origin/main` |
| 5 | land orchestrátor do main | **otvorené** | `git cat-file -e origin/main:…/tc-orchestrator.mjs` → missing |
| 6 | GO EXECUTION | **zakázané** | až po land + poistke `Select-String cost_usd` → null |

**N1 (presné znenie):** push vetvy **nezavrel** audit nález. RUNNER/06 stále vyžaduje skript na **main**. N1 = uzavreté až mergeom orchestrátora. Push len odstránil riziko „jediná kópia na disku".

**Poistka pred/po landu orchestrátora:** obe vetvy menia `apps/crm/scripts/judge.mjs`. Pri konflikte základ = **main** (po #562). Po merge:

```powershell
Select-String -Path apps\crm\scripts\judge.mjs -Pattern "cost_usd"
```

Ak znova `?? 0` namiesto `null` → revert / oprava, orchestrátor prepísal #562.

---

## 1. UNKNOWN → uzavreté (cloud)

| check z preflightu | predtým | cloud | PC teraz |
|---|---|---|---|
| `origin_main_fresh` | UNKNOWN | OK vs `7318e6159` | `origin/main` = `c9f0dd515` (#562) |
| `open_prs` | UNKNOWN | UNKNOWN (no GH API) | #562 MERGED; orch PR ešte nie |
| remote branches | — | 483 heads | `chore/tc-orchestrator` na origin |

## 2. Nové zistenia (cloud) — platnosť

### N1 — orchestrátor mimo main
Cloud: nebol ani na GitHube.  
PC: na origin vetve áno, na **main stále nie**. Audit BLOCK #2 / N1 trvá do landu.

### N2 — preflight kalibrácia (stále platí)
- `npm ci` v **roote** (workspace), nie očakávať `apps/crm/node_modules`
- `judge.mjs` nemá `--help`; bez `--task` → exit 2 + `Chýba --task` = OK
- Preflight **nesmie** spúšťať Judge s `--task` (appenduje ledger)

Navrhovaná náhrada:

```powershell
node apps/crm/scripts/judge.mjs 2>&1 | Select-String "Chýba --task"
```

Oprava `docs/prompts/runner/01-*` čaká na **GO**.

### N3 — `cost_usd: 0` → **opravené na main**
Príčina: `Number(JUDGE_RUN_COST_USD ?? 0)`.  
Fix: #562. Negative case overený v cloud + poistka na `origin/main` po merge.

**Otvorené (founder):** ak kontrakt má `max_cost_usd` a cena sa nemeria — (a) Judge HUMAN, alebo (b) negenerovať `max_cost_usd`. Preferencia cloudu: (b).

## 3. Potvrdené rozpory vs main (po #562)

| rozpor | stav teraz |
|---|---|
| `tc-orchestrator.mjs` na main | stále MISSING |
| `scope-guard.yml` (B7) | stále MISSING |
| TASK-0100 `open` | stále (nezmenené) |
| TASK-NS-001 vs ledger ACCEPT | stále (nezmenené) |
| ledger historické `cost_usd: 0` | historické riadky ostávajú; **nové** behy Judge majú null |

## 4. Ďalšie kroky (aktuálne)

| # | akcia | kto | stav |
|---|---|---|---|
| 1 | push `chore/tc-orchestrator` | Andy | done |
| 2 | root `npm ci` + N2 | Andy | done |
| 3 | #562 cost_usd null | Andy | **merged** |
| 4 | preflight checky v `01-*` (N2) | Claude po GO | čaká |
| 5 | PR + land `tc-orchestrator` (HUMAN; judge.mjs = main base) | founder / Andy | **next** |
| 5b | po merge: `Select-String cost_usd` → null | Andy | povinné |
| 6 | GO EXECUTION | founder | až po 5+5b |

## 5. North-star (Kontrolór)

Stále platí: toto je infraštruktúra továrne, nie priamy zákazník. Kapacitu rozhoduje founder. Kroky 1–3 sú hotové; zvyšok je land orchestrátora + disciplína pri `judge.mjs`.

## Čo Claude cloud neurobil

Nepushol, nemergoval, nespúšťal EXECUTION, nemenil bus kontrakty ani runner docs, nesiahol na prod. Patch: `Downloads/0001-fix-judge-cost-usd-null-when-unmeasured.patch` (aplikovaný na PC → #562).
