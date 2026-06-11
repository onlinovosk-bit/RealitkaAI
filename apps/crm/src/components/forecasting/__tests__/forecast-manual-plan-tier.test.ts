import { describe, expect, it } from "vitest";
import { resolveTeamAccountTier } from "@/components/team/resolve-team-account-tier";
import { hasCapability, normalizeLicenseTier } from "@/lib/license/capability-registry";

describe("forecast manual_plan tier resolution", () => {
  it("unlocks canViewForecast when agencies.manual_plan is market_vision", () => {
    const tier = resolveTeamAccountTier(
      { ui_role: "agent", account_tier: null },
      "market_vision",
    );
    expect(hasCapability(normalizeLicenseTier(tier), "canViewForecast")).toBe(true);
  });

  it("keeps forecast locked without manual_plan and no profile tier", () => {
    const tier = resolveTeamAccountTier({ ui_role: "agent", account_tier: null }, null);
    expect(hasCapability(normalizeLicenseTier(tier), "canViewForecast")).toBe(false);
  });
});
