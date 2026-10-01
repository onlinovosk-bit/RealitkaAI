---
v: 1
id: MSG-20260918-001-bus-transport-v1
type: result
status: done
from: claude-code
to: sol-gpt
created_at: 2026-09-18T09:53:57.894Z
task_id: TASK-BUS-TRANSPORT-V1
mode: IMPLEMENT
stop_after_report: true
summary: Bus v1 transport dodany (CLI + HTTP + OpenAPI), 61 testov zelenych, deploy caka na founder GO
counters:
  tests_passing: 61
  new_runtime_dependencies: 0
  bus_files_validated: 41
  bus_files_pre_v1: 35
  bus_validate_errors: 0
  deploy_options_open: 3
decisions_required:
  - id: D1
    question: Kde bezi HTTP transport, aby ho ChatGPT Action vedel volat?
    gate: GO REQUIRED
    options:
      - lokalne + cloudflared tunel (0 EUR, bezi len s notebookom)
      - samostatny host Fly/Render/Railway (~5 EUR/mes)
      - mount ako /api/bus v apps/crm (bez noveho hostingu, ale viaze interny nastroj na produktovy deploy)
    recommendation: zacat tunelom na jeden realny handoff, potom samostatny host
  - id: D2
    question: Zapnut npm run bus:validate ako povinny CI krok na PR?
    gate: GO REQUIRED
    recommendation: ano, dnes je 0 errors, takze gate nic neblokuje
  - id: D3
    question: Migrovat 35 pre-v1 sprav do v1 schemy?
    gate: GO REQUIRED
    recommendation: nie, historia sa neprepisuje; pre-v1 je warning, nie error
evidence:
  commands:
    - npm run bus:test
    - npm run bus:validate
  files:
    - docs/architecture/adr-2026-09-18-inter-agent-bus-transport-v1.md
    - packages/bus-core/src/http.ts
    - scripts/bus/cli.ts
    - docs/prompts/revolis-bus-openapi.yaml
scope:
  repo_paths:
    - packages/bus-core/**
    - scripts/bus/**
    - docs/prompts/revolis-bus-openapi.yaml
    - docs/architecture/adr-2026-09-18-inter-agent-bus-transport-v1.md
    - .ai/bus/README.md
    - .ai/bus/message.schema.md
  forbidden_paths:
    - apps/crm/**
next_action:
  gate: GO REQUIRED
  description: Founder rozhodne D1 (kde bezi HTTP transport) a vyda REVOLIS_BUS_TOKEN
---

## Summary

Transportna vrstva busu je postavena. Agent uz nemusi posielat vysledok cez
foundera: zapise ho do busu a protistrana si ho vytiahne — cez CLI (repo) alebo
cez HTTP (ChatGPT Action).

## Co je hotove

- `packages/bus-core` — v1 envelope, validacia, digest, file store, GitHub store,
  HTTP handler. Nula runtime zavislosti.
- `scripts/bus/cli.ts` — send / pull / read / digest / ack / validate.
- `scripts/bus/serve.ts` — standalone HTTP server, fail-closed bez tokenu.
- `docs/prompts/revolis-bus-openapi.yaml` — schema pre ChatGPT Custom GPT Action.

## Co hotove nie je

Nasadenie. Kod bezi lokalne a je otestovany proti realnemu `node:http`, ale
ziadny verejny endpoint neexistuje a ziadny token nebol vygenerovany. Dokym
founder nerozhodne D1, ChatGPT sa na bus nedostane a copy-paste trva dalej.

## Evidence

- `npm run bus:test` → 61 testov, 0 fail (vratane regresie nad realnymi `.ai/bus` subormi).
- `npm run bus:validate` → 41 suborov, 0 errors, 102 warnings (vsetko pre-v1).

## Next action

Founder rozhodne D1 a vyda `REVOLIS_BUS_TOKEN`. Bez toho zostava bus lokalny.
