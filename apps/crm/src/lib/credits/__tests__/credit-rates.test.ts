import { describe, expect, it } from "vitest";
import {
  CREDIT_RATE_CODES,
  CREDIT_RATES,
  getCreditRate,
} from "@/lib/credits/credit-rates";

describe("credit-rates", () => {
  it("exports typed sadzobník per Wave 2A playbook", () => {
    expect(CREDIT_RATES.LEAD_UNLOCK).toBe(20);
    expect(CREDIT_RATES.AI_ANALYSIS).toBe(1);
    expect(CREDIT_RATES.AI_EMAIL).toBe(1);
    expect(CREDIT_RATES.LISTING_DESCRIPTION).toBe(2);
  });

  it("covers every rate code", () => {
    expect(CREDIT_RATE_CODES).toHaveLength(4);
    for (const code of CREDIT_RATE_CODES) {
      expect(getCreditRate(code)).toBe(CREDIT_RATES[code]);
      expect(getCreditRate(code)).toBeGreaterThan(0);
    }
  });
});
