import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AppendOnlyJsonlLedger,
  createModelGateway,
  GatewayError,
  ProviderCallError,
  type ModelGatewayConfig,
  type ModelProvider,
} from "../src/index.ts";
import type { ProviderCallRequest, ProviderCallResult } from "../src/types.ts";

const NOW = () => new Date("2026-11-10T12:00:00.000Z");

function baseConfig(over: Partial<ModelGatewayConfig> = {}): ModelGatewayConfig {
  return {
    primaryProvider: "openai",
    openaiModel: "gpt-4o-mini",
    anthropicModel: "claude-3-5-haiku-latest",
    openaiApiKey: "test-openai",
    anthropicApiKey: "test-anthropic",
    anthropicFallbackEnabled: true,
    xaiEnabled: false,
    limits: { perTaskEur: 0.25, dailyEur: 5, monthlyEur: 50 },
    defaults: { maxInputTokens: 512, maxOutputTokens: 128 },
    maxAttempts: 3,
    ledgerPath: "var/model-gateway/test-ledger.jsonl",
    ...over,
  };
}

function mockProvider(
  id: ModelProvider["id"],
  model: string,
  handler: (req: ProviderCallRequest) => Promise<ProviderCallResult> | ProviderCallResult,
): ModelProvider {
  return {
    id,
    model,
    call: (req) => Promise.resolve(handler(req)),
  };
}

async function tempLedger(): Promise<AppendOnlyJsonlLedger> {
  const dir = await mkdtemp(path.join(tmpdir(), "mgw-"));
  return new AppendOnlyJsonlLedger(path.join(dir, "ledger.jsonl"));
}

test("successful OpenAI completion via mock", async () => {
  const ledger = await tempLedger();
  const openai = mockProvider("openai", "gpt-4o-mini", () => ({
    text: "mock-openai-ok",
    tokensIn: 50,
    tokensOut: 20,
  }));
  const gw = createModelGateway({
    config: baseConfig(),
    ledger,
    openai,
    anthropic: mockProvider("anthropic", "claude-3-5-haiku-latest", () => ({
      text: "should-not-run",
      tokensIn: 0,
      tokensOut: 0,
    })),
    now: NOW,
  });
  const out = await gw.complete({ taskId: "t-openai", prompt: "ping" });
  assert.equal(out.provider, "openai");
  assert.equal(out.text, "mock-openai-ok");
  assert.equal(out.attempts, 1);
  assert.ok(out.costEur >= 0);
});

test("fallback to Anthropic on OpenAI rate limit", async () => {
  let anthropicCalls = 0;
  const ledger = await tempLedger();
  const openai = mockProvider("openai", "gpt-4o-mini", () => {
    throw new ProviderCallError("rate_limit", "synthetic 429");
  });
  const anthropic = mockProvider("anthropic", "claude-3-5-haiku-latest", () => {
    anthropicCalls += 1;
    return { text: "mock-anthropic-fallback", tokensIn: 40, tokensOut: 30 };
  });
  const gw = createModelGateway({
    config: baseConfig({ anthropicFallbackEnabled: true }),
    ledger,
    openai,
    anthropic,
    now: NOW,
  });
  const out = await gw.complete({ taskId: "t-fallback", prompt: "retry" });
  assert.equal(out.provider, "anthropic");
  assert.equal(out.text, "mock-anthropic-fallback");
  assert.equal(out.attempts, 2);
  assert.equal(anthropicCalls, 1);
});

test("blocks when task budget would be exceeded", async () => {
  const ledger = await tempLedger();
  const gw = createModelGateway({
    config: baseConfig({
      limits: { perTaskEur: 0.00001, dailyEur: 5, monthlyEur: 50 },
    }),
    ledger,
    openai: mockProvider("openai", "gpt-4o-mini", () => ({
      text: "nope",
      tokensIn: 1,
      tokensOut: 1,
    })),
    now: NOW,
  });
  await assert.rejects(
    () => gw.complete({ taskId: "t-budget", prompt: "x" }),
    (err: unknown) => err instanceof GatewayError && err.code === "task_budget",
  );
});

test("blocks when model price is unknown", async () => {
  const ledger = await tempLedger();
  const gw = createModelGateway({
    config: baseConfig({ openaiModel: "not-in-catalog-model" }),
    ledger,
    openai: mockProvider("openai", "not-in-catalog-model", () => ({
      text: "nope",
      tokensIn: 1,
      tokensOut: 1,
    })),
    now: NOW,
  });
  await assert.rejects(
    () => gw.complete({ taskId: "t-unknown", prompt: "x" }),
    (err: unknown) => err instanceof GatewayError && err.code === "unknown_price",
  );
});

test("auth error does not trigger Anthropic fallback loop", async () => {
  let anthropicCalls = 0;
  const ledger = await tempLedger();
  const gw = createModelGateway({
    config: baseConfig({ anthropicFallbackEnabled: true }),
    ledger,
    openai: mockProvider("openai", "gpt-4o-mini", () => {
      throw new ProviderCallError("auth", "invalid key");
    }),
    anthropic: mockProvider("anthropic", "claude-3-5-haiku-latest", () => {
      anthropicCalls += 1;
      return { text: "nope", tokensIn: 1, tokensOut: 1 };
    }),
    now: NOW,
  });
  await assert.rejects(
    () => gw.complete({ taskId: "t-auth", prompt: "x" }),
    (err: unknown) => err instanceof GatewayError && err.code === "auth",
  );
  assert.equal(anthropicCalls, 0);
});

test("ledger append-only records success row", async () => {
  const ledger = await tempLedger();
  const gw = createModelGateway({
    config: baseConfig(),
    ledger,
    openai: mockProvider("openai", "gpt-4o-mini", () => ({
      text: "ledger-ok",
      tokensIn: 10,
      tokensOut: 5,
    })),
    now: NOW,
  });
  await gw.complete({ taskId: "t-ledger", prompt: "record" });
  const file = ledger.filePath;
  const raw = await readFile(file, "utf8");
  assert.match(raw, /"status":"ok"/);
  assert.match(raw, /"taskId":"t-ledger"/);
});
