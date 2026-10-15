import { describe, expect, it } from "vitest";
import { CLAUDE_HAIKU } from "../claude";
import {
  RETAIL_EUR_PER_CREDIT,
  estimateClaudeCostEur,
  estimateOpenAiCostEur,
} from "../llm-usage-cost";

describe("llm-usage-cost", () => {
  it("RETAIL_EUR_PER_CREDIT is 0.86", () => {
    expect(RETAIL_EUR_PER_CREDIT).toBe(0.86);
  });

  it("estimateClaudeCostEur returns positive EUR", () => {
    expect(estimateClaudeCostEur(CLAUDE_HAIKU, 10_000, 2_000)).toBeGreaterThan(0);
  });

  it("cache write bills 1.25× input and cache read 0.1× input", () => {
    const uncached = estimateClaudeCostEur(CLAUDE_HAIKU, 1_000_000, 0);
    const write = estimateClaudeCostEur(CLAUDE_HAIKU, 0, 0, { creationInputTokens: 1_000_000 });
    const read = estimateClaudeCostEur(CLAUDE_HAIKU, 0, 0, { readInputTokens: 1_000_000 });
    expect(write).toBeCloseTo(uncached * 1.25, 4);
    expect(read).toBeCloseTo(uncached * 0.1, 4);
    expect(estimateClaudeCostEur(CLAUDE_HAIKU, 10_000, 2_000)).toBe(
      estimateClaudeCostEur(CLAUDE_HAIKU, 10_000, 2_000, {
        creationInputTokens: 0,
        readInputTokens: 0,
      }),
    );
  });

  it("estimateOpenAiCostEur returns positive EUR", () => {
    expect(estimateOpenAiCostEur("gpt-4o-mini", 5_000, 500)).toBeGreaterThan(0);
  });
});
