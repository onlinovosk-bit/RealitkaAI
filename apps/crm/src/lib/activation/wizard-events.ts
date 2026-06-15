import type { SupabaseClient } from "@supabase/supabase-js";
import type { WizardState, WizardStepNumber } from "@/lib/onboarding-wizard";
import { classifyActivationState } from "./health";
import type { ActivationState, AgencyActivationSnapshot } from "./types";

export type WizardMilestoneNode =
  | "wizard_s0_office_saved"
  | "wizard_s0_import_step"
  | "wizard_s1_import_ready"
  | "wizard_s2_brief_step"
  | "wizard_s3_completed"
  | "wizard_skipped";

export type WizardTransitionAction = "save-office" | "advance" | "skip" | "complete";

export type WizardMilestoneRecord = {
  at: string;
  action: WizardTransitionAction;
  node: WizardMilestoneNode;
  activationState: ActivationState;
  wizardStep: WizardStepNumber;
  previousStep: WizardStepNumber;
};

type SnapshotSlice = Pick<
  AgencyActivationSnapshot,
  "hasImport" | "scoredLeadCount" | "morningReportEnabled" | "daysSinceSignup" | "lastLoginAt"
>;

/**
 * Maps wizard UI progress to S0–S4 when live agency metrics are not yet available.
 * Prefers classifyActivationState when snapshot fields are present.
 */
export function resolveActivationStateForWizard(
  wizard: WizardState,
  snapshot?: Partial<SnapshotSlice> | null,
  now = Date.now(),
): ActivationState {
  if (snapshot && hasSnapshotSignals(snapshot)) {
    return classifyActivationState(
      {
        agencyId: "wizard",
        agencyName: "wizard",
        agencyCreatedAt: new Date().toISOString(),
        ownerEmail: "wizard@local",
        ownerName: "wizard",
        painMirror: "",
        hasImport: Boolean(snapshot.hasImport),
        scoredLeadCount: snapshot.scoredLeadCount ?? 0,
        highestScore: null,
        morningReportEnabled: Boolean(snapshot.morningReportEnabled),
        lastLoginAt: snapshot.lastLoginAt ?? null,
        daysSinceSignup: snapshot.daysSinceSignup ?? 0,
        optOut: false,
      },
      now,
    );
  }

  if (wizard.wizardSkipped) return "S4";
  if (wizard.wizardCompleted) return "S3";
  if (wizard.wizardStep >= 3) return "S2";
  return "S0";
}

function hasSnapshotSignals(snapshot: Partial<SnapshotSlice>): boolean {
  return (
    snapshot.hasImport !== undefined ||
    snapshot.scoredLeadCount !== undefined ||
    snapshot.morningReportEnabled !== undefined ||
    snapshot.daysSinceSignup !== undefined
  );
}

export function pickWizardMilestoneNode(
  action: WizardTransitionAction,
  previous: WizardState,
  next: WizardState,
  activationState: ActivationState,
): WizardMilestoneNode {
  if (action === "skip" || next.wizardSkipped) return "wizard_skipped";
  if (action === "complete" || next.wizardCompleted) return "wizard_s3_completed";
  if (action === "save-office") return "wizard_s0_office_saved";

  if (next.wizardStep === 2) return "wizard_s0_import_step";
  if (next.wizardStep === 3) {
    return activationState === "S1" || activationState === "S2"
      ? "wizard_s1_import_ready"
      : "wizard_s2_brief_step";
  }

  if (previous.wizardStep === 2 && next.wizardStep > 2) {
    return activationState === "S0" ? "wizard_s0_import_step" : "wizard_s1_import_ready";
  }

  return "wizard_s0_office_saved";
}

export function buildWizardMilestoneRecord(
  action: WizardTransitionAction,
  previous: WizardState,
  next: WizardState,
  activationState: ActivationState,
  at = new Date().toISOString(),
): WizardMilestoneRecord {
  return {
    at,
    action,
    node: pickWizardMilestoneNode(action, previous, next, activationState),
    activationState,
    wizardStep: next.wizardStep,
    previousStep: previous.wizardStep,
  };
}

export function appendWizardMilestoneToChecklist(
  checklist: Record<string, unknown>,
  milestone: WizardMilestoneRecord,
): Record<string, unknown> {
  const existing = Array.isArray(checklist.activationMilestones)
    ? (checklist.activationMilestones as WizardMilestoneRecord[])
    : [];

  return {
    ...checklist,
    activationMilestones: [...existing, milestone],
    lastActivationState: milestone.activationState,
    lastWizardMilestone: milestone.node,
  };
}

export async function logWizardMilestoneToActivationEvents(
  admin: SupabaseClient,
  input: {
    agencyId: string;
    recipientEmail: string;
    milestone: WizardMilestoneRecord;
  },
): Promise<void> {
  const { error } = await admin.from("activation_email_events").insert({
    agency_id: input.agencyId,
    node: input.milestone.node,
    activation_state: input.milestone.activationState,
    recipient_email: input.recipientEmail,
    subject: `wizard:${input.milestone.action}`,
    status: "skipped_flag",
    meta: {
      eventType: "wizard_milestone",
      action: input.milestone.action,
      wizardStep: input.milestone.wizardStep,
      previousStep: input.milestone.previousStep,
      at: input.milestone.at,
    },
  });

  if (error) {
    console.warn("[wizard-events] activation_email_events insert skipped:", error.message);
  }
}
