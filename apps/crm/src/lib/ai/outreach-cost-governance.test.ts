import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  AppendOnlyJsonlLedger,
  type ModelProvider,
  type ProviderCallRequest,
  type ProviderCallResult,
} from "@revolis/model-gateway";
import {
  buildOutreachGatewayConfig,
  completeOutreachLlm,
  OutreachCostBlockedError,
} from "./outreach-cost-governance";

function mockOpenAi(
  model: string,
  handler: (req: ProviderCallRequest) => ProviderCallResult | Promise<ProviderCallResult>,
): ModelProvider {
  return {
    id: "openai",
    model,
    call: (req) => Promise.resolve(handler(req)),
  };
}

describe("outreach cost governance (model gateway)", () => {
  const prevEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...prevEnv };
    vi.restoreAllMocks();
  });

  it("ALLOW: completes via mocked OpenAI and returns cost metadata", async () => {
    process.env.OPENAI_API_KEY = "test-key-not-secret";
    process.env.MODEL_GATEWAY_PER_TASK_LIMIT_EUR = "0.5";
    process.env.MODEL_GATEWAY_DAILY_LIMIT_EUR = "5";
    process.env.MODEL_GATEWAY_MONTHLY_LIMIT_EUR = "25";
    const dir = await mkdtemp(path.join(tmpdir(), "outreach-gw-"));
    const ledger = new AppendOnlyJsonlLedger(path.join(dir, "ledger.jsonl"));
    const openai = mockOpenAi("gpt-4.1-mini", () => ({
      text: '{"subject":"Ahoj","body":"Telo"}',
      tokensIn: 40,
      tokensOut: 20,
    }));

    const out = await completeOutreachLlm(
      { taskId: "t-allow", prompt: "ping", model: "gpt-4.1-mini" },
      {
        config: buildOutreachGatewayConfig("gpt-4.1-mini"),
        ledger,
        openai,
      },
    );

    expect(out.text).toContain("subject");
    expect(out.costEur).toBeGreaterThanOrEqual(0);
    expect(out.attempts).toBe(1);
    expect(out.model).toBe("gpt-4.1-mini");
  });

  it("BLOCK: unknown model price stops before provider call", async () => {
    process.env.OPENAI_API_KEY = "test-key-not-secret";
    const openai = mockOpenAi("does-not-matter", () => ({
      text: "never",
      tokensIn: 1,
      tokensOut: 1,
    }));
    let called = 0;
    openai.call = async () => {
      called += 1;
      return { text: "x", tokensIn: 1, tokensOut: 1 };
    };

    await expect(
      completeOutreachLlm(
        { taskId: "t-block", prompt: "ping", model: "unknown-outreach-model" },
        {
          config: buildOutreachGatewayConfig("unknown-outreach-model"),
          openai,
        },
      ),
    ).rejects.toMatchObject({ code: "unknown_price" });

    expect(called).toBe(0);
  });

  it("BLOCK: task budget exceeded before HTTP", async () => {
    process.env.OPENAI_API_KEY = "test-key-not-secret";
    process.env.MODEL_GATEWAY_PER_TASK_LIMIT_EUR = "0.000001";
    const openai = mockOpenAi("gpt-4.1-mini", () => ({
      text: "x",
      tokensIn: 8000,
      tokensOut: 4000,
    }));
    let called = 0;
    openai.call = async () => {
      called += 1;
      return { text: "x", tokensIn: 8000, tokensOut: 4000 };
    };

    await expect(
      completeOutreachLlm(
        { taskId: "t-budget", prompt: "ping", model: "gpt-4.1-mini" },
        { config: buildOutreachGatewayConfig("gpt-4.1-mini"), openai },
      ),
    ).rejects.toBeInstanceOf(OutreachCostBlockedError);

    expect(called).toBe(0);
  });
});
