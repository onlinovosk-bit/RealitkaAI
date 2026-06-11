import { describe, expect, it, vi, afterEach } from "vitest";
import {
  DEFAULT_CHECKLIST,
  computeReadinessScore,
  getRiskLabel,
  normalizeChecklist,
} from "@/lib/onboarding-mvp";

describe("onboarding-mvp", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("normalizeChecklist", () => {
    it("returns defaults for null/undefined", () => {
      expect(normalizeChecklist(null)).toEqual(DEFAULT_CHECKLIST);
      expect(normalizeChecklist(undefined)).toEqual(DEFAULT_CHECKLIST);
    });

    it("coerces partial objects to booleans", () => {
      expect(
        normalizeChecklist({ connectedCrm: true, importedLeads: 1 as unknown as boolean }),
      ).toEqual({
        ...DEFAULT_CHECKLIST,
        connectedCrm: true,
        importedLeads: true,
      });
    });
  });

  describe("computeReadinessScore", () => {
    it("scores 0 for empty checklist", () => {
      expect(computeReadinessScore(DEFAULT_CHECKLIST)).toBe(0);
    });

    it("scores 100 when all weighted steps complete", () => {
      const full = Object.fromEntries(
        Object.keys(DEFAULT_CHECKLIST).map((k) => [k, true]),
      ) as typeof DEFAULT_CHECKLIST;
      expect(computeReadinessScore(full)).toBe(100);
    });

    it("caps score at 100", () => {
      expect(computeReadinessScore({ ...DEFAULT_CHECKLIST, connectedCrm: true })).toBeLessThanOrEqual(
        100,
      );
    });
  });

  describe("getRiskLabel", () => {
    it("returns high when readiness below 50", () => {
      expect(getRiskLabel(40, new Date().toISOString())).toBe("high");
    });

    it("returns high when inactive 7+ days", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
      const eightDaysAgo = new Date("2026-06-03T12:00:00Z").toISOString();
      expect(getRiskLabel(80, eightDaysAgo)).toBe("high");
    });

    it("returns medium when readiness 50-74 or inactive 4-6 days", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
      expect(getRiskLabel(60, new Date("2026-06-10T12:00:00Z").toISOString())).toBe("medium");
      expect(getRiskLabel(70, new Date("2026-06-06T12:00:00Z").toISOString())).toBe("medium");
    });

    it("returns low when healthy and recent activity", () => {
      expect(getRiskLabel(90, new Date().toISOString())).toBe("low");
    });
  });
});
