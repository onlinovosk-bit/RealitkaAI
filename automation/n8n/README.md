# n8n workflow exports

Exportované n8n workflow JSON súbory pre Revolis orchestráciu.

## Pravidlá

- **Verziovanie:** každá zmena workflow v n8n Cloud sa exportuje sem pred merge / deploy.
- **Bez secrets:** credentials patria výhradne do n8n credential store. JSON nesmie
  obsahovať `apiKey`, `password`, `Bearer`, `client_secret` ani iné tokeny.
- **CI guard:** `saas-grade-pipeline.yml` zlyhá, ak export obsahuje zakázané reťazce.
- **Scope V1:** pozri `docs/briefs/overnight/overnight-brief-n8n-foundation.md` (W1–W3).

## Súbory

| Súbor | Workflow | Popis |
|-------|----------|--------|
| `w1-follow-up-strazca.json` | W1 Follow-up strážca | D+4 Gmail **drafty** (31 firiem, statický dataset), nikdy send |
| `w2-heartbeat-watchdog.json` | W2 Heartbeat watchdog | Widget-only: `/odhad/reality-smolko` + `/odhad/demo` (HTTP 200) |
| `w3-odpoved-detektor.json` | W3 Odpoveď-detektor | Gmail read-only detekcia odpovedí z trackera |

**Poznámka k health endpointu:** kanonický uptime check v repe je `GET /api/healthz`
(200). `/api/health` nemá route a vracia 401 — W2 ho zámerne nepoužíva (widget-only).

## Import do n8n Cloud

1. Workflows → Import from file → vyber JSON z tohto priečinka.
2. Pri Gmail nodoch priraď credential **Gmail Revolis** (OAuth — founder brána).
3. Po importe W1 spusti **Execute workflow** (Test step) a over acceptance nižšie.
4. Po zmene v Cloud export späť sem (nahraď JSON, commit).

## Acceptance V1 (founder / ops)

| Workflow | Test | Pass kritérium |
|----------|------|----------------|
| W1 | Re-import JSON → Execute | Drafty v Gmail Konceptoch pre D+4 firmy; **0 odoslaných** emailov; súhrnný email founderovi |
| W2 | Dočasne zmeň URL na 404 → počkaj 30 min | Notifikácia founderovi < 30 min |
| W3 | Odpoveď z testovacieho účtu v trackeri | Notifikácia < 1 h |

Tracker: `docs/sales/revolis-sales-tracker.xlsx`
