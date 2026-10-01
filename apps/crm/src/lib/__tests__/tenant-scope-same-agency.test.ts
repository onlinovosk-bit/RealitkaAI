import { describe, expect, it } from "vitest";
import { sameAgency } from "@/lib/tenant-scope";

const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("sameAgency — fail closed", () => {
  it("povolí iba presnú zhodu", () => {
    expect(sameAgency(A, A)).toBe(true);
    expect(sameAgency(A, B)).toBe(false);
  });

  it("odmietne chýbajúcu agentúru volajúceho", () => {
    // Toto je presne ten prípad, ktorý starý vzor prepúšťal.
    for (const caller of [null, undefined, ""]) {
      expect(sameAgency(caller, A)).toBe(false);
    }
  });

  it("odmietne riadok bez agentúry", () => {
    for (const row of [null, undefined, ""]) {
      expect(sameAgency(A, row)).toBe(false);
    }
  });

  it("odmietne, keď chýbajú obe — nie je čo porovnať", () => {
    expect(sameAgency(null, null)).toBe(false);
    expect(sameAgency("", "")).toBe(false);
    expect(sameAgency(undefined, undefined)).toBe(false);
  });
});
