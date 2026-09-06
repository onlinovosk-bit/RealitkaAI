import { describe, expect, it } from "vitest";
import {
  REALVIA_MAPPING_UNKNOWN,
  REALVIA_TRANSACTION_DEMAND,
  isDemandTransaction,
  isRealviaMappingUnknown,
  mapCategory,
  mapTransaction,
  roomsFromCategory,
} from "@/lib/realvia/map-taxonomy";

/** All 20 official category codes from číselník (2026-09-04). */
const OFFICIAL_CATEGORY_EXPECTED: Readonly<Record<number, string>> = {
  9: "Byt",
  11: "Byt",
  12: "Byt",
  13: "Byt",
  14: "Byt",
  20: "Dom",
  27: "Chata",
  28: "Záhradný domček",
  30: "Pozemok",
  34: "Pozemok",
  35: "Pozemok",
  37: "Pozemok",
  41: "Pozemok",
  46: "Komerčná",
  47: "Komerčná",
  48: "Komerčná",
  57: "Komerčná",
  60: "Komerčná",
  61: "Komerčná",
  65: "Komerčná",
};

describe("mapCategory — official číselník", () => {
  it("maps all 20 official category codes to expected types", () => {
    const codes = Object.keys(OFFICIAL_CATEGORY_EXPECTED).map(Number);
    expect(codes).toHaveLength(20);
    for (const code of codes) {
      expect(mapCategory(code), `category ${code}`).toBe(OFFICIAL_CATEGORY_EXPECTED[code]);
    }
  });

  it("maps removed estimate codes 15–19 to Neznáme", () => {
    for (const code of [15, 16, 17, 18, 19]) {
      expect(mapCategory(code), `category ${code}`).toBe(REALVIA_MAPPING_UNKNOWN);
    }
  });

  it("keeps Chata and Záhradný domček as distinct types (not Dom)", () => {
    expect(mapCategory(27)).toBe("Chata");
    expect(mapCategory(28)).toBe("Záhradný domček");
    expect(mapCategory(27)).not.toBe("Dom");
    expect(mapCategory(28)).not.toBe("Dom");
  });

  it("unknown codes never return Ostatné, Predaj, or Dopyt", () => {
    for (const code of [0, 1, 15, 19, 21, 99, 999]) {
      const mapped = mapCategory(code);
      expect(mapped).toBe(REALVIA_MAPPING_UNKNOWN);
      expect(mapped).not.toBe("Ostatné");
      expect(mapped).not.toBe("Predaj");
      expect(mapped).not.toBe(REALVIA_TRANSACTION_DEMAND);
    }
  });
});

describe("mapTransaction — official číselník", () => {
  it("maps all 5 official transaction codes", () => {
    expect(mapTransaction(122)).toBe(REALVIA_TRANSACTION_DEMAND);
    expect(mapTransaction(123)).toBe("Prenájom");
    expect(mapTransaction(124)).toBe("Podnájom");
    expect(mapTransaction(125)).toBe("Výmena");
    expect(mapTransaction(127)).toBe("Predaj");
  });

  it("fixes live errors: 124 Podnájom, 125 Výmena (not Prenájom/Dražba)", () => {
    expect(mapTransaction(124)).not.toBe("Prenájom");
    expect(mapTransaction(125)).not.toBe("Dražba");
  });

  it("unknown codes never return Ostatné, Predaj, or Dopyt", () => {
    for (const code of [0, 121, 126, 128, 999]) {
      const mapped = mapTransaction(code);
      expect(mapped).toBe(REALVIA_MAPPING_UNKNOWN);
      expect(mapped).not.toBe("Ostatné");
      expect(mapped).not.toBe("Predaj");
      expect(mapped).not.toBe(REALVIA_TRANSACTION_DEMAND);
    }
  });
});

describe("roomsFromCategory", () => {
  it("returns room labels for flat categories 9/11–14", () => {
    expect(roomsFromCategory(9)).toBe("garsónka");
    expect(roomsFromCategory(11)).toBe("1 izba");
    expect(roomsFromCategory(12)).toBe("2 izby");
    expect(roomsFromCategory(13)).toBe("3 izby");
    expect(roomsFromCategory(14)).toBe("4 izby");
  });

  it("returns null for non-flat categories", () => {
    expect(roomsFromCategory(20)).toBeNull();
    expect(roomsFromCategory(27)).toBeNull();
    expect(roomsFromCategory(30)).toBeNull();
    expect(roomsFromCategory(46)).toBeNull();
  });
});

describe("isDemandTransaction / isRealviaMappingUnknown", () => {
  it("detects Dopyt sentinel", () => {
    expect(isDemandTransaction(REALVIA_TRANSACTION_DEMAND)).toBe(true);
    expect(isDemandTransaction("Predaj")).toBe(false);
    expect(isDemandTransaction("")).toBe(false);
  });

  it("detects Neznáme sentinel only", () => {
    expect(isRealviaMappingUnknown(REALVIA_MAPPING_UNKNOWN)).toBe(true);
    expect(isRealviaMappingUnknown("Ostatné")).toBe(false);
    expect(isRealviaMappingUnknown("Predaj")).toBe(false);
  });
});
