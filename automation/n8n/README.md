# n8n workflow exports

Exportované n8n workflow JSON súbory pre Revolis orchestráciu.

## Pravidlá

- **Verziovanie:** každá zmena workflow v n8n Cloud sa exportuje sem pred merge / deploy.
- **Bez secrets:** credentials patria výhradne do n8n credential store. JSON nesmie
  obsahovať `apiKey`, `password`, `Bearer`, `client_secret` ani iné tokeny.
- **CI guard:** `saas-grade-pipeline.yml` zlyhá, ak export obsahuje zakázané reťazce.
- **Scope V1:** pozri `docs/briefs/overnight/overnight-brief-n8n-foundation.md` (W1–W3).

## Súbory (po V1)

| Súbor | Workflow | Popis |
|-------|----------|--------|
| *(zatiaľ prázdne)* | W1 Follow-up strážca | Gmail drafty, nie odosielanie |
| *(zatiaľ prázdne)* | W2 Heartbeat watchdog | Widget + `/api/health` |
| *(zatiaľ prázdne)* | W3 Odpoveď-detektor | Gmail read-only detekcia |

Workflowy vzniknú v n8n Cloud a exportnú sa sem po founder OAuth bráne.
