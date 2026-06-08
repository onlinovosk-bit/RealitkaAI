import { describe, expect, it } from "vitest";
import { detectTargetField } from "@/lib/universal-import/column-detector";

describe("detectTargetField", () => {
  it('maps "Meno a priezvisko" to contact_name', () => {
    const result = detectTargetField("Meno a priezvisko", ["Ján Novák"]);
    expect(result.target).toBe("contact_name");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('maps "Mobil" to phone', () => {
    const result = detectTargetField("Mobil", ["0903123456"]);
    expect(result.target).toBe("phone");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('maps "e-mail" to email', () => {
    const result = detectTargetField("e-mail", ["jan@example.sk"]);
    expect(result.target).toBe("email");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('maps "plocha" to property_area', () => {
    const result = detectTargetField("plocha", ["85 m2"]);
    expect(result.target).toBe("property_area");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('maps unknown column to skip', () => {
    const result = detectTargetField("xyz_unknown_col", ["foo"]);
    expect(result.target).toBe("skip");
    expect(result.confidence).toBe(0);
  });

  describe("Realvia Smolko export headers", () => {
    const samples: Record<string, string[]> = {
      Meno: ["Rastislav"],
      Priezvisko: ["Smolko"],
      Telefon: ["0905123456"],
      Email: ["rastislav.smolko@gmail.com"],
      Adresa: ["Prešov"],
      Poznamka: ["záujem o byt"],
    };

    it('maps "Meno" to contact_name', () => {
      const result = detectTargetField("Meno", samples.Meno);
      expect(result.target).toBe("contact_name");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('maps "Telefon" to phone', () => {
      const result = detectTargetField("Telefon", samples.Telefon);
      expect(result.target).toBe("phone");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('maps "Email" to email', () => {
      const result = detectTargetField("Email", samples.Email);
      expect(result.target).toBe("email");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('maps "Adresa" to address', () => {
      const result = detectTargetField("Adresa", samples.Adresa);
      expect(result.target).toBe("address");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('maps "Poznamka" to note', () => {
      const result = detectTargetField("Poznamka", samples.Poznamka);
      expect(result.target).toBe("note");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });
});
