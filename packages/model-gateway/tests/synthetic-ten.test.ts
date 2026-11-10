import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AppendOnlyJsonlLedger,
  createModelGateway,
  estimateMaxCostEur,
  type ModelGatewayConfig,
  type ModelProvider,
} from "../src/index.ts";

const SYNTHETIC = [
  { taskId: "syn-01", prompt: "Summarize one paragraph about Bratislava rents.", maxOutputTokens: 128 },
  { taskId: "syn-02", prompt: "List 3 follow-up questions for a cold lead.", maxOutputTokens: 96 },
  { taskId: "syn-03", prompt: "Rewrite subject line under 60 chars.", maxOutputTokens: 64 },
  { taskId: "syn-04", prompt: "Classify sentiment: positive/neutral/negative.", maxOutputTokens: 32 },
  { taskId: "syn-05", prompt: "Extract phone and email from Slovak text.", maxOutputTokens: 64 },
  { taskId: "syn-06", prompt: "Draft 2-sentence SMS reminder.", maxOutputTokens: 80 },
  { taskId: "syn-07", prompt: "Check GDPR basis wording only.", maxOutputTokens: 96 },
  { taskId: "syn-08", prompt: "Translate 20 words SK→EN.", maxOutputTokens: 64 },
  { taskId: "syn-09", prompt: "Score lead 1-5 with one reason.", maxOutputTokens: 48 },
  { taskId: "syn-10", prompt: "Generate hashtags for IG post.", maxOutputTokens: 40 },
] as const;

function baseConfig(ledgerPath: string): ModelGatewayConfig {
  return {
    primaryProvider: "openai",
    openaiModel: "gpt-4o-mini",
    anthropicModel: "claude-3-5-haiku-latest",
    openaiApiKey: "mock",
    anthropicApiKey: "mock",
    anthropicFallbackEnabled: false,
    xaiEnabled: false,
    limits: { perTaskEur: 0.25, dailyEur: 5, monthlyEur: 50 },
    defaults: { maxInputTokens: 256, maxOutputTokens: 128 },
    maxAttempts: 3,
    ledgerPath,
  };
}

function mockOpenAi(model: string): ModelProvider {
  let seq = 0;
  return {
    id: "openai",
    model,
    async call(req) {
      seq += 1;
      const tokensOut = Math.min(req.maxOutputTokens, 40 + (seq % 20));
      return {
        text: `synthetic:${req.prompt.slice(0, 24)}`,
        tokensIn: 120 + seq,
        tokensOut,
      };
    },
  };
}

test("ten synthetic tasks: cost estimates and mock success rate", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mgw-syn-"));
  const ledgerPath = path.join(dir, "ledger.jsonl");
  const ledger = new AppendOnlyJsonlLedger(ledgerPath);
  const config = baseConfig(ledgerPath);
  const gw = createModelGateway({
    config,
    ledger,
    openai: mockOpenAi(config.openaiModel ?? "gpt-4o-mini"),
  });

  let estimatedTotal = 0;
  let actualTotal = 0;
  let ok = 0;

  for (const task of SYNTHETIC) {
    const est = estimateMaxCostEur(
      "openai",
      config.openaiModel ?? "gpt-4o-mini",
      config.defaults.maxInputTokens,
      task.maxOutputTokens,
    );
    assert.ok(est !== null);
    estimatedTotal += est;
    const out = await gw.complete({
      taskId: task.taskId,
      prompt: task.prompt,
      maxOutputTokens: task.maxOutputTokens,
    });
    actualTotal += out.costEur;
    ok += 1;
  }

  assert.equal(ok, 10);
  assert.ok(estimatedTotal > 0);
  assert.ok(actualTotal > 0);
  assert.ok(actualTotal <= estimatedTotal * 1.2);
  console.log(
    JSON.stringify({
      tasks: 10,
      estimatedMaxEur: Number(estimatedTotal.toFixed(6)),
      actualMockEur: Number(actualTotal.toFixed(6)),
      successRate: 1,
    }),
  );
});
