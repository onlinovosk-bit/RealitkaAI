import { describe, expect, it } from "vitest";
import {
  manualPlanKeyToTier,
  resolveBillingPlanFromManualPlan,
} from "@/lib/billing/resolve-agency-manual-plan";
import { PLAN_KEYS } from "@/lib/billing-types";

describe("resolveBillingPlanFromManualPlan", () => {
  it("maps Smolko market_vision to enterprise plan key", () => {
    expect(resolveBillingPlanFromManualPlan("market_vision")).toBe(PLAN_KEYS.ENTERPRISE);
  });

  it("returns null for empty manual plan", () => {
    expect(resolveBillingPlanFromManualPlan(null)).toBeNull();
    expect(resolveBillingPlanFromManualPlan("  ")).toBeNull();
  });

  it("maps unknown values to null", () => {
    expect(resolveBillingPlanFromManualPlan("not-a-plan")).toBeNull();
  });
});

describe("manualPlanKeyToTier", () => {
  it("treats paid plans as pro tier", () => {
    expect(manualPlanKeyToTier(PLAN_KEYS.ENTERPRISE)).toBe("pro");
  });

  it("treats free as free tier", () => {
    expect(manualPlanKeyToTier("free")).toBe("free");
  });
});
