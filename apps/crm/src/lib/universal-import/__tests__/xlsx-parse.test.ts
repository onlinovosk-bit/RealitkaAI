import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  columnLetterToIndex,
  excelSerialToIso,
  looksLikeZipContainer,
  parseXlsxBuffer,
  XlsxParseError,
} from "../xlsx-parse";

const FIXTURES = join(__dirname, "..", "__fixtures__", "xlsx");

function load(name: string): ArrayBuffer {
  const buf = readFileSync(join(FIXTURES, name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

describe("xlsx-parse: reálny .xlsx súbor", () => {
  it("prečíta hlavičky aj riadky z prvého hárka", () => {
    const { headers, rows } = parseXlsxBuffer(load("kontakty.xlsx"));

    expect(headers).toEqual([
      "Meno a priezvisko",
      "Mobil",
      "E-mail",
      "Poznámka",
      "Zapísané",
      "Rozpočet",
    ]);
    // prázdny riadok medzi dátami sa zahodí, rovnako ako v CSV ceste
    expect(rows).toHaveLength(2);
  });

  it("rozbalí shared strings, inline strings aj rich text do jedného textu", () => {
    const { rows } = parseXlsxBuffer(load("kontakty.xlsx"));

    expect(rows[0]["Meno a priezvisko"]).toBe("Žofia Krajčírová");
    expect(rows[0]["Mobil"]).toBe("+421 900 111 222");
    expect(rows[0]["E-mail"]).toBe("jan@example.sk");
    // rich text je v XML rozsekaný na <r><t>Vážny </t></r><r><t>záujemca</t></r>
    expect(rows[0]["Poznámka"]).toBe("Vážny záujemca");
  });

  it("čísla s dátumovým formátom prevedie na dátum, ostatné nechá číslom", () => {
    const { rows } = parseXlsxBuffer(load("kontakty.xlsx"));

    // 45123 pri vstavanom formáte 14 — bez prevodu by maklér v CRM videl „45123"
    expect(rows[0]["Zapísané"]).toBe("2023-07-16");
    // 45200 pri VLASTNOM formáte dd.mm.yyyy (numFmtId 164) — tiež dátum
    expect(rows[1]["Zapísané"]).toBe("2023-10-01");
    // rozpočet má formát 4 (#,##0.00), nie dátumový — zostáva číslom
    expect(rows[0]["Rozpočet"]).toBe("185000");
  });

  it("riedky riadok doplní prázdnymi hodnotami pod správne hlavičky", () => {
    const { rows } = parseXlsxBuffer(load("kontakty.xlsx"));

    // v riadku 4 chýbajú bunky B a D; hodnoty sa NESMÚ posunúť doľava
    expect(rows[1]).toEqual({
      "Meno a priezvisko": "Ľubomír Ščasný",
      Mobil: "",
      "E-mail": "lubo@example.sk",
      "Poznámka": "",
      "Zapísané": "2023-10-01",
      "Rozpočet": "TRUE",
    });
  });

  it("preskočí skrytý prvý hárok a číta prvý viditeľný", () => {
    const { headers, rows } = parseXlsxBuffer(load("skryty-prvy-harok.xlsx"));

    expect(headers).toEqual(["Meno", "Telefón"]);
    expect(rows).toEqual([{ Meno: "Eva Nová", "Telefón": "0901 000 001" }]);
  });

  it("každý riadok má kľúče presne pre všetky hlavičky", () => {
    const { headers, rows } = parseXlsxBuffer(load("kontakty.xlsx"));
    for (const row of rows) expect(Object.keys(row).sort()).toEqual([...headers].sort());
  });
});

describe("xlsx-parse: odmietnutia a pomocné funkcie", () => {
  it("na súbor, ktorý nie je ZIP, hodí zrozumiteľnú chybu", () => {
    const notZip = new TextEncoder().encode("Meno,Mobil\nJán,0900").buffer;
    expect(() => parseXlsxBuffer(notZip as ArrayBuffer)).toThrow(XlsxParseError);
  });

  it("rozozná .xlsx podľa obsahu, nie podľa prípony", () => {
    expect(looksLikeZipContainer(load("kontakty.xlsx"))).toBe(true);
    expect(looksLikeZipContainer(new TextEncoder().encode("Meno,Mobil").buffer as ArrayBuffer)).toBe(false);
  });

  it("písmená stĺpca prevedie na 1-based index", () => {
    expect(columnLetterToIndex("A1")).toBe(1);
    expect(columnLetterToIndex("Z9")).toBe(26);
    expect(columnLetterToIndex("AA1")).toBe(27);
    expect(columnLetterToIndex("AB10")).toBe(28);
  });

  it("Excel serial prevedie na dátum vrátane Excelovho falošného 29. 2. 1900", () => {
    // očakávania overené nezávisle v Pythone: date(1899,12,30) + timedelta(days=serial)
    expect(excelSerialToIso(45123)).toBe("2023-07-16");
    expect(excelSerialToIso(45200)).toBe("2023-10-01");
    expect(excelSerialToIso(45123.5)).toBe("2023-07-16 12:00:00");
    // pod serial 61 je základ 1899-12-30 o deň vedľa — Excel ukazuje 1 ako 1900-01-01
    expect(excelSerialToIso(1)).toBe("1900-01-01");
    expect(excelSerialToIso(59)).toBe("1900-02-28");
    expect(excelSerialToIso(60)).toBe("1900-02-29"); // deň, ktorý nikdy neexistoval
    expect(excelSerialToIso(61)).toBe("1900-03-01");
    expect(excelSerialToIso(0)).toBe("0");
  });
});
