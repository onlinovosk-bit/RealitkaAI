# Model Gateway — izolovaný runner

Audit GO odkazoval na `scripts/overnight-runner.mjs` — ten súbor v repe **nie je**. Izolovaný vstup je tu.

## Mock syntetika (10 úloh, bez platených API)

```bash
node scripts/model-gateway/run-synthetic.mjs
```

## Testy (všetko mock)

```bash
npm run model-gateway:test
```

## Grok Bot cez OpenAI API (voliteľný live smoke, nie xAI)

1. Nastav explicitný model a kľúč (nikdy ich neloguj):

```bash
export OPENAI_API_KEY=...
export MODEL_GATEWAY_OPENAI_MODEL=gpt-4o-mini
export MODEL_GATEWAY_PER_TASK_LIMIT_EUR=0.25
export MODEL_GATEWAY_DAILY_LIMIT_EUR=2
export MODEL_GATEWAY_ANTHROPIC_FALLBACK_ENABLED=false
export MODEL_GATEWAY_ALLOW_LIVE=1
```

2. Voliteľne vlastný prompt (inak jednoriadkový smoke):

```bash
export GROK_BOT_PROMPT='[COACH-PROMPT-OK] Tvoj Grok Bot prompt tu...'
```

3. Spusti:

```bash
node scripts/model-gateway/grok-bot-openai-smoke.mjs
```

Ledger: `var/model-gateway/grok-bot-smoke.jsonl` (append-only). Langfuse sa použije len ak máš `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` a voliteľne `LANGFUSE_BASE_URL` — vendor `tools/langfuse` v gite nie je.
