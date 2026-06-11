import { describe, expect, it } from "vitest";
import { hasCapability, resolveCapabilities } from "@/lib/license/capability-registry";

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
});
