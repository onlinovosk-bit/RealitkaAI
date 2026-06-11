import { describe, expect, it } from "vitest";
import { isCeoCommandOwner } from "../access";

describe("isCeoCommandOwner", () => {
  it("matches owner roles from brief", () => {
    expect(isCeoCommandOwner({ role: "owner" })).toBe(true);
    expect(isCeoCommandOwner({ ui_role: "owner_vision" })).toBe(true);
  });

  it("rejects agents", () => {
    expect(isCeoCommandOwner({ ui_role: "agent", role: "agent" })).toBe(false);
  });
});
