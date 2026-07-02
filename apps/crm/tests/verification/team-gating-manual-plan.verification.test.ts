import { describe, expect, it } from "vitest";
import { resolveAccountTier } from "@/lib/license/resolve-account-tier";
import { resolveTeamAccountTier } from "@/components/team/resolve-team-account-tier";
import {
  manualPlanKeyToTier,
  resolveBillingPlanFromManualPlan,
} from "@/lib/billing/resolve-agency-manual-plan";
import { PLAN_KEYS } from "@/lib/billing-types";

describe("[verification] Team gating via agencies.manual_plan", () => {
  it("manual_plan market_vision overrides free profile tier (Smolko)", () => {
    expect(
      resolveAccountTier({ ui_role: "agent", account_tier: "free", role: "founder" }, "market_vision"),
    ).toBe("market_vision");
    expect(resolveTeamAccountTier({ ui_role: "agent", account_tier: null }, "market_vision")).toBe(
      "market_vision",
    );
  });

  it("maps manual plan key to billing enterprise for market_vision", () => {
    expect(resolveBillingPlanFromManualPlan("market_vision")).toBe(PLAN_KEYS.ENTERPRISE);
    expect(manualPlanKeyToTier(PLAN_KEYS.ENTERPRISE)).toBe("pro");
  });

  it("owner_protocol ui_role wins when no manual_plan", () => {
    expect(
      resolveTeamAccountTier({ ui_role: "owner_protocol", account_tier: "starter" }),
    ).toBe("protocol_authority");
  });
});
