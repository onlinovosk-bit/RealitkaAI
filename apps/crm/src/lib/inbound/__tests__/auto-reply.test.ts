import { afterEach, describe, expect, it, vi } from "vitest";

const { callClaudeMock } = vi.hoisted(() => ({
  callClaudeMock: vi.fn(),
}));

vi.mock("@/lib/ai/claude", () => ({
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
  callClaude: (...args: unknown[]) => callClaudeMock(...args),
  extractJson: <T,>(text: string) => JSON.parse(text) as T,
}));

vi.mock("@/lib/ai/llm-usage-cost", () => ({
  estimateClaudeCostEur: () => 0.00123,
}));

import { generateAutoReply } from "../auto-reply";

describe("generateAutoReply telemetry", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns model, cost and latency after successful Claude call", async () => {
    callClaudeMock.mockResolvedValue({
      content: [{ type: "text", text: '{"subject":"Ahoj","body":"Text"}' }],
      usage: { input_tokens: 120, output_tokens: 60 },
    });

    const out = await generateAutoReply({
      leadName: "Ján",
      source: "web",
    });

    expect(out.audit.source).toBe("llm");
    expect(out.audit.model).toBe("claude-haiku-4-5-20251001");
    expect(out.audit.costEur).toBe(0.00123);
    expect(out.audit.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("does not invent cost on timeout fallback", async () => {
    callClaudeMock.mockImplementation(
      () => new Promise(() => {
        /* never resolves — withAiTimeout wins */
      }),
    );

    const out = await generateAutoReply({
      leadName: "Ján",
      source: "web",
    });

    expect(out.audit.source).toBe("fallback");
    expect(out.audit.model).toBeNull();
    expect(out.audit.costEur).toBeNull();
  });
});
