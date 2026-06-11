import type { ImportReport, ImportSourceSystem } from "../types";
import {
  buildContactDedupeKeys,
  mapNehnutelnostiContactToRevolis,
  NEHNUTELNOSTI_EXPORT_SOURCE,
  type MappedNehnutelnostiContact,
  type RevolisLeadDraft,
} from "./map-nehnutelnosti-contact";
import {
  parseNehnutelnostiExportText,
  type NehnutelnostiContact,
  type NehnutelnostiParseWarning,
} from "./nehnutelnosti-schema";

export type NehnutelnostiImportAction = "create" | "update" | "skip" | "duplicate";

export type NehnutelnostiContactReportLine = {
  index: number;
  name: string;
  action: NehnutelnostiImportAction;
  externalKey: string;
  leadId: string;
  email: string;
  phone: string;
  dedupeKeys: string[];
  skipReason?: string;
  warnings: string[];
};

export type NehnutelnostiDryRunReport = {
  sourceSystem: ImportSourceSystem;
  exportSource: typeof NEHNUTELNOSTI_EXPORT_SOURCE;
  mode: "dry-run" | "commit";
  format: "csv" | "json";
  summary: {
    totalParsed: number;
    wouldCreate: number;
    wouldUpdate: number;
    wouldSkip: number;
    duplicatesInFile: number;
    duplicateByEmail: number;
    duplicateByPhone: number;
    parseWarnings: number;
  };
  contacts: NehnutelnostiContactReportLine[];
  parseWarnings: NehnutelnostiParseWarning[];
};

export type NehnutelnostiImportOptions = {
  agencyId: string;
  dryRun?: boolean;
  existingDedupeKeys?: Set<string>;
};

function resolveAction(
  mapped: MappedNehnutelnostiContact,
  seenInFile: Set<string>,
  existingDedupeKeys: Set<string>,
): NehnutelnostiImportAction {
  if (mapped.skipReason) return "skip";

  const hasFileDuplicate = mapped.dedupeKeys.some((key) => seenInFile.has(key));
  if (hasFileDuplicate) return "duplicate";

  const hasExisting = mapped.dedupeKeys.some((key) => existingDedupeKeys.has(key));
  if (hasExisting) return "update";

  return "create";
}

export function mapNehnutelnostiContacts(
  contacts: NehnutelnostiContact[],
  agencyId: string,
): MappedNehnutelnostiContact[] {
  return contacts.map((contact, index) =>
    mapNehnutelnostiContactToRevolis(contact, agencyId, index),
  );
}

export function buildNehnutelnostiDryRunReport(input: {
  contacts: NehnutelnostiContact[];
  agencyId: string;
  parseWarnings?: NehnutelnostiParseWarning[];
  existingDedupeKeys?: Set<string>;
  dryRun?: boolean;
  format?: "csv" | "json";
}): NehnutelnostiDryRunReport {
  const mapped = mapNehnutelnostiContacts(input.contacts, input.agencyId);
  const parseWarnings = input.parseWarnings ?? [];
  const existingDedupeKeys = input.existingDedupeKeys ?? new Set<string>();
  const seenInFile = new Set<string>();

  const lines: NehnutelnostiContactReportLine[] = [];
  let wouldCreate = 0;
  let wouldUpdate = 0;
  let wouldSkip = 0;
  let duplicatesInFile = 0;
  let duplicateByEmail = 0;
  let duplicateByPhone = 0;

  for (const item of mapped) {
    const action = resolveAction(item, seenInFile, existingDedupeKeys);

    if (!item.skipReason) {
      for (const key of item.dedupeKeys) {
        seenInFile.add(key);
      }
    }

    if (action === "create") wouldCreate += 1;
    if (action === "update") wouldUpdate += 1;
    if (action === "skip") wouldSkip += 1;
    if (action === "duplicate") {
      duplicatesInFile += 1;
      if (item.dedupeKeys.some((k) => k.startsWith("email:"))) duplicateByEmail += 1;
      if (item.dedupeKeys.some((k) => k.startsWith("phone:"))) duplicateByPhone += 1;
    }

    lines.push({
      index: item.contactIndex,
      name: item.lead.name || "(bez mena)",
      action,
      externalKey: item.externalKey,
      leadId: item.lead.id,
      email: item.lead.email,
      phone: item.lead.phone,
      dedupeKeys: item.dedupeKeys,
      skipReason: item.skipReason,
      warnings: item.warnings,
    });
  }

  return {
    sourceSystem: "nehnutelnosti_sk",
    exportSource: NEHNUTELNOSTI_EXPORT_SOURCE,
    mode: input.dryRun === false ? "commit" : "dry-run",
    format: input.format ?? "csv",
    summary: {
      totalParsed: input.contacts.length,
      wouldCreate,
      wouldUpdate,
      wouldSkip,
      duplicatesInFile,
      duplicateByEmail,
      duplicateByPhone,
      parseWarnings: parseWarnings.length,
    },
    contacts: lines,
    parseWarnings,
  };
}

