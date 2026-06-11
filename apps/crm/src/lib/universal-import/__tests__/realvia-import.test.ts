import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  buildRealviaDryRunReport,
  formatRealviaDryRunReport,
  runRealviaJsonImportFromText,
  simulateIdempotentReimport,
} from "@/lib/universal-import/realvia/realvia-import";
import { parseRealviaJsonText } from "@/lib/universal-import/realvia/realvia-schema";

const AGENCY = "11111111-1111-1111-1111-111111111111";
const FIXTURE = resolve(__dirname, "../__fixtures__/realvia/clients.json");

describe("realvia import dry-run", () => {
  const text = readFileSync(FIXTURE, "utf8");

  it("produces readable dry-run report by default", () => {
    const { report } = runRealviaJsonImportFromText(text, { agencyId: AGENCY });

    expect(report.mode).toBe("dry-run");
    expect(report.sourceSystem).toBe("realvia-json");
    expect(report.summary.totalParsed).toBe(6);
    expect(report.summary.wouldCreate).toBe(6);
    expect(report.summary.doNotContact).toBe(1);
    expect(report.summary.activitiesTotal).toBeGreaterThan(0);

    const readable = formatRealviaDryRunReport(report);
    expect(readable).toContain("Realvia JSON Import (dry-run)");
    expect(readable).toContain("Do-not-contact:");
    expect(readable).toContain("Ján Novák");
    expect(readable).toContain(report.propertyMatchTodo);
  });

  it("counts parse warnings from unknown fields", () => {
    const { report } = runRealviaJsonImportFromText(text, { agencyId: AGENCY });
    expect(report.parseWarnings.some((w) => w.path.includes("legacyField"))).toBe(true);
  });

  it("idempotent re-import marks existing keys as update not create", () => {
    const { clients } = parseRealviaJsonText(text);
    const { first, second } = simulateIdempotentReimport(clients, AGENCY);

    expect(first.summary.wouldCreate).toBe(6);
    expect(first.summary.wouldUpdate).toBe(0);
    expect(second.summary.wouldCreate).toBe(0);
    expect(second.summary.wouldUpdate).toBe(6);
    expect(second.summary.duplicatesInFile).toBe(0);
  });

  it("detects duplicates within the same file", () => {
    const { clients } = parseRealviaJsonText(text);
    const duplicated = [...clients, clients[0]];
    const report = buildRealviaDryRunReport({ clients: duplicated, agencyId: AGENCY });

    expect(report.summary.totalParsed).toBe(7);
    expect(report.summary.duplicatesInFile).toBe(1);
    expect(report.clients.filter((c) => c.action === "duplicate")).toHaveLength(1);
  });

  it("skips clients without name or contact", () => {
    const report = buildRealviaDryRunReport({
      clients: [
        { owner: { name: "", email: "x@y.sk" } },
        { owner: { name: "No Contact" } },
      ],
      agencyId: AGENCY,
    });

    expect(report.summary.wouldSkip).toBe(2);
    expect(report.clients.every((c) => c.action === "skip")).toBe(true);
  });
});
