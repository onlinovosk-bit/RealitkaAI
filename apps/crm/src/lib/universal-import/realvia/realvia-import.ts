import type { ImportReport, ImportSourceSystem } from "../types";
import {
  mapRealviaClientToRevolis,
  REALVIA_JSON_SOURCE,
  type MappedRealviaClient,
  type RevolisActivityDraft,
  type RevolisLeadDraft,
} from "./map-realvia-client";
import {
  parseRealviaJsonText,
  type RealviaClient,
  type RealviaParseWarning,
} from "./realvia-schema";

export type RealviaImportAction = "create" | "update" | "skip" | "duplicate";

export type RealviaClientReportLine = {
  index: number;
  name: string;
  action: RealviaImportAction;
  externalKey: string;
  leadId: string;
  email: string;
  phone: string;
  doNotContact: boolean;
  activitiesCount: number;
  skipReason?: string;
  warnings: string[];
};

export type RealviaDryRunReport = {
  sourceSystem: ImportSourceSystem;
  mode: "dry-run" | "commit";
  summary: {
    totalParsed: number;
    wouldCreate: number;
    wouldUpdate: number;
    wouldSkip: number;
    duplicatesInFile: number;
    doNotContact: number;
    activitiesTotal: number;
    parseWarnings: number;
  };
  clients: RealviaClientReportLine[];
  parseWarnings: RealviaParseWarning[];
  propertyMatchTodo: string;
};

export type RealviaImportOptions = {
  agencyId: string;
  dryRun?: boolean;
  existingExternalKeys?: Set<string>;
};

function resolveAction(
  mapped: MappedRealviaClient,
  seenInFile: Set<string>,
  existingExternalKeys: Set<string>,
): RealviaImportAction {
  if (mapped.skipReason) return "skip";
  if (seenInFile.has(mapped.externalKey)) return "duplicate";
  if (existingExternalKeys.has(mapped.externalKey)) return "update";
  return "create";
}

export function mapRealviaClients(
  clients: RealviaClient[],
  agencyId: string,
): MappedRealviaClient[] {
  return clients.map((client, index) => mapRealviaClientToRevolis(client, agencyId, index));
}

export function buildRealviaDryRunReport(input: {
  clients: RealviaClient[];
  agencyId: string;
  parseWarnings?: RealviaParseWarning[];
  existingExternalKeys?: Set<string>;
  dryRun?: boolean;
}): RealviaDryRunReport {
  const mapped = mapRealviaClients(input.clients, input.agencyId);
  const parseWarnings = input.parseWarnings ?? [];
  const existingExternalKeys = input.existingExternalKeys ?? new Set<string>();
  const seenInFile = new Set<string>();

  const lines: RealviaClientReportLine[] = [];
  let wouldCreate = 0;
  let wouldUpdate = 0;
  let wouldSkip = 0;
  let duplicatesInFile = 0;
  let doNotContact = 0;
  let activitiesTotal = 0;

  for (const item of mapped) {
    const action = resolveAction(item, seenInFile, existingExternalKeys);
    if (!item.skipReason) seenInFile.add(item.externalKey);

    if (action === "create") wouldCreate += 1;
    if (action === "update") wouldUpdate += 1;
    if (action === "skip") wouldSkip += 1;
    if (action === "duplicate") duplicatesInFile += 1;
    if (item.lead.do_not_contact) doNotContact += 1;
    activitiesTotal += item.activities.length;

    lines.push({
      index: item.clientIndex,
      name: item.lead.name || "(bez mena)",
      action,
      externalKey: item.externalKey,
      leadId: item.lead.id,
      email: item.lead.email,
      phone: item.lead.phone,
      doNotContact: item.lead.do_not_contact,
      activitiesCount: item.activities.length,
      skipReason: item.skipReason,
      warnings: item.warnings,
    });
  }

  return {
    sourceSystem: "realvia-json",
    mode: input.dryRun === false ? "commit" : "dry-run",
    summary: {
      totalParsed: input.clients.length,
      wouldCreate,
      wouldUpdate,
      wouldSkip,
      duplicatesInFile,
      doNotContact,
      activitiesTotal,
      parseWarnings: parseWarnings.length,
    },
    clients: lines,
    parseWarnings,
    propertyMatchTodo:
      "TODO: fuzzy property match by address (inspections → properties) — not implemented",
  };
}

