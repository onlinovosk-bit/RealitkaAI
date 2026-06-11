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

  it("stays off in production until explicit env opt-in (GATED)", () => {
    process.env.VERCEL_ENV = "production";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(false);
    expect(getDecisionFeatureFlags().closingWindowEnabled).toBe(false);
  });

  it("enables when DECISION_ENGINE_ENABLED=true", () => {
    process.env.DECISION_ENGINE_ENABLED = "true";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(true);
    process.env.CLOSING_WINDOW_ENABLED = "true";
    expect(getDecisionFeatureFlags().closingWindowEnabled).toBe(true);
  });
});
