import { describe, expect, it } from "vitest";
import { hashSessionToVariant } from "@/lib/valuation/ab-test";

describe("valuation ab-test", () => {
  it("assigns deterministic variant from session id", () => {
    const a = hashSessionToVariant("session-alpha-001");
    const b = hashSessionToVariant("session-alpha-001");
    expect(a).toBe(b);
    expect(["A", "B"]).toContain(a);
  });

  it("splits roughly 50/50 across sample ids", () => {
    let aCount = 0;
    for (let i = 0; i < 200; i += 1) {
      if (hashSessionToVariant(`test-session-${i}`) === "A") aCount += 1;
    }
    expect(aCount).toBeGreaterThan(60);
    expect(aCount).toBeLessThan(140);
  });
});
