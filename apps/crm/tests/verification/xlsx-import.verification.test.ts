import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SUPPORTED_IMPORT_SOURCES, UNSUPPORTED_IMPORT_HINT } from "@/lib/universal-import/types";

const SRC = join(__dirname, "..", "..", "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

/**
 * XLSX-IMPORT: pripnutie celej cesty .xlsx súboru. Bod 5 ukázal, že sprievodca
 * vie ponúkať formát, ktorý nikto neprečíta; tieto testy držia, aby sa výber
 * v zozname, `accept` na vstupe a parser v route nerozišli.
 */
describe("XLSX import: cesta od výberu po parser je celá", () => {
  it("xlsx je medzi podporovanými zdrojmi a už nemá hlášku „nevieme prečítať“", () => {
    expect(SUPPORTED_IMPORT_SOURCES).toContain("xlsx");
    expect(UNSUPPORTED_IMPORT_HINT.xlsx).toBeUndefined();
    // vcf parser naozaj nemá — musí zostať vypnuté, nie potichu povolené
    expect(SUPPORTED_IMPORT_SOURCES).not.toContain("vcf");
    expect(UNSUPPORTED_IMPORT_HINT.vcf).toMatch(/vCard/);
  });

  it("route volí parser podľa obsahu súboru, nie podľa výberu v zozname", () => {
    const route = read("app/api/universal-import/start/route.ts");
    expect(route).toContain("looksLikeZipContainer(buffer)");
    expect(route).toContain("parseXlsxBuffer(buffer)");
    expect(route).toContain("parseCsvBuffer(buffer)");
    // chyba parsera .xlsx musí ísť na 400 s textom, nie na 500 „Upload zlyhal“
    expect(route).toContain("XlsxParseError");
  });

  it("sprievodca prijme .xlsx na vstupe aj pri pretiahnutí myšou", () => {
    const wizard = read("components/universal-import/universal-import-wizard.tsx");
    expect(wizard).toContain(".xlsx");
    expect(wizard).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("limit riadkov a veľkosti platí rovnako pre .xlsx ako pre CSV", () => {
    const route = read("app/api/universal-import/start/route.ts");
    // obe kontroly sú PO parsovaní resp. PRED načítaním do pamäte a nie sú
    // vetvené podľa formátu — .xlsx nesmie obísť strop, ktorý platí pre CSV
    expect(route).toContain("file.size > MAX_IMPORT_FILE_BYTES");
    expect(route).toContain("rows.length > MAX_IMPORT_ROWS");
    expect(route).not.toMatch(/isXlsx\s*\?\s*\d|MAX_IMPORT_ROWS\s*\*/);
  });

  it("parser .xlsx má strop na rozbalený obsah (zip bomba)", () => {
    const parser = read("lib/universal-import/xlsx-parse.ts");
    expect(parser).toContain("MAX_XLSX_INFLATED_BYTES");
    expect(parser).toContain("maxOutputLength");
  });

  it("nepribudla npm závislosť na čítanie Excelu", () => {
    const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...(pkg.devDependencies ?? {}) };
    for (const forbidden of ["xlsx", "exceljs", "node-xlsx", "read-excel-file"]) {
      expect(all[forbidden]).toBeUndefined();
    }
  });
});
