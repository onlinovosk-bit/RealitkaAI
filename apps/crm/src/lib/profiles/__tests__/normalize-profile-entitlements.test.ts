import { describe, expect, it } from "vitest";
import {
  entitlementRank,
  normalizeProfileEntitlements,
} from "@/lib/profiles/normalize-profile-entitlements";

describe("normalizeProfileEntitlements", () => {
  it("syncs owner_vision when role=owner and account_tier=market_vision but ui_role=agent", () => {
    const out = normalizeProfileEntitlements({
      role: "owner",
      ui_role: "agent",
      account_tier: "market_vision",
    });
    expect(out?.ui_role).toBe("owner_vision");
    expect(out?.account_tier).toBe("market_vision");
  });

  it("keeps agent_solo path for pro agent", () => {
    const out = normalizeProfileEntitlements({
      role: "agent",
      ui_role: "agent",
      account_tier: "pro",
    });
    expect(out?.ui_role).toBe("agent");
    expect(out?.account_tier).toBe("pro");
  });
});

describe("entitlementRank", () => {
  it("prefers owner market_vision over agent stub", () => {
    const owner = entitlementRank({
      role: "owner",
      ui_role: "owner_vision",
      account_tier: "market_vision",
    });
    const stub = entitlementRank({
      role: "agent",
      ui_role: "agent",
      account_tier: "free",
    });
    expect(owner).toBeGreaterThan(stub);
  });
});
