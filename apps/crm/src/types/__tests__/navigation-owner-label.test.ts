import { describe, expect, it } from "vitest";
import { VARIANT_THEMES } from "@/types/navigation";

describe("owner navigation labels", () => {
  it("shows owner role as Majiteľ RK for owner_vision", () => {
    expect(VARIANT_THEMES.owner_vision.roleLabel).toBe("Majiteľ RK");
    expect(VARIANT_THEMES.owner_vision.planLabel).toBe("Market Vision");
  });
});
