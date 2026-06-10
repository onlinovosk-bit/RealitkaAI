import { describe, expect, test } from "vitest";
import { calculateChurnScore } from "../churn-score";

const base = {
  id: "test-1",
  name: "Test Lead",
  status: "Kontaktovaný",
  created_at: new Date().toISOString(),
};

describe("calculateChurnScore", () => {
  test("nikdy nekontaktovaný + Vysoká → score = 100", () => {
    const score = calculateChurnScore({
      ...base,
      last_contact: null,
      ai_priority: "Vysoká",
    });
    expect(score).toBe(100);
  });

  test("18 dní bez kontaktu + Vysoká → score > 80", () => {
    const past = new Date(Date.now() - 18 * 86_400_000).toISOString();
    const score = calculateChurnScore({
      ...base,
      last_contact: past,
      ai_priority: "Vysoká",
    });
    expect(score).toBeGreaterThan(80);
  });

  test("kontakt pred 2 dňami + Nízka → score < 30", () => {
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const score = calculateChurnScore({
      ...base,
      last_contact: recent,
      ai_priority: "Nízka",
      status: "Uzavretý",
    });
    expect(score).toBeLessThan(30);
  });

  test("score nikdy neprekročí 100", () => {
    const score = calculateChurnScore({
      ...base,
      last_contact: null,
      ai_priority: "Vysoká",
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});
