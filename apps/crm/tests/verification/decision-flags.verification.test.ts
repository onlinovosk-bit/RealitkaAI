import { afterEach, describe, expect, it } from "vitest";
import { getDecisionFeatureFlags } from "@/lib/ai/decision-flags";

const KEYS = ["DECISION_ENGINE_ENABLED", "CLOSING_WINDOW_ENABLED", "RESCUE_AUTOMATION_ENABLED"] as const;

function clearFlags() {
  for (const key of KEYS) delete process.env[key];
  delete process.env.VERCEL_ENV;
}

afterEach(() => clearFlags());

describe("[verification] Decision feature flags", () => {
  it("defaults off locally when unset", () => {
    clearFlags();
    const flags = getDecisionFeatureFlags();
    expect(flags.decisionEngineEnabled).toBe(false);
    expect(flags.rescueAutomationEnabled).toBe(false);
  });

  it("defaults on in Vercel production/preview unless kill-switch (GATED)", () => {
    process.env.VERCEL_ENV = "production";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(true);
    expect(getDecisionFeatureFlags().closingWindowEnabled).toBe(true);
    process.env.DECISION_ENGINE_ENABLED = "false";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(false);
  });

  it("enables explicitly in local dev when DECISION_ENGINE_ENABLED=true", () => {
    process.env.DECISION_ENGINE_ENABLED = "true";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(true);
  });
});
