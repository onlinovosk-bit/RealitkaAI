# Langfuse integration — Revolis CRM

LLM observability for OpenAI and Anthropic calls in `apps/crm`. Uses Langfuse JS SDK v5 (`@langfuse/tracing`, `@langfuse/otel`, `@langfuse/openai`) with OpenTelemetry.

Reference clone (read-only): [`tools/langfuse`](../../tools/langfuse)

## Setup

1. Create a [Langfuse Cloud](https://cloud.langfuse.com) project (or self-host).
2. Copy API keys from **Project Settings → API Keys**.
3. Add to `apps/crm/.env.local`:

```bash
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com   # EU default
LANGFUSE_ENABLED=true                         # optional; default on when keys present
```

4. Set the same vars in **Vercel → Environment Variables** for Preview/Production.
5. Restart `npm run dev` — OpenTelemetry initializes via `src/instrumentation.ts`.

When keys are missing, all Langfuse helpers are **no-op** (safe for local dev).

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LANGFUSE_SECRET_KEY` | Yes (to enable) | — | Secret API key |
| `LANGFUSE_PUBLIC_KEY` | Yes (to enable) | — | Public API key |
| `LANGFUSE_BASE_URL` | No | `https://cloud.langfuse.com` | Langfuse instance URL |
| `LANGFUSE_ENABLED` | No | `true` | Set `false` to disable even when keys exist |
| `LANGFUSE_LOG_LEVEL` | No | — | Set `DEBUG` for SDK troubleshooting |

## Architecture

```
Request → middleware.ts / proxy.ts (W3C traceparent propagation)
       → API route / server action
       → src/instrumentation.ts → LangfuseSpanProcessor (Node OTEL)
       → @langfuse/tracing helpers or @langfuse/openai wrapper
       → Langfuse Cloud
```

- **`src/lib/langfuse.ts`** — barrel export (config, helpers, clients, flush)
- **`src/instrumentation.ts`** — Next.js `register()` hook (Node runtime only)
- **`src/instrumentation-node.ts`** — `NodeSDK` + `LangfuseSpanProcessor`
- **`src/lib/langfuse/middleware.ts`** — W3C trace context in middleware/proxy

## Helpers

Import from `@/lib/langfuse`:

```typescript
import {
  logPrompt,
  logCompletion,
  logError,
  measureTokens,
  measureLatency,
  flushLangfuseTraces,
  getTracedOpenAIClient,
  isLangfuseEnabled,
} from "@/lib/langfuse";
```

### Manual generation tracing (Anthropic / custom flows)

```typescript
import { callClaude } from "@/lib/ai/claude";
import { logPrompt, logCompletion, logError, measureTokens, measureLatency } from "@/lib/langfuse";

export async function tracedMorningBrief(prompt: string) {
  const observation = logPrompt({
    name: "morning-brief",
    model: "claude-sonnet-4-6",
    input: { prompt },
    metadata: { feature: "morning_brief" },
  });

  try {
    const { result, latencyMs } = await measureLatency("morning-brief-call", async () =>
      callClaude({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }, "morning-brief"),
    );

    const textBlock = result.content.find((b) => b.type === "text");
    const output = textBlock?.type === "text" ? textBlock.text : "";

    logCompletion({
      observation,
      output,
      usage: measureTokens(result.usage),
      latencyMs,
    });

    return output;
  } catch (error) {
    logError(error, observation);
    throw error;
  }
}
```

### OpenAI — automatic tracing via `callOpenAI()`

`callOpenAI()` in `src/lib/ai/openai.ts` uses `getTracedOpenAIClient()` when Langfuse keys are present (`observeOpenAI` from `@langfuse/openai`). Pass optional trace metadata:

```typescript
import { callOpenAI } from "@/lib/ai/openai";

await callOpenAI({
  model: "gpt-4o-mini",
  tag: "rescore-insight",
  trace: {
    feature: "rescore-insight",
    workflowType: "lead_rescore",
    agencyId: agencyId,
    userId: userId,
    extra: { lead_id: leadId },
  },
  messages: [...],
});
```

### Anthropic — manual generation tracing via `callClaude()`

`callClaude()` wraps each call with `logPrompt` / `logCompletion` and `propagateAttributes` for tags and tenant metadata:

```typescript
import { callClaude, CLAUDE_SONNET } from "@/lib/ai/claude";

await callClaude(
  { model: CLAUDE_SONNET, max_tokens: 4096, messages: [...] },
  "generate-listing",
  {
    feature: "generate-listing",
    workflowType: "listing_generation",
    agencyId,
    userId,
  },
);
```

Shared trace helpers live in `src/lib/langfuse/context.ts` (`AiTraceContext`, `withAiTraceContext`).

### Drop-in traced OpenAI client (direct SDK use)

Use `getTracedOpenAIClient()` instead of `getOpenAIClient()` when bypassing `callOpenAI()`:

```typescript
import { getTracedOpenAIClient } from "@/lib/langfuse";

const client = getTracedOpenAIClient() ?? getOpenAIClient();
```

Prefer `callOpenAI()` — it adds PII sanitization and trace metadata in one place.

### Serverless flush

In long-running or streaming API routes on Vercel, flush before the function exits:

```typescript
import { after } from "next/server";
import { flushLangfuseTraces } from "@/lib/langfuse";

export async function POST(req: Request) {
  // ... AI work ...
  after(async () => {
    await flushLangfuseTraces();
  });
  return Response.json({ ok: true });
}
```

## Middleware / proxy tracing

Both entry points propagate W3C `traceparent` headers when Langfuse is enabled:

- `apps/crm/middleware.ts` — API auth gate (`/api/:path*`)
- `apps/crm/src/proxy.ts` — session gate for app routes

Auth logic is unchanged; trace helpers wrap responses only.

## Traced AI features (v1)

| Feature | Entry | Provider | Tags / metadata |
|---------|-------|----------|-----------------|
| Listing generator | `POST /api/ai/generate-listing` | Claude | `generate-listing`, `listing_generation`, `agency_id` |
| Listing content | `POST /api/ai/listing-content` | Claude | `listing-content`, `listing_content`, `agency_id`, `persona` |
| Stealth outreach | `POST /api/stealth-recruiter/outreach` | OpenAI | `stealth-outreach`, `stealth_recruiter`, `agency_id` |
| Dashboard insights | cron `GET /api/cron/dashboard-insights` | Claude | `dashboard-insights`, `dashboard_insights`, `agency_id` |
| Lead rescore insight | `rescoreLead()` (fire-and-forget) | OpenAI | `rescore-insight`, `lead_rescore`, `agency_id`, `lead_id` |

Routes above call `flushLangfuseTraces()` via `after()` or at handler exit.

## Debugging

```bash
LANGFUSE_LOG_LEVEL=DEBUG npm run dev
```

Check Langfuse **Traces** tab after triggering an AI route. If traces are missing:

1. Confirm keys in `.env.local` and restart dev server.
2. Call `flushLangfuseTraces()` in serverless handlers.
3. Verify `src/instrumentation.ts` loads (Next.js 16 enables it automatically).

## Related files

| File | Purpose |
|------|---------|
| `src/lib/langfuse/context.ts` | `AiTraceContext`, `withAiTraceContext` |
| `src/lib/ai/openai.ts` | OpenAI wrapper (PII sanitize + Langfuse) |
| `src/lib/ai/claude.ts` | Anthropic wrapper (PII sanitize + Langfuse generations) |
| `src/lib/ai-action-audit.ts` | Supabase audit log (complements Langfuse) |

Langfuse traces model I/O and latency; `ai_action_audit` tracks business actions and credits. Use both for production observability.

## Agent skill

Langfuse observability guidance is installed at `.cursor/skills/langfuse/SKILL.md` (from [langfuse/skills](https://github.com/langfuse/skills)). Follow `references/instrumentation.md` when extending tracing to new AI routes.
