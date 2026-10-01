# N00 — Reconcile register ↔ repo ↔ PRs

## S2 TASK

Zosúlaď stav Website Concierge so skutočnosťou na `origin/main` a otvorenými PR.
Výstup: jeden report. **Žiadny feature kód.**

## S3 TERRITORY

**Write:** `docs/reports/YYYY-MM-DD-smolko-concierge-reconcile.md` (NOVÝ)  
**Read:** register, status reporty, `gh pr view 542/544/569/573`, `git` na main  
**Forbidden:** app kód, migrácie, memory/, workflows

## S4 ACCEPTANCE

- Tabuľka brán B04–B09 so stĺpcami: register status · CODE evidence (commit/PR) · PROD evidence (`PASS|FAIL|unknown`) · next node
- Explicitne: či interný CRM chat je stále na main; stav #544
- Odporúčanie: Voiceflow vs Revolis-hosted UI pre N07 (s dôkazom alebo `unknown`)
- Žiadne prepisovanie BLOCKED→PASS bez PROD príkazu

## S5 VALIDATION

```bash
git fetch origin main
git rev-parse origin/main
gh pr view 542 --json state,mergedAt,url
gh pr view 544 --json state,title,url,mergeable
git cat-file -e origin/main:apps/crm/src/lib/smolko-chatbot.ts; echo exit:$?
git merge-base --is-ancestor 61b8e3938e2936ba6b5977035bac4e96399963e7 origin/main; echo b569:$?
git merge-base --is-ancestor $(gh pr view 573 --json mergeCommit --jq .mergeCommit.oid) origin/main; echo b573:$?
rg -n "SMO-B0[4-9]" docs/briefs/reality-smolko-blocking-conditions-register.md
```

Výstupy príkazov vlož do reportu (skrátené).

## S6 FAILURE

- `gh` / sieť zlyhá → BLOCKED, čo chýba
- Nájdeš rozpor register vs main → zapíš FINDING, neopravuj potichu register bez dôkazu

## S7 HANDOFF

```text
NODE: N00
RESULT: DONE|BLOCKED|HUMAN
B04_CODE: ...
B04_PROD: unknown|...
PR544: open|merged|closed
N07_UI_RECOMMENDATION: voiceflow|revolis_public|unknown
NEXT: W1 (N01∥N04∥N05∥N06)
REPORT: docs/reports/...
```
