import { describe, expect, it } from "vitest";
import { getNavItems } from "@/types/navigation";

describe("navigation module policy guard", () => {
  it("hides protocol modules for owner_vision", () => {
    const items = getNavItems("owner_vision", undefined, "market_vision");
    const ids = items.map((item) => item.id);

    expect(ids).not.toContain("competition");
    expect(ids).not.toContain("hidden-market");
  });

  it("shows protocol modules for owner_protocol", () => {
    const items = getNavItems("owner_protocol", undefined, "protocol_authority");
    const ids = items.map((item) => item.id);

    expect(ids).toContain("competition");
    expect(ids).toContain("hidden-market");
  });
});

