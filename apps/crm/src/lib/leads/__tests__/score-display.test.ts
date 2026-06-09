import { describe, expect, it } from "vitest";
import { getScoreDisplay, isLeadHotOrWarm, isLeadScored } from "../score-display";

describe("getScoreDisplay", () => {
  it("score=22, priority=Nízka, bri_score=null → zobraz —", () => {
    const r = getScoreDisplay({ score: 22, ai_priority: "Nízka", bri_score: null });
    expect(r.label).toBe("—");
    expect(r.sublabel).toBe("Nekvalifikované");
    expect(r.showScore).toBe(false);
  });

  it("score=85 → HOT", () => {
    const r = getScoreDisplay({ score: 85, ai_priority: "Vysoká", bri_score: 85 });
    expect(r.sublabel).toBe("HOT");
    expect(r.showScore).toBe(true);
  });

  it("score=22, bri_score=75 → zobraz 75 (reálny BRI score)", () => {
    const r = getScoreDisplay({ score: 22, bri_score: 75, ai_priority: "Nízka" });
    expect(r.label).toBe("75/100");
    expect(r.showScore).toBe(true);
  });

  it("score=null → zobraz —", () => {
    const r = getScoreDisplay({ score: null, bri_score: null });
    expect(r.label).toBe("—");
  });

  it("score=0 bez kontaktu → Nekvalifikované", () => {
    const r = getScoreDisplay({
      score: 0,
      aiPriority: "Nízka",
      lastContact: "Bez kontaktu",
    });
    expect(r.label).toBe("—");
    expect(r.sublabel).toBe("Nekvalifikované");
  });
});

describe("score filters", () => {
  it("isLeadScored false for default 22", () => {
    expect(isLeadScored({ score: 22, ai_priority: "Nízka" })).toBe(false);
  });

  it("isLeadHotOrWarm for score 85", () => {
    expect(isLeadHotOrWarm({ score: 85, ai_priority: "Vysoká" })).toBe(true);
  });
});
