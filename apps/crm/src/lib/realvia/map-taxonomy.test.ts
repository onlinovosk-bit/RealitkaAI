import { describe, expect, it } from "vitest";
import {
  REALVIA_MAPPING_UNKNOWN,
  isRealviaMappingUnknown,
  mapCategory,
  mapTransaction,
} from "@/lib/realvia/map-taxonomy";

describe("mapCategory — honest unknown", () => {
  it("keeps known mappings (incl. legitimate Ostatné 19/20)", () => {
    expect(mapCategory(11)).toBe("Byt");
    expect(mapCategory(12)).toBe("Byt");
    expect(mapCategory(15)).toBe("Pozemok");
    expect(mapCategory(19)).toBe("Ostatné");
    expect(mapCategory(20)).toBe("Ostatné");
  });

  it("does not map disputed 13/14 to Dom (pending číselník)", () => {
    expect(mapCategory(13)).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(mapCategory(14)).toBe(REALVIA_MAPPING_UNKNOWN);
  });

  it("maps unknown codes to Neznáme — not Ostatné", () => {
    expect(mapCategory(30)).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(mapCategory(9)).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(mapCategory(30)).not.toBe("Ostatné");
  });
});

describe("mapTransaction — honest unknown", () => {
  it("keeps known Prenájom / Dražba", () => {
    expect(mapTransaction(124)).toBe("Prenájom");
    expect(mapTransaction(125)).toBe("Dražba");
  });

  it("does not map disputed 123 to Predaj (pending číselník)", () => {
    expect(mapTransaction(123)).toBe(REALVIA_MAPPING_UNKNOWN);
  });

  it("maps unknown codes to Neznáme — not Predaj", () => {
    expect(mapTransaction(122)).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(mapTransaction(127)).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(mapTransaction(127)).not.toBe("Predaj");
  });
});

describe("isRealviaMappingUnknown", () => {
  it("detects sentinel only", () => {
    expect(isRealviaMappingUnknown(REALVIA_MAPPING_UNKNOWN)).toBe(true);
    expect(isRealviaMappingUnknown("Ostatné")).toBe(false);
    expect(isRealviaMappingUnknown("Predaj")).toBe(false);
    expect(isRealviaMappingUnknown("")).toBe(false);
  });
});
