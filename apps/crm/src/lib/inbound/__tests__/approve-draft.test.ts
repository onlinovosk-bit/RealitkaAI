import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tier-3 approval path for REVOLIS-INBOUND-AUTOREPLY drafts.
 * The prohibited behaviours matter most: no send without a claim, no second
 * send, no cross-tenant approval, no text other than the one approved.
 */

const mockLogAiAction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai-action-audit", () => ({ logAiAction: (...a: unknown[]) => mockLogAiAction(...a) }));
vi.mock("@/lib/multi-channel-sender", () => ({ sendMessage: vi.fn() }));

import { approveAndSendInboundDraft } from "../approve-draft";

const AGENCY = "agency-A";
const LEAD = "lead-1";
const ACT = "act-1";

function draftMeta(overrides: Record<string, unknown> = {}) {
  return {
    draft: true,
    requires_approval: true,
    agent_id: "REVOLIS-INBOUND-AUTOREPLY",
    prompt_version: "inbound-autoreply-v1",
    channel: "email",
    subject: "Ďakujeme za záujem",
    body: "Dobrý deň, ozveme sa do hodiny.",
    recipient: "jan@example.com",
    ...overrides,
  };
}

/** Minimal in-memory stand-in for the PostgREST calls approve-draft makes. */
function fakeAdmin(opts: {
  activity?: { id: string; lead_id: string; meta: Record<string, unknown> } | null;
  lead?: { id: string; agency_id: string | null } | null;
  claimWins?: boolean;
}) {
  const activity =
    opts.activity === undefined ? { id: ACT, lead_id: LEAD, meta: draftMeta() } : opts.activity;
  const lead = opts.lead === undefined ? { id: LEAD, agency_id: AGENCY } : opts.lead;
  const metaWrites: Record<string, unknown>[] = [];
  const claimFilters: string[] = [];

  const admin = {
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: table === "activities" ? activity : lead,
              error: null,
            }),
          }),
        }),
        update: (row: { meta: Record<string, unknown> }) => {
          metaWrites.push(row.meta);
          const final = Promise.resolve({ error: null });
          return {
            eq: () =>
              Object.assign(final, {
                or: (filter: string) => {
                  claimFilters.push(filter);
                  return {
                    select: async () => ({
                      data: opts.claimWins === false ? [] : [{ id: ACT }],
                      error: null,
                    }),
                  };
                },
              }),
          };
        },
      };
    },
  };
  return { admin: admin as never, metaWrites, claimFilters };
}

const approver = { profileId: "p-1", agencyId: AGENCY, label: "makler@rk.sk" };

