import type { HumanApprovalRecord, PublishGateResult } from "@/lib/capabilities/_shared/types";

const approvals = new Map<string, HumanApprovalRecord>();

function key(capability: string, draftId: string): string {
  return `${capability}:${draftId}`;
}

export function setHumanApprovalPending(capability: string, draftId: string): HumanApprovalRecord {
  const record: HumanApprovalRecord = {
    capability,
    draftId,
    state: "pending",
    reviewedBy: null,
    reviewedAt: null,
  };
  approvals.set(key(capability, draftId), record);
  return record;
}

export function approveForPublish(
  capability: string,
  draftId: string,
  reviewedBy: string,
): HumanApprovalRecord {
  const record: HumanApprovalRecord = {
    capability,
    draftId,
    state: "approved",
    reviewedBy,
    reviewedAt: new Date().toISOString(),
  };
  approvals.set(key(capability, draftId), record);
  return record;
}

export function assertPublishAllowed(capability: string, draftId: string): PublishGateResult {
  const record = approvals.get(key(capability, draftId));
  if (!record) {
    return { ok: false, reason: "human_approval_missing" };
  }
  if (record.state !== "approved") {
    return { ok: false, reason: `human_approval_${record.state}` };
  }
  return { ok: true, approval: record };
}

export function clearHumanApprovalsForTests(): void {
  approvals.clear();
}
