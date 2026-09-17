---
id: MSG-20260821-008-overnight-swarm-plan
type: plan
from: grok-4.6
to: founder
created: 2026-08-21
status: ready
gate: GO REQUIRED
owner: orchestrator
window: 2026-08-21 22:00 – 2026-08-22 06:00 Europe/Bratislava
base_sha: 76bb31080aa0f6b7a0d77c33e5835402e64ee9ce
next_action:
  gate: GO REQUIRED
  summary: Founder GO to start 3 worker lanes; without GO this document is the plan only.
---

# Plán nočného Ruflo Swarm — 2026-08-21 → 22

**Toto nie je vykonanie.** Merge, delete vetiev, PROD, send, secrets = founder.

## A. Discovery dôkazy

Príkazy (tento beh): `git fetch origin main`; `git log origin/main -20`; `git rev-parse origin/main`; `git rev-parse --is-shallow-repository`; `gh pr list --state open`; `gh pr view` na #437/#438/#439/#440/#443/#447; čítanie `.ai/bus/tasks/*`, `outbox/*`, `memory/open-tasks.md`, `memory/session-summary.md`, `memory/decisions.md` (posledné zápisy), `docs/reports/`.

| Fakt | Dôkaz |
|------|-------|
| BASE_SHA | `76bb31080aa0f6b7a0d77c33e5835402e64ee9ce` (`#452` na main) |
| Shallow | `false` na tomto Cloud VM |
| Open PR | **35** |
| Najstarší open PR | **#155**, created 2026-06-09, **73 dní** |
| Bus tasks | TASK-0001 `done`; TASK-0002 `done`; TASK-0003 `blocked` / NEEDS-EVIDENCE |
| Posledné rozhodnutia | 2026-08-21 billing GO+#451/#452; 2026-08-21 cleanup GO withdrawn |
| Session | Smolko dual-run čaká na secrets; TASK-0003 evidence pack; A1 sandbox UUID |
| Env | `#445` na main (`c5de149b`); Cloud Agent Personal env vs `main` scripts — live `install` fail 127 bol pred merge; **či dashboard env ukazuje na repo json = NEZISTENÉ** (MCP `environmentJson` owner-restricted) |
| Schema | `docs/reports/2026-08-17-schema-drift-audit.md` — blind `db push` zakázaný; #437 MERGEABLE BEHIND (iba migrácia + report) |
| Kvótový zostatok Cursor/Codex | **NEZISTENÉ** (žiadny API údaj v tomto VM) — plán predpokladá riziko vyčerpania |

`origin/main` dnes: billing wipe #451/#452, bus #449, Gmail pull #422, env #445.

**Zámerné vynechanie 30 % NOVÉ:** 35 open PR, 73-dňový chvost, TASK-0003, Smolko GO-only. Nová feature by bola maskované zatváranie.

## B. Vstupná brána

Každý worker pred zápisom:

1. `git fetch origin main` a `git rev-parse origin/main`.
2. Ak HEAD ≠ BASE_SHA: `git log BASE_SHA..origin/main -- <výhradné cesty lane>`. **STOP len pri prieniku súborov.** Inak pokračovať a do lane-MSG zapísať delta SHA.
3. Nová vetva `cursor/<lane>-20260822-db1f` z aktuálneho `origin/main` (žiadny rebase starých `cursor/critical-bug-management-*`).
4. Jeden push. Pád pred pushom = **strata celej práce lane** (čistota nad záchranou). Max **2** CI retry; tretí fail → STOP + MSG, žiadny tretí pokus.
5. Žiadny zápis mimo výhradných ciest. Žiadny `memory/`. Žiadny merge. Žiadny `main` push.

Orchestrátor: kvóta. Pri podozrení na limit (repeated 429 / agent lock / founder signál) **zabije najprv lane C, potom B, potom A**. Nenaštartované lanes nespúšťa. Report napíše vždy.

## C. Tabuľka vĺn

Noc = **8 h**. Strop **3 worker + 1 orchestrátor**. L-scope paralelný = zakázané.

