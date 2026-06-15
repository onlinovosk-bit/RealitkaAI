import { describe, expect, it } from "vitest";
import {
  advanceWizardState,
  completeWizardState,
  normalizeWizardState,
  skipWizardState,
} from "@/lib/onboarding-wizard";
import {
  buildWizardMilestoneRecord,
  pickWizardMilestoneNode,
  resolveActivationStateForWizard,
} from "../wizard-events";

describe("resolveActivationStateForWizard", () => {
  it("maps early wizard steps to S0 without snapshot", () => {
    const fresh = normalizeWizardState(null);
    expect(resolveActivationStateForWizard(fresh)).toBe("S0");
    expect(resolveActivationStateForWizard(advanceWizardState(fresh))).toBe("S0");
  });

  it("uses live snapshot for S1 after import", () => {
    const step3 = { wizardCompleted: false, wizardSkipped: false, wizardStep: 3 as const };
    expect(
      resolveActivationStateForWizard(step3, { hasImport: true, scoredLeadCount: 0 }),
    ).toBe("S1");
  });

  it("uses live snapshot for S3 when activated", () => {
    const done = completeWizardState(normalizeWizardState(null));
    expect(
      resolveActivationStateForWizard(done, {
        hasImport: true,
        scoredLeadCount: 2,
        morningReportEnabled: true,
      }),
    ).toBe("S3");
  });

  it("maps skipped wizard to S4 fallback", () => {
    expect(resolveActivationStateForWizard(skipWizardState(normalizeWizardState(null)))).toBe("S4");
  });
});

describe("wizard milestone nodes", () => {
  it("picks office milestone on save-office", () => {
    const prev = normalizeWizardState(null);
    const next = advanceWizardState({ ...prev, wizardStep: 1 });
    expect(pickWizardMilestoneNode("save-office", prev, next, "S0")).toBe("wizard_s0_office_saved");
  });

  it("picks import step milestone when advancing to step 2", () => {
    const prev = normalizeWizardState(null);
    const next = advanceWizardState(prev);
    expect(pickWizardMilestoneNode("advance", prev, next, "S0")).toBe("wizard_s0_import_step");
  });

  it("picks completed milestone on wizard finish", () => {
    const prev = { wizardCompleted: false, wizardSkipped: false, wizardStep: 3 as const };
    const next = completeWizardState(prev);
    const record = buildWizardMilestoneRecord("complete", prev, next, "S3");
    expect(record.node).toBe("wizard_s3_completed");
    expect(record.activationState).toBe("S3");
  });

  it("picks skipped milestone", () => {
    const prev = normalizeWizardState(null);
    const next = skipWizardState(prev);
    expect(pickWizardMilestoneNode("skip", prev, next, "S4")).toBe("wizard_skipped");
  });
});
