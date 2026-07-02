import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectColumnsFromHeaders,
  detectTargetField,
} from "@/lib/universal-import/column-detector";

const SMOKE_REALVIA_CSV = readFileSync(
  resolve(__dirname, "fixtures/smoke-realvia.csv"),
  "utf8",
);

function parseSmokeCsv(csv: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0]!.split(",");
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, idx) => [header, values[idx] ?? ""]));
  });
  return { headers, rows };
}

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

    it('maps "Priezvisko" to contact_name', () => {
      const result = detectTargetField("Priezvisko", samples.Priezvisko);
      expect(result.target).toBe("contact_name");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  it("uses sample values to infer email when header is ambiguous", () => {
    const result = detectTargetField("col_7", ["jan@example.sk", "other@example.sk"]);
    expect(result.target).toBe("email");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('maps "Rozpocet" to budget', () => {
    const result = detectTargetField("Rozpocet", ["250000"]);
    expect(result.target).toBe("budget");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('maps "Stav" to status', () => {
    const result = detectTargetField("Stav", ["nový"]);
    expect(result.target).toBe("status");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('maps "Makler" to assigned_agent', () => {
    const result = detectTargetField("Makler", ["Ján Novák"]);
    expect(result.target).toBe("assigned_agent");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('maps "Typ nehnutelnosti" to property_type', () => {
    const result = detectTargetField("Typ nehnutelnosti", ["byt"]);
    expect(result.target).toBe("property_type");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('maps "Zdroj" to source', () => {
    const result = detectTargetField("Zdroj", ["web"]);
    expect(result.target).toBe("source");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  describe("detectColumnsFromHeaders", () => {
    it("detects Realvia smoke CSV columns with sample values", () => {
      const { headers, rows } = parseSmokeCsv(SMOKE_REALVIA_CSV);
      const detected = detectColumnsFromHeaders(headers, rows);

      expect(detected).toHaveLength(6);

      const byHeader = Object.fromEntries(detected.map((col) => [col.originalHeader, col]));

      expect(byHeader.Meno?.target).toBe("contact_name");
      expect(byHeader.Priezvisko?.target).toBe("contact_name");
      expect(byHeader.Telefon?.target).toBe("phone");
      expect(byHeader.Email?.target).toBe("email");
      expect(byHeader.Adresa?.target).toBe("address");
      expect(byHeader.Poznamka?.target).toBe("note");

      expect(byHeader.Meno?.sampleValues.length).toBeGreaterThan(0);
      expect(byHeader.Meno?.source).toBe("auto");
      expect(byHeader.Meno?.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("returns skip for blank headers", () => {
      const detected = detectColumnsFromHeaders(["", "Meno"], [{ "": "x", Meno: "Ján" }]);
      expect(detected[0]?.target).toBe("skip");
      expect(detected[0]?.confidence).toBe(0);
    });
  });
});
