import { classifyActivationState, isActivated } from "./health";
import type { ActivationEmailNode, ActivationState, AgencyActivationSnapshot } from "./types";

export interface SequenceDecision {
  node: ActivationEmailNode | null;
  state: ActivationState;
  reason: string;
  founderDraftOnly?: boolean;
}

/**
 * Vyberie ďalší e-mailový uzol podľa dňa D a stavu S0–S4.
 * Suppression (max 1/deň) rieši dispatch cez DB unique index + denný guard.
 */
export function pickActivationEmailNode(
  snapshot: AgencyActivationSnapshot,
  alreadySentNodes: Set<string>,
  now = Date.now(),
): SequenceDecision {
  const state = classifyActivationState(snapshot, now);
  const d = snapshot.daysSinceSignup;

  if (snapshot.optOut) {
    return { node: null, state, reason: "opt_out" };
  }

  if (state === "S3") {
    if (!alreadySentNodes.has("d7_activated") && d >= 7) {
      return { node: "d7_activated", state, reason: "activated_d7_congrats" };
    }
    return { node: null, state, reason: "activated_sequence_stopped" };
  }

  if (d === 0 && !alreadySentNodes.has("d0")) {
    return { node: "d0", state, reason: "day0_welcome" };
  }

  if (d >= 2 && d < 5) {
    if (state === "S0" && !alreadySentNodes.has("d2_s0")) {
      return { node: "d2_s0", state, reason: "day2_import_friction" };
    }
    if (state === "S1" && !alreadySentNodes.has("d2_s1")) {
      return { node: "d2_s1", state, reason: "day2_first_priorities" };
    }
    if (state === "S2" && !alreadySentNodes.has("d2_s2")) {
      return { node: "d2_s2", state, reason: "day2_enable_report" };
    }
  }

  if (d >= 5 && d < 7) {
    if (state === "S4" && !alreadySentNodes.has("d5_founder_draft")) {
      return {
        node: "d5_founder_draft",
        state,
        reason: "day5_founder_rescue_draft",
        founderDraftOnly: true,
      };
    }
    if ((state === "S2" || state === "S1") && !alreadySentNodes.has("d5_progress")) {
      return { node: "d5_progress", state, reason: "day5_week_numbers" };
    }
  }

  if (isActivated(snapshot) && d >= 7 && !alreadySentNodes.has("d7_activated")) {
    return { node: "d7_activated", state: "S3", reason: "day7_habit" };
  }

  return { node: null, state, reason: "no_eligible_node" };
}