export function formatNehnutelnostiDryRunReport(report: NehnutelnostiDryRunReport): string {
  const s = report.summary;
  const lines: string[] = [
    "=== Nehnuteľnosti.sk Contact Export (dry-run) ===",
    `Zdroj: ${report.exportSource}`,
    `Formát: ${report.format}`,
    `Režim: ${report.mode}`,
    "",
    "Súhrn:",
    `  Parsovaných kontaktov: ${s.totalParsed}`,
    `  Vytvoriť:             ${s.wouldCreate}`,
    `  Aktualizovať:         ${s.wouldUpdate}`,
    `  Preskočiť:            ${s.wouldSkip}`,
    `  Duplicity v súbore:   ${s.duplicatesInFile}`,
    `    (email/telefón)     ${s.duplicateByEmail}/${s.duplicateByPhone}`,
    `  Parse warnings:       ${s.parseWarnings}`,
    "",
    "Kontakty:",
  ];

  for (const c of report.contacts) {
    const flags = [
      c.skipReason ? `skip:${c.skipReason}` : null,
      c.dedupeKeys.length ? `keys:${c.dedupeKeys.join(",")}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(
      `  [${c.index + 1}] ${c.name} → ${c.action}${flags ? ` (${flags})` : ""} | lead=${c.leadId.slice(0, 12)}…`,
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

export function runNehnutelnostiExportImportFromText(
  text: string,
  options: NehnutelnostiImportOptions,
): {
  report: NehnutelnostiDryRunReport;
  mapped: MappedNehnutelnostiContact[];
  leads: RevolisLeadDraft[];
} {
  const parsed = parseNehnutelnostiExportText(text);
  const dryRunReport = buildNehnutelnostiDryRunReport({
    contacts: parsed.contacts,
    agencyId: options.agencyId,
    parseWarnings: parsed.warnings,
    existingDedupeKeys: options.existingDedupeKeys,
    dryRun: options.dryRun !== false,
    format: parsed.format,
  });

  const mapped = mapNehnutelnostiContacts(parsed.contacts, options.agencyId);
  const leads = mapped.filter((m) => !m.skipReason).map((m) => m.lead);

  return { report: dryRunReport, mapped, leads };
}

/** Idempotentný re-import: druhý beh s rovnakými dedupe keys → update, nie create. */
export function simulateIdempotentReimport(
  contacts: NehnutelnostiContact[],
  agencyId: string,
): { first: NehnutelnostiDryRunReport; second: NehnutelnostiDryRunReport } {
  const mapped = mapNehnutelnostiContacts(contacts, agencyId);
  const keys = new Set(mapped.flatMap((m) => m.dedupeKeys));

  const first = buildNehnutelnostiDryRunReport({ contacts, agencyId });
  const second = buildNehnutelnostiDryRunReport({
    contacts,
    agencyId,
    existingDedupeKeys: keys,
  });

  return { first, second };
}

export function nehnutelnostiDryRunToImportReport(
  dryRun: NehnutelnostiDryRunReport,
  fileName: string,
): ImportReport {
  const s = dryRun.summary;
  return {
    jobId: "dry-run",
    fileName,
    sourceSystem: "nehnutelnosti_sk",
    totalRows: s.totalParsed,
    importedRows: s.wouldCreate,
    skippedRows: s.wouldSkip,
    duplicateRows: s.wouldUpdate + s.duplicatesInFile,
    errorRows: 0,
    topSkipReasons: [],
  };
}

/** Pomocník pre existujúce leady v DB — z email+telefón kľúčov. */
export function dedupeKeysFromExistingLead(email?: string | null, phone?: string | null): string[] {
  return buildContactDedupeKeys(email, phone);
}

export { NEHNUTELNOSTI_EXPORT_SOURCE };
