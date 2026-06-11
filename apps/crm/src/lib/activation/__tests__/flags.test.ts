import { afterEach, describe, expect, it } from "vitest";
import {
  getActivationFeatureFlags,
  isOnboardingEmailsEnabled,
} from "../flags";

const WIZARD_KEY = "ONBOARDING_WIZARD_ENABLED";
const EMAILS_KEY = "ONBOARDING_EMAILS_ENABLED";

afterEach(() => {
  delete process.env[WIZARD_KEY];
  delete process.env[EMAILS_KEY];
});

describe("getActivationFeatureFlags", () => {
  it("defaults both flags off when unset", () => {
    expect(getActivationFeatureFlags()).toEqual({
      onboardingWizardEnabled: false,
      onboardingEmailsEnabled: false,
    });
  });

  it("enables wizard only when explicitly true", () => {
    process.env[WIZARD_KEY] = "true";
    expect(getActivationFeatureFlags().onboardingWizardEnabled).toBe(true);
    expect(getActivationFeatureFlags().onboardingEmailsEnabled).toBe(false);
  });

  it("enables emails only when explicitly true", () => {
    process.env[EMAILS_KEY] = "true";
    expect(getActivationFeatureFlags().onboardingEmailsEnabled).toBe(true);
    expect(getActivationFeatureFlags().onboardingWizardEnabled).toBe(false);
  });

  it("treats explicit false as off", () => {
    process.env[WIZARD_KEY] = "false";
    process.env[EMAILS_KEY] = "false";
    expect(getActivationFeatureFlags().onboardingWizardEnabled).toBe(false);
    expect(getActivationFeatureFlags().onboardingEmailsEnabled).toBe(false);
  });
});

describe("isOnboardingEmailsEnabled", () => {
  it("mirrors onboardingEmailsEnabled flag", () => {
    process.env[EMAILS_KEY] = "true";
    expect(isOnboardingEmailsEnabled()).toBe(true);
  });
});
