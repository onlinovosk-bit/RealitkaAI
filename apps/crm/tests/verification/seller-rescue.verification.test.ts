import { describe, expect, it } from "vitest";
import { buildChurnResult, calculateChurnScore } from "@/lib/routines/churn-score";

const baseLead = {
  id: "sr-1",
  name: "Risk Lead",
  status: "Kontaktovaný",
  created_at: new Date().toISOString(),
};

describe("[verification] Seller Rescue churn score", () => {
  it("scores never-contacted HOT lead at maximum risk", () => {
    const score = calculateChurnScore({
      ...baseLead,
      last_contact: null,
      ai_priority: "Vysoká",
    });
    expect(score).toBe(100);
  });

  it("builds actionable rescue payload with SMS draft", () => {
    const past = new Date(Date.now() - 18 * 86_400_000).toISOString();
    const score = calculateChurnScore({
      ...baseLead,
      last_contact: past,
      ai_priority: "Vysoká",
    });
    const result = buildChurnResult(baseLead, score, "Maklér Ján");
    expect(result.churnScore).toBeGreaterThan(80);
    expect(result.riskReason).toContain("dní");
    expect(result.draftSms).toContain("Risk");
    expect(result.recommendedAction).toMatch(/Zavolaj|email|follow-up/i);
  });
});
