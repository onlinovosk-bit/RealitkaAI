import { describe, expect, it } from "vitest";
import { analyzeCall } from "@/lib/ai/call-analysis";

describe("[verification] Call analyzer short-transcript path", () => {
  it("returns inconclusive fallback for transcripts under 50 chars (no Claude call)", async () => {
    const result = await analyzeCall("Krátky prepis.");
    expect(result.sentiment).toBe("inconclusive");
    expect(result.analysis_confidence).toBe("low");
    expect(result.inconclusive_reason).toContain("krátky");
    expect(result.score).toBe(50);
  });

  it("returns inconclusive for empty transcript", async () => {
    const result = await analyzeCall("   ");
    expect(result.escalation_needed).toBe(false);
    expect(result.keyTopics).toEqual([]);
  });
});
