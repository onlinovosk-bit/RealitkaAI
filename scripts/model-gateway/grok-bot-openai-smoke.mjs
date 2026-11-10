#!/usr/bin/env node
/**
 * Optional live smoke for Grok Bot–style prompts via OpenAI (not xAI).
 * Requires explicit env — never runs without MODEL_GATEWAY_OPENAI_MODEL + OPENAI_API_KEY.
 */
import path from "node:path";
import { createModelGateway } from "../../packages/model-gateway/src/index.ts";

const prompt =
  process.env.GROK_BOT_PROMPT?.trim() ||
  "Reply with one line: gateway smoke ok.";

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("Set OPENAI_API_KEY for live smoke.");
    process.exit(2);
  }
  if (!process.env.MODEL_GATEWAY_OPENAI_MODEL?.trim() && !process.env.OPENAI_MODEL?.trim()) {
    console.error("Set MODEL_GATEWAY_OPENAI_MODEL (explicit model required).");
    process.exit(2);
  }
  if (process.env.MODEL_GATEWAY_ALLOW_LIVE !== "1") {
    console.error("Set MODEL_GATEWAY_ALLOW_LIVE=1 to confirm paid API call.");
    process.exit(2);
  }

  process.env.MODEL_GATEWAY_ANTHROPIC_FALLBACK_ENABLED ??= "false";
  process.env.MODEL_GATEWAY_LEDGER_PATH ??= path.join("var", "model-gateway", "grok-bot-smoke.jsonl");

  const gw = createModelGateway();
  const out = await gw.complete({ taskId: `grok-bot-smoke-${Date.now()}`, prompt });
  console.log(
    JSON.stringify(
      {
        text: out.text,
        provider: out.provider,
        model: out.model,
        costEur: out.costEur,
        tokensIn: out.tokensIn,
        tokensOut: out.tokensOut,
        ms: out.ms,
        attempts: out.attempts,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
