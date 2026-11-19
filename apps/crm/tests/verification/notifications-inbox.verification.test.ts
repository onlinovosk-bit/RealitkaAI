import { describe, expect, it } from "vitest";
import { canViewInboxNotification, isInboxOwner } from "@/lib/notifications/inbox-access";

describe("[verification] Notifications inbox role gating", () => {
  it("owner sees ceo_command and agency-wide rows", () => {
    const owner = { role: "owner", ui_role: "owner_vision", id: "owner-1" };
    expect(isInboxOwner(owner)).toBe(true);
    expect(
      canViewInboxNotification(owner, { profile_id: null, type: "ceo_command" }),
    ).toBe(true);
    expect(
      canViewInboxNotification(owner, { profile_id: "agent-2", type: "deal_risk" }),
    ).toBe(true);
  });

  it("maklér sees only own profile_id rows, never ceo_command", () => {
    const agent = { role: "agent", ui_role: "agent", id: "agent-1" };
    expect(isInboxOwner(agent)).toBe(false);
    expect(
      canViewInboxNotification(agent, { profile_id: "agent-1", type: "seller_rescue" }),
    ).toBe(true);
    expect(
      canViewInboxNotification(agent, { profile_id: null, type: "weekly_performance" }),
    ).toBe(false);
    expect(
      canViewInboxNotification(agent, { profile_id: null, type: "ceo_command" }),
    ).toBe(false);
  });
});
