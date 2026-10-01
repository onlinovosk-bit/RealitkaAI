# Ruflo swarm N1+N2 — stav 2026-08-20

**Režim:** vetva + PR + STOP. Žiadny merge do `main`. Žiadny `db push`. Žiadne credentials. Žiadny zásah do prod DB.
**Prompt:** `docs/prompts/ruflo-swarm-noc-2026-08-15.md`
**Dnešný beh:** Founder GO na spustenie lanes. Write-probe / prvá vlna už prebehla 15.–16.8.2026. Dnešný orchestrátor **nespustil** nové kódové lanes (boli by duplicitné). STOP po tomto reporte.

## Vstupná brána (20.8.2026)

```
git fetch origin && git log --oneline origin/main -5
```

| Podmienka | Výsledok |
|---|---|
| `origin/main` obsahuje `b4e9475` (#417 Stage 0 PASS) | PASS (`git merge-base --is-ancestor`) |
| `origin/main` obsahuje `d6b9e35` (#416 perf fix) | PASS |
| `D-2026-08-17-01` v `memory/decisions.md` na maine | PASS (riadok 625) |
| `D-2026-08-17-02` v `memory/decisions.md` na maine | PASS (riadok 633) |
| HEAD `origin/main` dnes | `d8d9a64b1` (#427 auth ILIKE) |

Lanes sa **smeli** spustiť. Nepísané do `memory/`.

## Čo prompt žiadal

Osem disjunktných PR (vlna N1 kód + N2 docs/testy) z `origin/main`, jeden push na lane, potom orchestrátor report a **STOP**. Merge robí výhradne founder.

Write-probe (task-loop 7.4) pred dávkou: overenie, že agent vie pushnúť a CI beží. Bez zeleného probe nespúšťať 8 agentov naraz.

## Čo je už v repe (nespustené znova)

Review poradie z promptu: **L25 → L22 → L23 → L28 → L29 → L26 → L24 → L27**

| Poradie | Lane | Vetva | PR | Stav 20.8.2026 | Čaká na foundera |
|---|---|---|---|---|---|
| 1 | L25 pagination | `fix/crm-lists-pagination` | [#425](https://github.com/onlinovosk-bit/RealitkaAI/pull/425) | **MERGED** 16.8. | Nič v tejto vlne. Layout/nav netknuté (nadväzuje na #416). |
| 2 | L22 Gmail pull V4-B | `feat/inbound-gmail-pull` | [#422](https://github.com/onlinovosk-bit/RealitkaAI/pull/422) | **OPEN**, rebase na `d8d9a64` (#427). `Lint, test, build` **pass** (8m19s). Vercel Preview Ready. Code Contract Guard pass. | Founder merge. Preview OAuth podľa `docs/runbooks/gmail-pull-setup.md`. Žiadny live Google z tohto behu. Alias/forward nechaj. |
| 3 | L23 decisions dedup A | `chore/decisions-dedup-variant-a` | [#421](https://github.com/onlinovosk-bit/RealitkaAI/pull/421) | **MERGED** 16.8. | Nič. SoT = `memory/decisions.md`. |
| 4 | L28 Playwright e2e | `test/acquisition-e2e-smoke` | [#420](https://github.com/onlinovosk-bit/RealitkaAI/pull/420) | **MERGED** 16.8. | Pôvodný report: tenant isolation skip bez `ACQUISITION_E2E_*`. Nie required CI gate. |
| 5 | L29 comms drafty | `docs/comms-drafts-2026-08-15` | [#419](https://github.com/onlinovosk-bit/RealitkaAI/pull/419) | **MERGED** 16.8. | Drafty neschválené/neodoslané. Posiela výhradne founder. |
| 6 | L26 Stage 1 plan | `docs/stage1-plan-draft` | [#418](https://github.com/onlinovosk-bit/RealitkaAI/pull/418) | **MERGED** 16.8. | Draft, nie start. Stage 1 kód až po vlastnom GO. |
| 7 | L24 genome_layer2 | `chore/genome-layer2-rename` | [#424](https://github.com/onlinovosk-bit/RealitkaAI/pull/424) | **MERGED** 16.8. (filename stamp, DDL nezmenené) | Dashboard SQL + `INSERT` do `supabase_migrations.schema_migrations` verzia `20260817120000`. **Žiadny `db push`.** |
| 8 | L27 sync persist | `feat/acquisition-sync-persistence-prep` | [#423](https://github.com/onlinovosk-bit/RealitkaAI/pull/423) | **MERGED** 16.8. Flag default `ACQUISITION_PERSIST_SYNC=false`. | Rovnaký founder postup ako L24. Flag nezapínať pred migráciou. |

Nočný report z 15.8.: [#426](https://github.com/onlinovosk-bit/RealitkaAI/pull/426) ostáva **OPEN** (stale voči dnešnému `main`). Tento súbor ho nahrádza ako stav k 20.8.

## Čo tento beh urobil / neurobil

**Urobené**

- Vstupná brána overená (SHA + D-2026-08-17-01/02).
- Inventúra 8 lanes + #426 vs aktuálny `origin/main`.
- L22: CI po rebase prečítané — `Lint, test, build` zelené; Preview Ready. Kód L22 **nebol** znovu písaný (už spĺňa mock-first + runbook + `.env.example` prázdne hodnoty).
- Tento report na vetve `docs/ruflo-swarm-status-2026-08-20`.

**Zámerné STOP (prompt + L99)**

- Žiadny nový kódový lane (L23–L29 už merged; L22 už OPEN a zelený).
- Žiadny merge do `main`.
- Žiadna aplikácia migrácií, žiadny restore `GOOGLE_ADS_WEBHOOK_KEY`.
- Žiadny zápis do `memory/`.
- Žiadne GitHub/Vercel UI akcie; všetko git + `gh`.
- Stage 1 sa nespúšťa.

## STOP — ostáva na ďalšie GO

1. **L22 #422** — founder review + merge (1 logická zmena). Potom Preview OAuth dual-run podľa runbooku. Nie súčasť tohto swarm STOP.
2. **L24 / L27 migrácie** — Dashboard SQL + `schema_migrations` INSERT, nie `db push`. Overiť, či founder už aplikoval po 16.8. merge.
3. **L29** — schválenie a odoslanie draftov (iba founder).
4. **#426** — zatvoriť ako superseded týmto reportom, alebo mergnúť docs-only po rebase (founder).
5. **Stage 1** — vlastný GO, nie N1+N2.

## Task-loop

**Hotovo:** vstupná brána PASS; inventúra N1+N2; L22 CI green overené; tento report.

**Otvorené:** #422 merge (founder); L24/L27 apply na prod (founder); L29 send (founder); #426 stale.

**Ďalšia úloha:** founder review #422 (Gmail pull V4-B) — jediný nestály kódový lane z promptu.

**Brána:** STOP — prompt aj Founder GO žiadali prvú vlnu / STOP gate, nie merge a nie Stage 1.