describe("approveAndSendInboundDraft", () => {
  const send = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAiAction.mockResolvedValue(undefined);
    send.mockResolvedValue({ ok: true, channel: "email", to: "jan@example.com", messageId: "msg-1" });
  });

  it("sends exactly the stored subject and body to the stored recipient", async () => {
    const { admin } = fakeAdmin({});
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });

    expect(res).toEqual({ ok: true, messageId: "msg-1" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "jan@example.com",
      channel: "email",
      subject: "Ďakujeme za záujem",
      body: "Dobrý deň, ozveme sa do hodiny.",
    });
  });

  it("claims the row before sending, then records sent + message id", async () => {
    const { admin, metaWrites, claimFilters } = fakeAdmin({});
    await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });

    expect(claimFilters).toEqual(["meta->>approval_state.is.null,meta->>approval_state.eq.send_failed"]);
    expect(metaWrites[0]).toMatchObject({ approval_state: "sending", approved_by: "makler@rk.sk" });
    expect(metaWrites[1]).toMatchObject({ approval_state: "sent", message_id: "msg-1" });
  });

  it("audits human_approved before the send and sent after it", async () => {
    const { admin } = fakeAdmin({});
    const order: string[] = [];
    mockLogAiAction.mockImplementation(async (a: { actionKind: string }) => { order.push(a.actionKind); });
    send.mockImplementation(async () => { order.push("SEND"); return { ok: true, channel: "email", to: "x", messageId: "m" }; });

    await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(order).toEqual(["human_approved", "SEND", "sent"]);
    expect(mockLogAiAction.mock.calls[0][0]).toMatchObject({ agencyId: AGENCY, leadId: LEAD, profileId: "p-1" });
  });

  it("does not send when another request already claimed the draft (double click)", async () => {
    const { admin } = fakeAdmin({ claimWins: false });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res).toMatchObject({ ok: false, status: 409 });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["sent", "sending"])("refuses a draft already in state %s", async (state) => {
    const { admin } = fakeAdmin({ activity: { id: ACT, lead_id: LEAD, meta: draftMeta({ approval_state: state }) } });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res).toMatchObject({ ok: false, status: 409 });
    expect(send).not.toHaveBeenCalled();
  });

  it("allows a retry after send_failed", async () => {
    const { admin } = fakeAdmin({ activity: { id: ACT, lead_id: LEAD, meta: draftMeta({ approval_state: "send_failed" }) } });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refuses a broker from another agency with a 404 (no existence leak)", async () => {
    const { admin } = fakeAdmin({ lead: { id: LEAD, agency_id: "agency-B" } });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res).toMatchObject({ ok: false, status: 404 });
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an approver without an agency", async () => {
    const { admin } = fakeAdmin({});
    const res = await approveAndSendInboundDraft({
      admin, leadId: LEAD, activityId: ACT, approver: { ...approver, agencyId: null }, send,
    });
    expect(res).toMatchObject({ ok: false, status: 403 });
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an activity that belongs to a different lead", async () => {
    const { admin } = fakeAdmin({ activity: { id: ACT, lead_id: "other-lead", meta: draftMeta() } });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res).toMatchObject({ ok: false, status: 404 });
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["not an inbound draft", { agent_id: "REVOLIS-FOLLOWUP-SWEEP" }],
    ["not flagged as draft", { draft: false }],
    ["no approval requirement", { requires_approval: false }],
  ])("refuses an activity that is %s (422)", async (_label, override) => {
    const { admin } = fakeAdmin({ activity: { id: ACT, lead_id: LEAD, meta: draftMeta(override) } });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res).toMatchObject({ ok: false, status: 422 });
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a legacy draft without stored body instead of regenerating text", async () => {
    const { admin } = fakeAdmin({ activity: { id: ACT, lead_id: LEAD, meta: draftMeta({ body: undefined }) } });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res).toMatchObject({ ok: false, status: 422 });
    expect(send).not.toHaveBeenCalled();
  });

  it("records send_failed and returns 502 when the provider fails", async () => {
    const { admin, metaWrites } = fakeAdmin({});
    send.mockResolvedValue({ ok: false, channel: "email", to: "x", error: "Chýba OUTREACH_FROM_EMAIL" });
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });

    expect(res).toMatchObject({ ok: false, status: 502 });
    expect(metaWrites[1]).toMatchObject({ approval_state: "send_failed", last_error: "Chýba OUTREACH_FROM_EMAIL" });
    const kinds = mockLogAiAction.mock.calls.map((c) => (c[0] as { actionKind: string }).actionKind);
    expect(kinds).toEqual(["human_approved", "send_failed"]);
  });

  it("treats a thrown sender as send_failed, not as success", async () => {
    const { admin, metaWrites } = fakeAdmin({});
    send.mockRejectedValue(new Error("network down"));
    const res = await approveAndSendInboundDraft({ admin, leadId: LEAD, activityId: ACT, approver, send });
    expect(res).toMatchObject({ ok: false, status: 502 });
    expect(metaWrites[1]).toMatchObject({ approval_state: "send_failed" });
  });

  it("kill switch blocks the send even after the broker approves — no claim, no send", async () => {
    const { admin, metaWrites } = fakeAdmin({});
    const res = await approveAndSendInboundDraft({
      admin, leadId: LEAD, activityId: ACT, approver, send,
      systemState: { degraded: false, killSwitch: true },
    });
    expect(res).toMatchObject({ ok: false, status: 503 });
    expect(send).not.toHaveBeenCalled();
    expect(metaWrites).toHaveLength(0);
    expect(mockLogAiAction).not.toHaveBeenCalled();
  });

  it("records the Control Contract verdict on the draft and in the audit", async () => {
    const { admin, metaWrites } = fakeAdmin({});
    await approveAndSendInboundDraft({
      admin, leadId: LEAD, activityId: ACT, approver, send,
      systemState: { degraded: false, killSwitch: false },
    });
    const rules = (metaWrites[0] as { authority_rules: string[] }).authority_rules;
    expect(rules).toEqual(
      expect.arrayContaining(["irreversible_floor", "externally_visible_floor", "approval_granted"]),
    );
    expect(metaWrites[0]).toHaveProperty("authority_policy");
    expect(mockLogAiAction.mock.calls[0][0].meta).toMatchObject({
      action: "inbound.reply.email.send",
      authority_rules: rules,
    });
  });
});