export function formatRealviaDryRunReport(report: RealviaDryRunReport): string {
  const s = report.summary;
  const lines: string[] = [
    "=== Realvia JSON Import (dry-run) ===",
    `Zdroj: ${report.sourceSystem}`,
    `Režim: ${report.mode}`,
    "",
    "Súhrn:",
    `  Parsovaných klientov: ${s.totalParsed}`,
    `  Vytvoriť:            ${s.wouldCreate}`,
    `  Aktualizovať:        ${s.wouldUpdate}`,
    `  Preskočiť:           ${s.wouldSkip}`,
    `  Duplicity v súbore:  ${s.duplicatesInFile}`,
    `  Do-not-contact:      ${s.doNotContact}`,
    `  Aktivity celkom:     ${s.activitiesTotal}`,
    `  Parse warnings:      ${s.parseWarnings}`,
    "",
    report.propertyMatchTodo,
    "",
    "Klienti:",
  ];

  for (const c of report.clients) {
    const flags = [
      c.doNotContact ? "DNC" : null,
      c.skipReason ? `skip:${c.skipReason}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(
      `  [${c.index + 1}] ${c.name} → ${c.action}${flags ? ` (${flags})` : ""} | lead=${c.leadId.slice(0, 12)}… | aktivity=${c.activitiesCount}`,
    );
    if (c.warnings.length) {
      lines.push(`      warnings: ${c.warnings.join("; ")}`);
    }
  }

  if (report.parseWarnings.length) {
    lines.push("", "Parse warnings:");
    for (const w of report.parseWarnings) {
      lines.push(`  [${w.index}] ${w.path}: ${w.message}`);
    }
  }

  return lines.join("\n");
}

export function runRealviaJsonImportFromText(
  text: string,
  options: RealviaImportOptions,
): {
  report: RealviaDryRunReport;
  mapped: MappedRealviaClient[];
  leads: RevolisLeadDraft[];
  activities: Array<{ externalKey: string; activity: RevolisActivityDraft }>;
} {
  const parsed = parseRealviaJsonText(text);
  const dryRunReport = buildRealviaDryRunReport({
    clients: parsed.clients,
    agencyId: options.agencyId,
    parseWarnings: parsed.warnings,
    existingExternalKeys: options.existingExternalKeys,
    dryRun: options.dryRun !== false,
  });

  const mapped = mapRealviaClients(parsed.clients, options.agencyId);
  const leads = mapped.filter((m) => !m.skipReason).map((m) => m.lead);
  const activities = mapped.flatMap((m) =>
    m.activities.map((activity) => ({ externalKey: m.externalKey, activity })),
  );

  return { report: dryRunReport, mapped, leads, activities };
}

/** Idempotentný re-import: druhý beh s rovnakými external keys → update, nie create. */
export function simulateIdempotentReimport(
  clients: RealviaClient[],
  agencyId: string,
): { first: RealviaDryRunReport; second: RealviaDryRunReport } {
  const mapped = mapRealviaClients(clients, agencyId);
  const keys = new Set(mapped.filter((m) => !m.skipReason).map((m) => m.externalKey));

  const first = buildRealviaDryRunReport({ clients, agencyId });
  const second = buildRealviaDryRunReport({
    clients,
    agencyId,
    existingExternalKeys: keys,
  });

  return { first, second };
}

export function realviaDryRunToImportReport(
  dryRun: RealviaDryRunReport,
  fileName: string,
): ImportReport {
  const s = dryRun.summary;
  return {
    jobId: "dry-run",
    fileName,
    sourceSystem: "realvia-json",
    totalRows: s.totalParsed,
    importedRows: s.wouldCreate,
    skippedRows: s.wouldSkip,
    duplicateRows: s.wouldUpdate + s.duplicatesInFile,
    errorRows: 0,
    topSkipReasons: [],
  };
}

export { REALVIA_JSON_SOURCE };
