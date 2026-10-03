import { describe, expect, it } from "vitest";
import { canViewInboxNotification, isInboxOwner } from "@/lib/notifications/inbox-access";

describe("inbox-access", () => {
  it("treats owner role and owner ui_roles as inbox owner", () => {
    expect(isInboxOwner({ role: "owner", ui_role: "agent", id: "p-1" })).toBe(true);
    expect(isInboxOwner({ ui_role: "owner_vision", id: "p-1" })).toBe(true);
    expect(isInboxOwner({ ui_role: "owner_protocol", id: "p-1" })).toBe(true);
  });

  it("treats agents as non-owner", () => {
    expect(isInboxOwner({ role: "agent", ui_role: "agent", id: "p-1" })).toBe(false);
    expect(isInboxOwner(null)).toBe(false);
  });

  it("allows agents only their profile-scoped rows", () => {
    const agent = { role: "agent", ui_role: "agent", id: "agent-1" };
    expect(
      canViewInboxNotification(agent, {
        profile_id: "agent-1",
        type: "seller_rescue",
      }),
    ).toBe(true);
    expect(
      canViewInboxNotification(agent, {
        profile_id: "agent-2",
        type: "seller_rescue",
      }),
    ).toBe(false);
    expect(
      canViewInboxNotification(agent, {
        profile_id: null,
        type: "seller_rescue",
      }),
    ).toBe(false);
  });

  it("denies ceo_command to agents and allows owners", () => {
    const agent = { role: "agent", ui_role: "agent", id: "agent-1" };
    const owner = { role: "owner", ui_role: "owner_vision", id: "owner-1" };
    const ceoRow = { profile_id: null, type: "ceo_command" };
    expect(canViewInboxNotification(agent, ceoRow)).toBe(false);
    expect(canViewInboxNotification(owner, ceoRow)).toBe(true);
  });

  it("allows owners agency-wide routine rows", () => {
    const owner = { role: "owner", ui_role: "owner_vision", id: "owner-1" };
    expect(
      canViewInboxNotification(owner, {
        profile_id: "agent-9",
        type: "deal_risk",
      }),
    ).toBe(true);
  });
});
