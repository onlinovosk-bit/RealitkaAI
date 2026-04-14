import { describe, expect, it } from "vitest";
import {
  GOLD_STANDARD_POPRAD_STUROVA_3I,
  runPopradGoldMatchingSimulation,
} from "@/lib/mock-data";

describe("Poprad Štúrova gold listing — matching simulation", () => {
  it("nájde aspoň jeden lead so skóre > 90 % (Lucia Petrášová / Poprad)", () => {
    const matches = runPopradGoldMatchingSimulation(90);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].matchScore).toBeGreaterThan(90);
    expect(matches.some((m) => m.leadId === "6")).toBe(true);
  });

  it("gold property má očakávané parametre prenájmu", () => {
    expect(GOLD_STANDARD_POPRAD_STUROVA_3I.price).toBe(704);
    expect(GOLD_STANDARD_POPRAD_STUROVA_3I.rooms).toBe("3 izby");
    expect(GOLD_STANDARD_POPRAD_STUROVA_3I.location).toMatch(/Poprad/i);
  });
});
