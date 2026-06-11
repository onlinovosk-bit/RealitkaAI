import { describe, expect, it } from "vitest";
import {
  advanceWizardState,
  completeWizardState,
  extractWizardFromChecklist,
  isWizardComplete,
  normalizeWizardState,
  resolvePostLoginPath,
  resolveWizardPath,
  shouldShowWizard,
  skipWizardState,
} from "../onboarding-wizard";

describe("onboarding wizard state", () => {
  it("normalizes invalid step to 1", () => {
    expect(normalizeWizardState({ wizardStep: 99 }).wizardStep).toBe(1);
  });

  it("marks complete when skipped or completed", () => {
    expect(isWizardComplete(completeWizardState(normalizeWizardState(null)))).toBe(true);
    expect(isWizardComplete(skipWizardState(normalizeWizardState(null)))).toBe(true);
    expect(isWizardComplete(normalizeWizardState(null))).toBe(false);
  });

  it("advances through steps and completes at step 3", () => {
    let state = normalizeWizardState(null);
    state = advanceWizardState(state);
    expect(state.wizardStep).toBe(2);
    state = advanceWizardState(state);
    expect(state.wizardStep).toBe(3);
    state = advanceWizardState(state);
    expect(state.wizardCompleted).toBe(true);
  });

  it("extracts wizard fields from checklist json", () => {
    const state = extractWizardFromChecklist({
      wizardCompleted: true,
      wizardSkipped: false,
      wizardStep: 3,
      importedLeads: true,
    });
    expect(state.wizardCompleted).toBe(true);
    expect(state.wizardStep).toBe(3);
  });
});

describe("onboarding wizard gate", () => {
  it("shows wizard only for owner/founder when enabled", () => {
    const fresh = normalizeWizardState(null);
    expect(shouldShowWizard(true, fresh, "owner")).toBe(true);
    expect(shouldShowWizard(true, fresh, "founder")).toBe(true);
    expect(shouldShowWizard(true, fresh, "agent")).toBe(false);
    expect(shouldShowWizard(false, fresh, "owner")).toBe(false);
  });

  it("resolves post-login path to wizard when incomplete", () => {
    const fresh = normalizeWizardState(null);
    expect(resolvePostLoginPath(true, fresh, "owner", "/dashboard")).toBe("/get-started/1");
    expect(resolvePostLoginPath(true, completeWizardState(fresh), "owner", "/dashboard")).toBe("/dashboard");
  });

  it("resolves wizard path from stored step", () => {
    expect(resolveWizardPath({ wizardCompleted: false, wizardSkipped: false, wizardStep: 2 })).toBe(
      "/get-started/2",
    );
    expect(resolveWizardPath(completeWizardState(normalizeWizardState(null)))).toBe("/dashboard");
  });
});