| lane | zadanie | výhradné cesty | kat. | závislosti | gate | rozsah | hodiny | MSG NNN | ako zlyhá | obeť kvóty |
|------|---------|----------------|------|------------|------|--------|--------|---------|-----------|------------|
| **A** evidence | TASK-0003 pack: full-history dôkaz, tip SHA **N=N** pre kandidátov z inventory, `git cherry`/ancestry vs `origin/main`, edge-case policy. **Žiadny delete. Žiadny push `refs/cleanup/*`** (to je GO ráno). | `.ai/bus/tasks/TASK-0003.md`; `.ai/bus/outbox/MSG-20260822-01{0,1,2,3,4,5,6,7,8,9}-*`; `docs/reports/2026-08-22-branch-cleanup-evidence.md` | ZATVÁRANIE | žiadne | AUTO-SAFE do reportu; backup-ref push = GO REQUIRED | M | 4 | 010–019 | shallow/false-READY; timeout na 200+ cherry; inventúra MSG-003 stale vs dnešný main | 3. (zabije sa posledný) |
| **B** ingest | Replay **#439** z dnešného mainu: uvoľniť acquire-email dedup claim pri zlyhaní lead insert. Regression test, ktorý bez fixu padne. | `apps/crm/src/app/api/acquire/email/`; `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`; `docs/reports/2026-08-22-acquire-email-dedup-claim.md` | ZATVÁRANIE | nie #440 (ten istý route) | PR + STOP | M | 3 | 020–029 | konflikt s #440 logikou; CI; scope creep do idempotency #440 | 2. |
| **C** proxy | Replay **#438** z dnešného mainu: fail-closed proxy API auth pri `getUser` timeout. | `apps/crm/src/proxy.ts`; `apps/crm/src/proxy-auth-timeout.test.ts`; `apps/crm/tests/verification/proxy-session-gate.verification.test.ts`; `docs/reports/2026-08-22-proxy-auth-fail-closed.md` | ZATVÁRANIE | nie B (iné cesty) | PR + STOP | S | 2 | 030–039 | DIRTY vs main (timeout hotfix už na main 52d1b3a5) — replay musí re-diff, inak duplicita/regres | 1. (zabije sa prvý) |
| **O** orch | Sledovať lanes, kvótu, BASE_SHA prieniky; **vždy** napísať súhrn. | `.ai/bus/outbox/MSG-20260822-09{0,1,2,3,4,5,6,7,8,9}-overnight-result.md` | ZATVÁRANIE | A/B/C reporty | — | S | 8 (dohľad, nie kód) | 090–099 | padne pred zápisom → ticho = incident | neobetuje sa skôr ako workers |

**Efektívny rozpočet:** 3 workers × (≤4 h) × (1 + 2 retry) ≈ až 18 agent-hodín v najhoršom prípade — **to je priveľa pre kvótu**. Preto: C max 1 retry; B max 2; A max 1 retry (read-only pack, retry len pri tool fail). Ak kvóta **NEZISTENÉ**, default **spustiť len A+B**; C ostáva v zásobe a O ho nespustí, kým A aj B nemajú PR alebo STOP do 02:00. Tým klesá riziko zamknutia dennej kvóty.

Úprava voči stropu 3: **plánované paralelne = A + B**; C = podmienený tretí lane po 02:00 len ak kvóta vyzerá voľná. Stále ≤ 3.

## D. Dôkaz neprekrytia

| lane | write globs | read-ok mimo globs |
|------|-------------|-------------------|
| A | `.ai/bus/tasks/TASK-0003.md`, `.ai/bus/outbox/MSG-20260822-01*-*`, `docs/reports/2026-08-22-branch-cleanup-evidence.md` | git/GitHub read; inventory MSG-003 |
| B | `apps/crm/src/app/api/acquire/email/**`, `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`, `docs/reports/2026-08-22-acquire-email-dedup-claim.md` | `origin/main`, #439 diff ako untrusted |
| C | `apps/crm/src/proxy.ts`, `apps/crm/src/proxy-auth-timeout.test.ts`, `apps/crm/tests/verification/proxy-session-gate.verification.test.ts`, `docs/reports/2026-08-22-proxy-auth-fail-closed.md` | `origin/main`, #438 diff ako untrusted |
| O | `.ai/bus/outbox/MSG-20260822-09*-overnight-result.md` | všetky lane MSG |

Žiadny `memory/`. Žiadny zdieľaný verification súbor medzi B a C. #440 **nespúšťať** (prienik s B na `route.ts`). #447/#443 siahajú na `memory/` + iné app cesty — noc ich nechá.

