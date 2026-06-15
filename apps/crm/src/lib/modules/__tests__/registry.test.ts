import { describe, expect, it } from "vitest";
import {
  ALL_ACCOUNT_TIERS,
  MODULE_REGISTRY,
  canRenderModule,
} from "@/lib/modules/registry";

describe("module registry visibility policy", () => {
  it("never renders unbuilt modules on any tier", () => {
    const unbuiltKeys = Object.keys(MODULE_REGISTRY).filter(
      (key) => MODULE_REGISTRY[key as keyof typeof MODULE_REGISTRY].status === "unbuilt",
    ) as Array<keyof typeof MODULE_REGISTRY>;

    expect(unbuiltKeys.length).toBeGreaterThan(0);

    for (const key of unbuiltKeys) {
      for (const tier of ALL_ACCOUNT_TIERS) {
        expect(canRenderModule(key, tier)).toBe(false);
      }
    }
  });

  it("hides protocol-only live modules from market vision", () => {
    expect(canRenderModule("hub_neighborhood_change", "market_vision")).toBe(false);
    expect(canRenderModule("menu_competition_radar", "market_vision")).toBe(false);
  });

  it("shows cadastre modules according to tier policy", () => {
    expect(canRenderModule("hub_breaking_point", "market_vision")).toBe(true);
    expect(canRenderModule("hub_breaking_point", "protocol_authority")).toBe(true);
    expect(canRenderModule("hub_neighborhood_change", "protocol_authority")).toBe(true);
    expect(canRenderModule("menu_competition_radar", "protocol_authority")).toBe(true);
  });

  it("hides gated modules for lower tiers (founder decision 1A)", () => {
    expect(canRenderModule("dashboard_ai_sales_intelligence", "market_vision")).toBe(false);
    expect(canRenderModule("menu_hidden_market_hub", "market_vision")).toBe(false);
    expect(canRenderModule("dashboard_ai_sales_intelligence", "protocol_authority")).toBe(true);
    expect(canRenderModule("menu_hidden_market_hub", "protocol_authority")).toBe(true);
  });
});

