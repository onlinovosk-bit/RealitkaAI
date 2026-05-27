import { describe, expect, it } from "vitest";
import {
  hasCapability,
  normalizeLicenseTier,
  resolveCapabilities,
} from "./capability-registry";

describe("license capability registry", () => {
  it("normalizes legacy tier aliases", () => {
    expect(normalizeLicenseTier("command")).toBe("command");
    expect(normalizeLicenseTier("scale")).toBe("pro");
    expect(normalizeLicenseTier(null)).toBe("free");
  });

  it("gates market intel for guardian tier and above", () => {
    expect(hasCapability("starter", "canUseMarketIntel")).toBe(false);
    expect(hasCapability("pro", "canUseMarketIntel")).toBe(false);
    expect(hasCapability("market_vision", "canUseMarketIntel")).toBe(true);
    expect(hasCapability("protocol_authority", "canUseMarketIntel")).toBe(true);
  });

  it("allows forecast from radar (pro) tier", () => {
    expect(hasCapability("starter", "canViewForecast")).toBe(false);
    expect(hasCapability("pro", "canViewForecast")).toBe(true);
  });

  it("resolves full capability map", () => {
    const caps = resolveCapabilities("pro");
    expect(caps.canViewForecast).toBe(true);
    expect(caps.canUseMarketIntel).toBe(false);
    expect(caps.canUseMonopolDominance).toBe(false);
    expect(caps.canUseStealthRecruiter).toBe(false);
  });

  it("gates stealth recruiter to monopol tier", () => {
    expect(hasCapability("protocol_authority", "canUseStealthRecruiter")).toBe(true);
    expect(hasCapability("market_vision", "canUseStealthRecruiter")).toBe(false);
  });
});
