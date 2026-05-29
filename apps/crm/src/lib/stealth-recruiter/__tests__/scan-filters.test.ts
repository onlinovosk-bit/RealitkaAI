import { describe, expect, it, vi, afterEach } from "vitest";
import {
  bratislavaCalendarDate,
  bratislavaVerifiedAtRange,
  isStealthRecruiterDemoMode,
  normalizeRegion,
  regionMatchesProspect,
} from "@/lib/stealth-recruiter/scan-filters";

describe("stealth-recruiter scan-filters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes region", () => {
    expect(normalizeRegion("  Prešov ")).toBe("Prešov");
    expect(normalizeRegion("")).toBeNull();
  });

  it("matches region case-insensitively", () => {
    expect(regionMatchesProspect("prešov", "Prešov")).toBe(true);
    expect(regionMatchesProspect("Košice", "Prešov")).toBe(false);
  });

  it("returns Bratislava calendar date", () => {
    const d = new Date("2026-05-29T10:00:00Z");
    expect(bratislavaCalendarDate(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds verified_at range with end after start", () => {
    const { from, to } = bratislavaVerifiedAtRange(new Date("2026-05-29T12:00:00Z"));
    expect(new Date(to).getTime()).toBeGreaterThan(new Date(from).getTime());
  });

  it("reads demo mode env flag", () => {
    vi.stubEnv("STEALTH_RECRUITER_DEMO_MODE", "true");
    expect(isStealthRecruiterDemoMode()).toBe(true);
    vi.stubEnv("STEALTH_RECRUITER_DEMO_MODE", "false");
    expect(isStealthRecruiterDemoMode()).toBe(false);
  });
});
