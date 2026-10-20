import { describe, expect, it } from "vitest";
import { usersForPlanParam } from "../preselect";

describe("usersForPlanParam", () => {
  it("pásmo → spodná hranica používateľov", () => {
    expect(usersForPlanParam("start")).toBe(1);
    expect(usersForPlanParam("team")).toBe(2);
    expect(usersForPlanParam("office")).toBe(6);
    expect(usersForPlanParam("network")).toBe(11);
  });
  it("neznáma, prázdna alebo chýbajúca hodnota nič nepredvyberie", () => {
    for (const v of ["", "enterprise", "TEAM", "__proto__", null, undefined]) {
      expect(usersForPlanParam(v as string | null | undefined)).toBeNull();
    }
  });
});
