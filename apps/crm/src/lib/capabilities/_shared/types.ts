/** Brief 15 — shared capability contracts (light, no enterprise registry). */

export type CapabilityAuditEntry = {
  capability: string;
  action: string;
  agencyId: string;
  entityId: string | null;
  result: "pass" | "flag" | "error";
  detail: string;
  at: string;
};

export type HumanApprovalState = "pending" | "approved" | "rejected";

export type HumanApprovalRecord = {
  capability: string;
  draftId: string;
  state: HumanApprovalState;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type PublishGateResult =
  | { ok: true; approval: HumanApprovalRecord }
  | { ok: false; reason: string };