Outbox: A `010–019`, B `020–029`, C `030–039`, O `090–099`. Názov musí obsahovať `lane-a` / `lane-b` / `lane-c` / `orch`.

## E. Čo sa NEBUDE robiť a prečo

- Merge / zatváranie PR (#371/#374 superseded, #155 73 d) — founder ráno.
- Delete 208 vetiev / push `refs/cleanup/*` — NEEDS-EVIDENCE; A pripraví tabuľku, nepushuje backup refs.
- PROD SQL, `db push`, aplikácia #437 — drift audit; founder ručne.
- Smolko OAuth secrets, curl na Preview s CRON_SECRET, **odoslanie** draftu — GO REQUIRED, stroj vypnutý.
- A1 remediácia tarif — sandbox UUID nepotvrdený.
- #440 idempotency — overlap s B; draft DIRTY.
- #370 atomic RPCs — 525+282 > hard 600.
- #369 `/upgrade` — NEZISTENÉ či ešte platí po #451; noc nerieši.
- Listing-gen cluster #360–365 UNSTABLE — mimo 70 % P0.
- Portal scraping, customer credentials, `mihalrado@gmail.com`.
- Štvrtý worker, L-scope, NOVÁ feature.
- Polovičný push. Rebase starých `critical-bug-management-*` vetiev.

## F. Ranný checklist pre foundera

1. Je súbor `.ai/bus/outbox/MSG-20260822-090-overnight-result.md` (alebo `091–099` s `orch`)? **Nie = incident**, nie prázdna noc.
2. Review poradie: (1) customer ingest PR z lane B ak existuje (2) proxy PR z lane C (3) evidence pack z A — **žiadny delete GO** kým N=N tabuľka + policy.
3. Merge **#453** (NEEDS-EVIDENCE docs) ak ešte nie je na main.
4. Zatvor superseded **#371** a **#374** (fixy sú #451/#452 na main).
5. Smolko: Preview secrets + curl podľa `docs/runbooks/gmail-pull-setup.md`; draft v `docs/reports/2026-08-21-smolko-gmail-dual-run-next.md` — GO odoslať?
6. Vek najstaršieho open PR (dnes #155 = 73 d) — nezmizne nocou.
7. Kvóta: ak O ukončil C/B predčasne, **nespúšťať denný swarm**, kým sa limit neobnoví.
8. #437 schema: APPLY len ručne, nie z noci.

## G. Orchestrátor — záverečný krok

Cesta: `.ai/bus/outbox/MSG-20260822-090-lane-orch-overnight-result.md`

Píše sa pri: all green, partial, all STOP, quota kill. Obsah: BASE_SHA start/end, PR URL lanes, ktoré lanes obetované, či niekto pushol, zoznam STOP dôvodov.

Ak O padne pred zápisom: A/B/C stále musia mať svoje MSG. Ráno bez **akéhokoľvek** `MSG-20260822-*` = incident.

## H. Sebakontrola

1. **Prienik súborov:** B∩C = prázdne. B∩#440 = `acquire/email/route.ts` → #440 vypnuté. Všetky staré PR píšu `memory/session-summary.md` → noc `memory/` zakázané. Outbox NNN preddelené.
2. **Nočné rozhodnutie:** backup refs, Smolko send, merge, A1, schema apply → STOP, nie hádanie.
3. **Pád v polovici:** jeden push; žiadny WIP commit na origin. Práca lane preč. O to nahlási ako stratenú, nie ako ticho.
4. **Maskované NOVÉ:** žiadne. 0 % nové, 100 % zatváranie — vedomé porušenie 70/30 **smerom k zatváraniu**, nie k feature. 30 % nové by pri 35 open PR a kvóte bola maskovaná pýcha.
5. **Polovičná kapacita:** vyhodiť C (už podmienené). Pri ešte menšej: len A (evidence, žiadny app kód).
6. **Kvóta ráno:** 2 lanes × 2 retry je strop, ktorý ešte nechá deň; 3×2 je hazard → C default off.

```
ĎALŠIA ÚLOHA: Founder GO na spustenie noci (A+B; C po 02:00 len ak kvóta voľná)
PREČO TERAZ: Plán je discovery-first; bez GO ostáva dokumentom
BRÁNA: GO REQUIRED
```
