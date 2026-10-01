import { describe, expect, it } from "vitest";
import {
  getCapabilityDefinition,
  hasCapability,
  normalizeLicenseTier,
  resolveCapabilities,
} from "@/lib/license/capability-registry";

describe("[verification] Forecast capability gating", () => {
  it("blocks forecast for starter/free tiers", () => {
    expect(hasCapability("starter", "canViewForecast")).toBe(false);
    expect(hasCapability("free", "canViewForecast")).toBe(false);
    expect(resolveCapabilities("starter").canViewForecast).toBe(false);
  });

  it("unlocks forecast from Active Force (pro) upward", () => {
    expect(hasCapability("pro", "canViewForecast")).toBe(true);
    expect(hasCapability("market_vision", "canViewForecast")).toBe(true);
    expect(hasCapability("protocol_authority", "canViewForecast")).toBe(true);
  });

  it("preview tier smoke: legacy active_force alias maps to pro (forecast unlocked)", () => {
    const tier = normalizeLicenseTier("active_force");
    expect(tier).toBe("pro");
    expect(hasCapability(tier, "canViewForecast")).toBe(true);
    expect(resolveCapabilities("active").canViewForecast).toBe(true);
  });

  it("upsell CTA audit: locked starter exposes Radar upgrade path for /forecasting", () => {
    const def = getCapabilityDefinition("canViewForecast");
    expect(def.upgradeCta).toContain("Radar");
    expect(def.upgradeProgram).toBe("radar");
    expect(def.revenueTrigger).toBe("forecast_attempt");
    expect(hasCapability("starter", "canViewForecast")).toBe(false);
  });
});
