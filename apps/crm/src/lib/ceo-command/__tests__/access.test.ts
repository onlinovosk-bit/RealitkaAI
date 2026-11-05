import { describe, expect, it } from "vitest";
import { isCeoCommandOwner } from "../access";

describe("isCeoCommandOwner", () => {
  it("matches DB owner/founder role", () => {
    expect(isCeoCommandOwner({ role: "owner" })).toBe(true);
    expect(isCeoCommandOwner({ role: "founder", ui_role: "agent" })).toBe(true);
    expect(isCeoCommandOwner({ role: "owner", ui_role: "agent" })).toBe(true);
  });

  it("rejects billing ui_role without owner/founder DB role", () => {
    expect(isCeoCommandOwner({ ui_role: "owner_vision" })).toBe(false);
    expect(isCeoCommandOwner({ ui_role: "owner_protocol", role: "agent" })).toBe(false);
    expect(isCeoCommandOwner({ ui_role: "agent", role: "agent" })).toBe(false);
  });
});
