import { afterEach, describe, expect, it } from "vitest";
import { getActivationFeatureFlags } from "../flags";

const KEY = "ONBOARDING_WIZARD_ENABLED";

afterEach(() => {
  delete process.env[KEY];
});

describe("getActivationFeatureFlags", () => {
  it("defaults onboarding wizard off when unset", () => {
    delete process.env[KEY];
    expect(getActivationFeatureFlags().onboardingWizardEnabled).toBe(false);
  });

  it("enables wizard only when explicitly true", () => {
    process.env[KEY] = "true";
    expect(getActivationFeatureFlags().onboardingWizardEnabled).toBe(true);
  });

  it("treats explicit false as off", () => {
    process.env[KEY] = "false";
    expect(getActivationFeatureFlags().onboardingWizardEnabled).toBe(false);
  });
});
