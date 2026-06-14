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

  it("estimateOpenAiCostEur returns positive EUR", () => {
    expect(estimateOpenAiCostEur("gpt-4o-mini", 5_000, 500)).toBeGreaterThan(0);
  });
});
