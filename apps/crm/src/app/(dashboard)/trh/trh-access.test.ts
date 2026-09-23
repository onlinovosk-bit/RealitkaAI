import { describe, expect, it } from "vitest";
import { isTrhUnlocked, resolveTrhAccountTier } from "./trh-access";

describe("trh access", () => {
  it("unlocks only Reality Monopol / protocol_authority", () => {
    expect(isTrhUnlocked("protocol_authority")).toBe(true);
    expect(isTrhUnlocked("market_vision")).toBe(false);
    expect(isTrhUnlocked("pro")).toBe(false);
    expect(isTrhUnlocked("free")).toBe(false);
  });

  it("uses resolveAccountTier so agency manual_plan wins", () => {
    expect(
      resolveTrhAccountTier({ account_tier: "pro", ui_role: "agent" }, "protocol_authority"),
    ).toBe("protocol_authority");
    expect(
      resolveTrhAccountTier({ account_tier: "pro", ui_role: "agent" }, null),
    ).toBe("pro");
  });
});
