import { describe, expect, it } from "vitest";
import { resolveAccountTier } from "@/lib/license/resolve-account-tier";

describe("resolveAccountTier", () => {
  it("maps owner_vision to market_vision", () => {
    expect(
      resolveAccountTier({ ui_role: "owner_vision", account_tier: "pro", role: "owner" }),
    ).toBe("market_vision");
  });

  it("maps owner_protocol to protocol_authority", () => {
    expect(
      resolveAccountTier({ ui_role: "owner_protocol", account_tier: "market_vision", role: "owner" }),
    ).toBe("protocol_authority");
  });

  it("maps founder to protocol_authority", () => {
    expect(
      resolveAccountTier({ ui_role: "agent", account_tier: "market_vision", role: "founder" }),
    ).toBe("protocol_authority");
  });
});
