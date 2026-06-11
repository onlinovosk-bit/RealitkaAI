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
    expect(flags.closingWindowEnabled).toBe(false);
    expect(flags.rescueAutomationEnabled).toBe(false);
  });

  it("opt-in: OFF unless explicitly enabled (production)", () => {
    clearFlags();
    process.env.VERCEL_ENV = "production";

    const unset = getDecisionFeatureFlags();
    expect(unset.decisionEngineEnabled).toBe(false);
    expect(unset.closingWindowEnabled).toBe(false);
    expect(unset.rescueAutomationEnabled).toBe(false);

    process.env.DECISION_ENGINE_ENABLED = "true";
    process.env.CLOSING_WINDOW_ENABLED = "true";
    process.env.RESCUE_AUTOMATION_ENABLED = "true";
    const enabled = getDecisionFeatureFlags();
    expect(enabled.decisionEngineEnabled).toBe(true);
    expect(enabled.closingWindowEnabled).toBe(true);
    expect(enabled.rescueAutomationEnabled).toBe(true);

    process.env.DECISION_ENGINE_ENABLED = "false";
    process.env.CLOSING_WINDOW_ENABLED = "false";
    process.env.RESCUE_AUTOMATION_ENABLED = "false";
    const disabled = getDecisionFeatureFlags();
    expect(disabled.decisionEngineEnabled).toBe(false);
    expect(disabled.closingWindowEnabled).toBe(false);
    expect(disabled.rescueAutomationEnabled).toBe(false);
  });

  it("enables explicitly in local dev when DECISION_ENGINE_ENABLED=true", () => {
    process.env.DECISION_ENGINE_ENABLED = "true";
    expect(getDecisionFeatureFlags().decisionEngineEnabled).toBe(true);
  });
});
