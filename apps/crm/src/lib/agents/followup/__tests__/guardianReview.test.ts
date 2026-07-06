import { describe, expect, it, beforeEach } from "vitest";
import { clearCapabilityAuditForTests, listCapabilityAudit } from "@/lib/capabilities/_shared/audit-log";
import {
  attachGuardianToDrafts,
  reviewFollowupDraft,
  summarizeGuardianDrafts,
} from "@/lib/agents/followup/guardianReview";
import type { DraftAction, FollowupLeadInput } from "@/lib/agents/followup/types";

const AGENCY = "11111111-1111-1111-1111-111111111111";

const baseDraft: DraftAction = {
  leadId: "lead-1",
  leadName: "Ján Novák",
  decision: "follow_up_email",
  channel: "email",
  body: "Dobrý deň, píšem z Reality Smolko — máte ešte záujem?",
  reason: "stale contact",
};

const baseLead: FollowupLeadInput = {
  id: "lead-1",
  name: "Ján Novák",
  email: "jan@example.com",
  phone: "+421900000000",
  status: "Teplý",
};

describe("followup guardianReview", () => {
  beforeEach(() => {
    clearCapabilityAuditForTests();
  });

  it("PASS for standard Smolko follow-up draft", () => {
    const result = reviewFollowupDraft(baseDraft, baseLead, AGENCY);
    expect(result.verdict).toBe("pass");
    expect(result.blockedSend).toBe(false);
    expect(listCapabilityAudit("quality-guardian")).toHaveLength(1);
  });

  it("FLAG when body contains invented price", () => {
    const result = reviewFollowupDraft(
      { ...baseDraft, body: "Ponúkame byt za 150000 EUR." },
      baseLead,
      AGENCY,
    );
    expect(result.verdict).toBe("flag");
    expect(result.reasons).toContain("invented_price_in_followup");
  });

  it("FLAG when email channel but lead has no email", () => {
    const result = reviewFollowupDraft(baseDraft, { ...baseLead, email: null }, AGENCY);
    expect(result.reasons).toContain("missing_email_for_channel");
  });

  it("summarizeGuardianDrafts counts pass and flag", () => {
    const guarded = attachGuardianToDrafts(
      [baseDraft, { ...baseDraft, leadId: "lead-2", body: "Cena 99999 EUR" }],
      [baseLead, { ...baseLead, id: "lead-2" }],
      AGENCY,
    );
    expect(summarizeGuardianDrafts(guarded)).toEqual({ pass: 1, flag: 1, blockedSend: 1 });
  });
});
