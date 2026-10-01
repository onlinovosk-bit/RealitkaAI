import { appendCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import type { DraftAction, FollowupLeadInput, GuardedDraftAction } from "@/lib/agents/followup/types";

const CAPABILITY = "quality-guardian";

export type FollowupGuardianVerdict = GuardedDraftAction["guardian"];

type LeadContext = Pick<FollowupLeadInput, "id" | "name" | "email" | "phone">;

/**
 * Quality Guardian for Loop 1 follow-up drafts — DRAFT-ONLY gate before broker send.
 * Reuses quality-guardian audit channel; blocks send on invented property claims.
 */
export function reviewFollowupDraft(
  draft: DraftAction,
  lead: LeadContext,
  agencyId: string,
): FollowupGuardianVerdict {
  const reasons: string[] = [];

  if (!draft.body.trim()) {
    reasons.push("missing_body");
  }

  if (draft.channel === "email" && !lead.email?.trim()) {
    reasons.push("missing_email_for_channel");
  }

  if (draft.channel === "sms" && !lead.phone?.trim()) {
    reasons.push("missing_phone_for_channel");
  }

  if (/\b\d{3,7}\s*(€|EUR)/i.test(draft.body)) {
    reasons.push("invented_price_in_followup");
  }

  if (/\d+(?:[.,]\d+)?\s*m²/i.test(draft.body)) {
    reasons.push("invented_area_in_followup");
  }

  const verdict = reasons.length === 0 ? "pass" : "flag";
  const result: FollowupGuardianVerdict = {
    verdict,
    reasons,
    blockedSend: verdict === "flag",
  };

  appendCapabilityAudit({
    capability: CAPABILITY,
    action: "review_followup_draft",
    agencyId,
    entityId: lead.id,
    result: verdict === "pass" ? "pass" : "flag",
    detail: reasons.join("; ") || "ok",
  });

  return result;
}

export function attachGuardianToDrafts(
  drafts: DraftAction[],
  leads: FollowupLeadInput[],
  agencyId: string,
): GuardedDraftAction[] {
  const byId = new Map(leads.map((l) => [l.id, l]));
  return drafts.map((draft) => {
    const lead = byId.get(draft.leadId);
    return {
      ...draft,
      guardian: reviewFollowupDraft(
        draft,
        lead ?? { id: draft.leadId, name: draft.leadName, email: null, phone: null },
        agencyId,
      ),
    };
  });
}

export function summarizeGuardianDrafts(drafts: GuardedDraftAction[]): {
  pass: number;
  flag: number;
  blockedSend: number;
} {
  let pass = 0;
  let flag = 0;
  let blockedSend = 0;
  for (const draft of drafts) {
    if (draft.guardian.verdict === "pass") pass += 1;
    else flag += 1;
    if (draft.guardian.blockedSend) blockedSend += 1;
  }
  return { pass, flag, blockedSend };
}
