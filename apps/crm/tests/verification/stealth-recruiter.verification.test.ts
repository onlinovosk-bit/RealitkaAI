import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isStealthRecruiterDemoMode,
  normalizeRegion,
  regionMatchesProspect,
} from "@/lib/stealth-recruiter/scan-filters";

describe("[verification] Stealth Recruiter scan filters", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("normalizes and matches prospect regions", () => {
    expect(normalizeRegion("  Prešov ")).toBe("Prešov");
    expect(regionMatchesProspect("prešov", "Prešov")).toBe(true);
    expect(regionMatchesProspect("Bratislava", "Prešov")).toBe(false);
  });

  it("reads STEALTH_RECRUITER_DEMO_MODE env flag", () => {
    vi.stubEnv("STEALTH_RECRUITER_DEMO_MODE", "true");
    expect(isStealthRecruiterDemoMode()).toBe(true);
    vi.stubEnv("STEALTH_RECRUITER_DEMO_MODE", "false");
    expect(isStealthRecruiterDemoMode()).toBe(false);
  });
});
