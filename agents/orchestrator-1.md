# Orchestrator 1 — Backend & platforma

## Úloha

Koordinuje prácu agentov a úlohy v oblasti **servera, infraštruktúry, dát a asynchrónneho spracovania**.

## Riadi (scope)

| Oblast        | Popis |
| ------------- | ----- |
| **backend**   | API route handlery, business logika, integrácie |
| **infra**     | nasadenie, env, cron, závislosti medzi službami |
| **DB**        | schéma, migrácie, RLS, indexy, RPC |
| **queues**    | fronty / spracovanie na pozadí, retry |
| **orchestration** | poradie jobov, webhook → worker, stabilita pipeline |

## Typickí delegáti

- [`agent-db.md`](agent-db.md)
- [`agent-auth.md`](agent-auth.md) (serverové session/role/boundaries)
- [`agent-ai.md`](agent-ai.md) (pipeliny volané z backendu)

## Kontext

- [`../context/architecture.md`](../context/architecture.md)
- [`../context/infra.md`](../context/infra.md)
- Špecifikácie: [`../specs/orchestration.md`](../specs/orchestration.md)
