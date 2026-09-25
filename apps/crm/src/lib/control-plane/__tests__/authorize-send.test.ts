import { describe, expect, it } from "vitest";
import { authorizeSend, authorityMeta } from "../authorize-send";

const approval = { approvalId: "a-1", approvedBy: "makler@rk.sk", approvedAt: "2026-09-25T10:00:00.000Z" };
const on = { degraded: false, killSwitch: true };
const off = { degraded: false, killSwitch: false };

describe("authorizeSend — the one gate for AI → client sends", () => {
  for (const action of [
    "inbound.reply.email.send",
    "followup.email.send",
    "followup.sms.send",
    "deadlead.email.send",
    "deadlead.sms.send",
    "outreach.email.send",
  ]) {
    it(`${action}: refused without a human approval (403)`, () => {
      const r = authorizeSend({ action, agentId: "x", tenantId: "t", approval: null, systemState: off });
      expect(r).toMatchObject({ ok: false, status: 403 });
    });

    it(`${action}: allowed with an approval`, () => {
      const r = authorizeSend({ action, agentId: "x", tenantId: "t", approval, systemState: off });
      expect(r.ok).toBe(true);
    });

    it(`${action}: kill switch wins over the approval (503)`, () => {
      const r = authorizeSend({ action, agentId: "x", tenantId: "t", approval, systemState: on });
      expect(r).toMatchObject({ ok: false, status: 503 });
    });
  }

  it("an unregistered action cannot be authorized at all (500)", () => {
    const r = authorizeSend({ action: "whatsapp.blast", agentId: "x", tenantId: "t", approval, systemState: off });
    expect(r).toMatchObject({ ok: false, status: 500, verdict: null });
    expect(authorityMeta(null)).toEqual({ authority: "UNREGISTERED" });
  });
});
