import { describe, expect, it } from "vitest";
import { toInboundDraftView } from "../draft-view";

const base = {
  draft: true,
  requires_approval: true,
  agent_id: "REVOLIS-INBOUND-AUTOREPLY",
  subject: "S",
  body: "B",
  recipient: "a@b.sk",
};

describe("toInboundDraftView", () => {
  it("is null for ordinary activities", () => {
    expect(toInboundDraftView(null)).toBeNull();
    expect(toInboundDraftView({ category: "ai_recommendation" })).toBeNull();
    expect(toInboundDraftView({ ...base, agent_id: "OTHER" })).toBeNull();
  });

  it("pending and send_failed drafts are approvable", () => {
    expect(toInboundDraftView(base)).toMatchObject({ state: "pending", canApprove: true, recipient: "a@b.sk" });
    expect(toInboundDraftView({ ...base, approval_state: "send_failed", last_error: "x" }))
      .toMatchObject({ state: "send_failed", canApprove: true, lastError: "x" });
  });

  it("sent and sending drafts are not approvable", () => {
    expect(toInboundDraftView({ ...base, approval_state: "sent" })).toMatchObject({ canApprove: false });
    expect(toInboundDraftView({ ...base, approval_state: "sending" })).toMatchObject({ canApprove: false });
  });

  it("a draft without stored body cannot be approved", () => {
    const { body: _b, ...legacy } = base;
    expect(toInboundDraftView(legacy)).toMatchObject({ state: "pending", canApprove: false });
  });

  it("recognises follow-up sweep drafts and their channel", () => {
    const v = toInboundDraftView({ ...base, agent_id: "REVOLIS-FOLLOWUP-SWEEP", channel: "sms" });
    expect(v).toMatchObject({ channel: "sms", canApprove: true });
  });

  it("a WhatsApp draft is shown but not one-click approvable", () => {
    const v = toInboundDraftView({ ...base, agent_id: "REVOLIS-FOLLOWUP-SWEEP", channel: "whatsapp" });
    expect(v).toMatchObject({ channel: "whatsapp", canApprove: false });
  });

  it("a draft without a recipient is not approvable", () => {
    const { recipient: _r, ...noAddr } = base;
    expect(toInboundDraftView({ ...noAddr, agent_id: "REVOLIS-FOLLOWUP-SWEEP" })).toMatchObject({ canApprove: false });
  });

  it("legacy follow-up drafts (no agent_id) are not treated as approvable drafts", () => {
    expect(toInboundDraftView({ channel: "email", draft: true, broker_cc: false })).toBeNull();
  });
});
