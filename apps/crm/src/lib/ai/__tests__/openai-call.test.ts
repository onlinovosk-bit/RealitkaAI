import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
const increment = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create } };
  },
}));

vi.mock("@/lib/usage-metrics", () => ({
  incrementUsageMetric: (...args: unknown[]) => increment(...args),
  SYSTEM_USAGE_AGENCY_ID: "system-agency",
}));

async function load() {
  vi.resetModules();
  return import("../openai");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  increment.mockResolvedValue(undefined);
});

describe("callOpenAI", () => {
  it("bez kľúča hodí jasnú chybu a sieť sa nevolá", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { getOpenAIClient, callOpenAI } = await load();
    expect(getOpenAIClient()).toBeNull();
    await expect(
      callOpenAI({ messages: [{ role: "user", content: "ahoj" }], model: "gpt-test" }),
    ).rejects.toThrow("OPENAI_API_KEY nie je nastavený");
    expect(create).not.toHaveBeenCalled();
  });

  it("e-mail odíde zamaskovaný a v odpovedi sa vráti späť", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-a-secret");
    create.mockResolvedValue({
      choices: [{ message: { content: "píšem [EMAIL_1]" } }],
      usage: { prompt_tokens: 3, completion_tokens: 4 },
    });
    const { callOpenAI } = await load();
    const out = await callOpenAI({
      messages: [{ role: "user", content: "kontakt jan@example.com" }],
      model: "gpt-test",
      agencyId: "ag-1",
    });

    expect(out.content).toContain("jan@example.com");
    const sent = JSON.stringify(create.mock.calls[0][0]);
    expect(sent).not.toContain("jan@example.com");
    expect(sent).toContain("[EMAIL_1]");
    expect(increment).toHaveBeenCalledWith({
      agencyId: "ag-1",
      metric: "ai_openai_tokens",
      delta: 7,
    });
  });
});
