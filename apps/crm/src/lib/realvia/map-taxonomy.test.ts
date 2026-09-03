import { describe, expect, it } from "vitest";
import {
  REALVIA_MAPPING_UNKNOWN,
  isRealviaMappingUnknown,
  mapCategory,
  mapTransaction,
} from "@/lib/realvia/map-taxonomy";

/** Category codes observed in production Realvia payloads (Brief 16). */
const PROD_CATEGORY_CODES = [
  9, 11, 12, 13, 14, 20, 27, 28, 30, 34, 35, 37, 41, 46, 47, 48, 57, 60, 61, 65,
] as const;

/** Expected outputs for each prod code — known table only; rest stay Neznáme. */
const PROD_CATEGORY_EXPECTED: Readonly<Record<number, string>> = {
  9: REALVIA_MAPPING_UNKNOWN,
  11: "Byt",
  12: "Byt",
  13: REALVIA_MAPPING_UNKNOWN, // disputed Dom → pending číselník
  14: REALVIA_MAPPING_UNKNOWN, // disputed Dom → pending číselník
  20: "Ostatné", // legitimate known mapping (not fog fallback)
  27: REALVIA_MAPPING_UNKNOWN,
  28: REALVIA_MAPPING_UNKNOWN,
  30: REALVIA_MAPPING_UNKNOWN,
  34: REALVIA_MAPPING_UNKNOWN,
  35: REALVIA_MAPPING_UNKNOWN,
  37: REALVIA_MAPPING_UNKNOWN,
  41: REALVIA_MAPPING_UNKNOWN,
  46: REALVIA_MAPPING_UNKNOWN,
  47: REALVIA_MAPPING_UNKNOWN,
  48: REALVIA_MAPPING_UNKNOWN,
  57: REALVIA_MAPPING_UNKNOWN,
  60: REALVIA_MAPPING_UNKNOWN,
  61: REALVIA_MAPPING_UNKNOWN,
  65: REALVIA_MAPPING_UNKNOWN,
};

describe("mapCategory — honest unknown", () => {
  it("maps every production-observed category code to the expected label", () => {
    for (const code of PROD_CATEGORY_CODES) {
      expect(mapCategory(code), `category ${code}`).toBe(PROD_CATEGORY_EXPECTED[code]);
    }
  });

  it("keeps known mappings (incl. legitimate Ostatné 19/20)", () => {
    expect(mapCategory(11)).toBe("Byt");
    expect(mapCategory(12)).toBe("Byt");
    expect(mapCategory(15)).toBe("Pozemok");
    expect(mapCategory(16)).toBe("Pozemok");
    expect(mapCategory(17)).toBe("Komerčná");
    expect(mapCategory(18)).toBe("Komerčná");
    expect(mapCategory(19)).toBe("Ostatné");
    expect(mapCategory(20)).toBe("Ostatné");
  });

  it("does not map disputed 13/14 to Dom (pending číselník)", () => {
    expect(mapCategory(13)).toBe(REALVIA_MAPPING_UNKNOWN);
    expect(mapCategory(14)).toBe(REALVIA_MAPPING_UNKNOWN);
  });

  it("maps unknown codes to Neznáme — never Ostatné or Predaj", () => {
    const unknownCodes = [
      0, 1, 9, 13, 14, 21, 27, 28, 30, 34, 35, 37, 41, 46, 47, 48, 57, 60, 61, 65, 99, 999,
    ];
    for (const code of unknownCodes) {
      const mapped = mapCategory(code);
      expect(mapped, `category ${code}`).toBe(REALVIA_MAPPING_UNKNOWN);
      expect(mapped).not.toBe("Ostatné");
      expect(mapped).not.toBe("Predaj");
    }
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

  it("maps unknown codes to Neznáme — never Ostatné or Predaj", () => {
    const unknownCodes = [0, 121, 122, 123, 126, 127, 128, 999];
    for (const code of unknownCodes) {
      const mapped = mapTransaction(code);
      expect(mapped, `transaction ${code}`).toBe(REALVIA_MAPPING_UNKNOWN);
      expect(mapped).not.toBe("Ostatné");
      expect(mapped).not.toBe("Predaj");
    }
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
