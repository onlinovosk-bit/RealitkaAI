import { afterEach, describe, expect, it } from "vitest";
import { getDecisionFeatureFlags } from "../decision-flags";

const KEYS = ["DECISION_ENGINE_ENABLED", "CLOSING_WINDOW_ENABLED", "RESCUE_AUTOMATION_ENABLED"] as const;

function clearFlags() {
  for (const key of KEYS) {
    delete process.env[key];
  }
  delete process.env.VERCEL_ENV;
}

afterEach(() => {
  clearFlags();
});

describe("getDecisionFeatureFlags", () => {
  it("defaults off in local dev when unset", () => {
    clearFlags();
    const flags = getDecisionFeatureFlags();
    expect(flags.decisionEngineEnabled).toBe(false);
    expect(flags.closingWindowEnabled).toBe(false);
    expect(flags.rescueAutomationEnabled).toBe(false);
  });

  it("defaults on in Vercel production when unset", () => {
    clearFlags();
    process.env.VERCEL_ENV = "production";
    const flags = getDecisionFeatureFlags();
    expect(flags.decisionEngineEnabled).toBe(true);
    expect(flags.closingWindowEnabled).toBe(true);
    expect(flags.rescueAutomationEnabled).toBe(true);
  });

  it("defaults on in Vercel preview when unset", () => {
    clearFlags();
    process.env.VERCEL_ENV = "preview";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(true);
  });

  it("respects explicit false kill-switch on production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.DECISION_ENGINE_ENABLED = "false";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(false);
    expect(getDecisionFeatureFlags().closingWindowEnabled).toBe(true);
  });

  it("respects explicit true in local dev", () => {
    clearFlags();
    process.env.DECISION_ENGINE_ENABLED = "true";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(true);
  });
});
