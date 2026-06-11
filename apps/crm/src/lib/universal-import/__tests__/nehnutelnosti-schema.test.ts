import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  parseNehnutelnostiCsvText,
  parseNehnutelnostiExportText,
  parseNehnutelnostiJsonPayload,
} from "@/lib/universal-import/nehnutelnosti/nehnutelnosti-schema";

const CSV_FIXTURE = resolve(__dirname, "../__fixtures__/nehnutelnosti/contacts.csv");
const JSON_FIXTURE = resolve(__dirname, "../__fixtures__/nehnutelnosti/contacts.json");

describe("nehnutelnosti schema", () => {
  it("parses CSV fixture with expected contact count", () => {
    const text = readFileSync(CSV_FIXTURE, "utf8");
    const result = parseNehnutelnostiCsvText(text);

    expect(result.format).toBe("csv");
    expect(result.contacts).toHaveLength(10);
    expect(result.contacts[0]?.name).toBe("Jana Fiktívna");
    expect(result.contacts[0]?.email).toBe("jana.fiktivna@example.sk");
  });

  it("maps Slovak CSV headers to contact fields", () => {
    const text = readFileSync(CSV_FIXTURE, "utf8");
    const result = parseNehnutelnostiCsvText(text);
    const jana = result.contacts[0];

    expect(jana?.city).toBe("Prešov");
    expect(jana?.inquiryType).toBe("Kúpa");
    expect(jana?.agent).toBe("Maklér Demo");
    expect(jana?.budget).toBe("185000");
  });

  it("parses JSON fixture contacts array", () => {
    const text = readFileSync(JSON_FIXTURE, "utf8");
    const result = parseNehnutelnostiExportText(text);

    expect(result.format).toBe("json");
    expect(result.contacts).toHaveLength(4);
    expect(result.contacts[0]?.name).toBe("Mária JSONová");
  });

  it("handles root array JSON format", () => {
    const result = parseNehnutelnostiJsonPayload([
      { name: "A", email: "a@example.sk", phone: "0901111111" },
      { name: "B", phone: "0902222222" },
    ]);

    expect(result.contacts).toHaveLength(2);
    expect(result.contacts[1]?.phone).toBe("0902222222");
  });

  it("returns warning on invalid JSON", () => {
    const result = parseNehnutelnostiExportText("{ not valid json");
    expect(result.contacts).toHaveLength(0);
    expect(result.warnings.some((w) => w.path === "json")).toBe(true);
  });
});
