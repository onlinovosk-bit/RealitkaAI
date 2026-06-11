import { describe, expect, it } from "vitest";
import { NAVIGATION_ITEMS } from "@/lib/navigation";
import { ALL_NAV_ITEMS } from "@/types/navigation";

describe("arbitrage navigation (POST-V1 hidden)", () => {
  it("excludes /arbitrage from legacy and workdesk nav while route remains", () => {
    expect(NAVIGATION_ITEMS.some((item) => item.path === "/arbitrage")).toBe(false);
    expect(ALL_NAV_ITEMS.some((item) => item.href === "/arbitrage")).toBe(false);
  });
});
