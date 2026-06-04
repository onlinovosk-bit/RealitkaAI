import { describe, expect, it } from "vitest";
import { getMenuVariant } from "@/types/navigation";

describe("getMenuVariant account_tier fallback", () => {
  it("maps owner + market_vision tier when ui_role is agent", () => {
    expect(getMenuVariant("agent", false, "owner", "market_vision")).toBe(
      "owner_vision",
    );
  });

  it("keeps agent_team when agent in team", () => {
    expect(getMenuVariant("agent", true, "agent", "pro")).toBe("agent_team");
  });
});
