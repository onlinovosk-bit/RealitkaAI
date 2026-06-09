import { describe, expect, it } from "vitest";
import {
  computeDataQualityScore,
  computeDuplicateRate,
  formatTimeToFirstImport,
} from "@/lib/universal-import/migration-metrics";

describe("computeDataQualityScore", () => {
  it("returns 100 when all rows have name and contact", () => {
    const score = computeDataQualityScore([
      { contact_name: "Ján Novák", phone: "0903123456" },
      { contact_name: "Eva Malá", email: "eva@example.sk" },
    ]);
    expect(score).toBe(100);
  });

  it("returns 0 for empty input", () => {
    expect(computeDataQualityScore([])).toBe(0);
  });

  it("penalizes rows missing name or contact channel", () => {
    const score = computeDataQualityScore([
      { contact_name: "Ján Novák", phone: "0903123456" },
      { contact_name: "", phone: "0903000000" },
      { contact_name: "Bez kontaktu" },
    ]);
    expect(score).toBe(33);
  });
});

describe("computeDuplicateRate", () => {
  it("computes percentage with two decimals", () => {
    expect(computeDuplicateRate(200, 50)).toBe(25);
    expect(computeDuplicateRate(0, 0)).toBe(0);
  });
});

describe("formatTimeToFirstImport", () => {
  it("formats sub-minute intervals as seconds", () => {
    expect(
      formatTimeToFirstImport("2026-06-08T10:00:00.000Z", "2026-06-08T10:00:45.000Z"),
    ).toBe("45 seconds");
  });

  it("formats minute intervals", () => {
    expect(
      formatTimeToFirstImport("2026-06-08T10:00:00.000Z", "2026-06-08T10:02:30.000Z"),
    ).toBe("2 minutes 30 seconds");
  });
});
