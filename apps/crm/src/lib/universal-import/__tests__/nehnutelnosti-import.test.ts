import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  buildContactDedupeKeys,
  normalizePhoneForDedupe,
} from "@/lib/universal-import/nehnutelnosti/map-nehnutelnosti-contact";
import {
  buildNehnutelnostiDryRunReport,
  formatNehnutelnostiDryRunReport,
  runNehnutelnostiExportImportFromText,
  simulateIdempotentReimport,
} from "@/lib/universal-import/nehnutelnosti/nehnutelnosti-import";
import { parseNehnutelnostiExportText } from "@/lib/universal-import/nehnutelnosti/nehnutelnosti-schema";

const AGENCY = "22222222-2222-2222-2222-222222222222";
const CSV_FIXTURE = resolve(__dirname, "../__fixtures__/nehnutelnosti/contacts.csv");
const JSON_FIXTURE = resolve(__dirname, "../__fixtures__/nehnutelnosti/contacts.json");

describe("nehnutelnosti import dry-run", () => {
  const csvText = readFileSync(CSV_FIXTURE, "utf8");

  it("produces readable dry-run report by default", () => {
    const { report } = runNehnutelnostiExportImportFromText(csvText, { agencyId: AGENCY });

    expect(report.mode).toBe("dry-run");
    expect(report.sourceSystem).toBe("nehnutelnosti_sk");
    expect(report.format).toBe("csv");
    expect(report.summary.totalParsed).toBe(10);
    expect(report.summary.wouldCreate).toBeGreaterThan(0);

    const readable = formatNehnutelnostiDryRunReport(report);
    expect(readable).toContain("Nehnuteľnosti.sk Contact Export (dry-run)");
    expect(readable).toContain("Jana Fiktívna");
  });

  it("dedupes by email within file", () => {
    const { report } = runNehnutelnostiExportImportFromText(csvText, { agencyId: AGENCY });
    const dupEmailLines = report.contacts.filter((c) => c.action === "duplicate");

    expect(report.summary.duplicatesInFile).toBeGreaterThanOrEqual(2);
    expect(dupEmailLines.some((c) => c.email === "dup.email@example.sk")).toBe(true);
  });

  it("dedupes by normalized phone within file", () => {
    const { report } = runNehnutelnostiExportImportFromText(csvText, { agencyId: AGENCY });

    expect(normalizePhoneForDedupe("+421900333006")).toBe(
      normalizePhoneForDedupe("0900333006"),
    );
    expect(report.contacts.some((c) => c.name === "Ďalší Telefón" && c.action === "duplicate")).toBe(
      true,
    );
  });

  it("skips contacts without name or contact info", () => {
    const { report } = runNehnutelnostiExportImportFromText(csvText, { agencyId: AGENCY });

    expect(report.summary.wouldSkip).toBe(2);
    expect(report.contacts.find((c) => c.skipReason === "missing_name")).toBeTruthy();
    expect(report.contacts.find((c) => c.skipReason === "missing_contact")).toBeTruthy();
  });

  it("idempotent re-import marks existing keys as update not create", () => {
    const { contacts } = parseNehnutelnostiExportText(csvText);
    const { first, second } = simulateIdempotentReimport(contacts, AGENCY);

    expect(first.summary.wouldCreate).toBeGreaterThan(0);
    expect(first.summary.wouldUpdate).toBe(0);
    expect(second.summary.wouldCreate).toBe(0);
    expect(second.summary.wouldUpdate).toBeGreaterThan(0);
  });

  it("builds dedupe keys from email and phone", () => {
    const keys = buildContactDedupeKeys("Test@Example.sk", "+421901234567");
    expect(keys).toContain("email:test@example.sk");
    expect(keys).toContain("phone:901234567");
  });

  it("parses JSON fixture with duplicate detection", () => {
    const jsonText = readFileSync(JSON_FIXTURE, "utf8");
    const report = buildNehnutelnostiDryRunReport({
      contacts: parseNehnutelnostiExportText(jsonText).contacts,
      agencyId: AGENCY,
      format: "json",
    });

    expect(report.summary.totalParsed).toBe(4);
    expect(report.summary.duplicatesInFile).toBe(1);
    expect(report.contacts.filter((c) => c.action === "duplicate")).toHaveLength(1);
  });

  it("commit mode when dryRun=false", () => {
    const { report } = runNehnutelnostiExportImportFromText(csvText, {
      agencyId: AGENCY,
      dryRun: false,
    });
    expect(report.mode).toBe("commit");
  });
});
