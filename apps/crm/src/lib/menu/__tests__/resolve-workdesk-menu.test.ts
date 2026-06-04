import { describe, expect, it } from "vitest";
import { resolveWorkdeskMenuContext } from "@/lib/menu/resolve-workdesk-menu";

describe("resolveWorkdeskMenuContext", () => {
  it("owner_vision + market_vision → Market Vision, Majiteľ RK", () => {
    const ctx = resolveWorkdeskMenuContext({
      ui_role: "owner_vision",
      account_tier: "market_vision",
      role: "owner",
    });
    expect(ctx.variant).toBe("owner_vision");
    expect(ctx.planLabel).toBe("Market Vision");
    expect(ctx.roleLabel).toBe("Majiteľ RK");
  });

  it("stale ui_role agent + owner + market_vision → owner menu (DB tier wins)", () => {
    const ctx = resolveWorkdeskMenuContext({
      ui_role: "agent",
      account_tier: "market_vision",
      role: "owner",
    });
    expect(ctx.variant).toBe("owner_vision");
    expect(ctx.planLabel).toBe("Market Vision");
  });

  it("agent pro stays agent_solo", () => {
    const ctx = resolveWorkdeskMenuContext({
      ui_role: "agent",
      account_tier: "pro",
      role: "agent",
    });
    expect(ctx.variant).toBe("agent_solo");
    expect(ctx.planLabel).toBe("Active Force");
    expect(ctx.roleLabel).toBe("Maklér");
  });
});
