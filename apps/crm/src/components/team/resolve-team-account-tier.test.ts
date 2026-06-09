import { describe, expect, it } from "vitest";
import { resolveTeamAccountTier } from "@/components/team/resolve-team-account-tier";

describe("resolveTeamAccountTier", () => {
  it("maps owner_vision to market_vision", () => {
    expect(resolveTeamAccountTier({ ui_role: "owner_vision", account_tier: null })).toBe(
      "market_vision",
    );
  });

  it("keeps owner_protocol as protocol_authority", () => {
    expect(
      resolveTeamAccountTier({ ui_role: "owner_protocol", account_tier: "market_vision" }),
    ).toBe("protocol_authority");
  });

  it("prefers agencies.manual_plan when profile has no account_tier", () => {
    expect(
      resolveTeamAccountTier({ ui_role: "agent", account_tier: null }, "market_vision"),
    ).toBe("market_vision");
  });
});
