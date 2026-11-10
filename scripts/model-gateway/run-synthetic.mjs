#!/usr/bin/env node
/**
 * Isolated synthetic runner for @revolis/model-gateway (mock providers only unless --live).
 * Repo note: scripts/overnight-runner.mjs from audit is absent; use this entry instead.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AppendOnlyJsonlLedger,
  createModelGateway,
  estimateMaxCostEur,
} from "../../packages/model-gateway/src/index.ts";

const SYNTHETIC = [
  { taskId: "syn-01", prompt: "Summarize Bratislava rent trend.", maxOutputTokens: 128 },
  { taskId: "syn-02", prompt: "3 follow-up questions for a cold lead.", maxOutputTokens: 96 },
  { taskId: "syn-03", prompt: "Subject line under 60 chars.", maxOutputTokens: 64 },
  { taskId: "syn-04", prompt: "Sentiment label only.", maxOutputTokens: 32 },
  { taskId: "syn-05", prompt: "Extract phone/email SK text.", maxOutputTokens: 64 },
  { taskId: "syn-06", prompt: "2-sentence SMS reminder.", maxOutputTokens: 80 },
  { taskId: "syn-07", prompt: "GDPR basis check.", maxOutputTokens: 96 },
  { taskId: "syn-08", prompt: "Translate 20 words SK→EN.", maxOutputTokens: 64 },
  { taskId: "syn-09", prompt: "Lead score 1-5 + reason.", maxOutputTokens: 48 },
  { taskId: "syn-10", prompt: "IG hashtags.", maxOutputTokens: 40 },
];

const live = process.argv.includes("--live");

async function main() {
  if (live) {
    console.error("Refusing --live from default synthetic runner (use grok-bot-openai-smoke.mjs).");
    process.exit(2);
  }

  const dir = await mkdtemp(path.join(tmpdir(), "mgw-run-"));
  const ledgerPath = path.join(dir, "ledger.jsonl");
  process.env.MODEL_GATEWAY_LEDGER_PATH = ledgerPath;
  process.env.MODEL_GATEWAY_OPENAI_MODEL ??= "gpt-4o-mini";

  const openai = {
    id: "openai",
    model: process.env.MODEL_GATEWAY_OPENAI_MODEL,
    async call(req) {
      return {
        text: `mock:${req.prompt.slice(0, 32)}`,
        tokensIn: 100,
        tokensOut: Math.min(req.maxOutputTokens, 48),
      };
    },
  };

  const ledger = new AppendOnlyJsonlLedger(ledgerPath);
  const gw = createModelGateway({ ledger, openai });

  let est = 0;
  let actual = 0;
  for (const row of SYNTHETIC) {
    const e = estimateMaxCostEur("openai", openai.model, 256, row.maxOutputTokens);
    est += e ?? 0;
    const out = await gw.complete({
      taskId: row.taskId,
      prompt: row.prompt,
      maxOutputTokens: row.maxOutputTokens,
    });
    actual += out.costEur;
    console.log(
      JSON.stringify({
        taskId: row.taskId,
        provider: out.provider,
        costEur: out.costEur,
        attempts: out.attempts,
      }),
    );
  }

  console.log(
    JSON.stringify({
      summary: true,
      estimatedMaxEur: Number(est.toFixed(6)),
      actualMockEur: Number(actual.toFixed(6)),
      ledgerPath,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
