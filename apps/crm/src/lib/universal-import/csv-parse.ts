import Papa from "papaparse";

export const MAX_IMPORT_ROWS = 2000;

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

function decodeCsvBuffer(buffer: ArrayBuffer): string {
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("\uFFFD")) {
    try {
      text = new TextDecoder("windows-1250").decode(buffer);
    } catch {
      // keep utf-8 fallback
    }
  }
  return text;
}

export function decodeCsvFile(buffer: ArrayBuffer): string {
  return decodeCsvBuffer(buffer);
}

export function parseCsvText(text: string): ParsedCsv {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.type === "FieldMismatch");
    if (fatal) {
      throw new Error(`CSV parse error: ${fatal.message}`);
    }
  }

  const headers = (parsed.meta.fields ?? []).filter((h) => h.trim().length > 0);
  const rows = (parsed.data ?? [])
    .map((row) => {
      const normalized: Record<string, string> = {};
      for (const header of headers) {
        normalized[header] = String(row[header] ?? "").trim();
      }
      return normalized;
    })
    .filter((row) => Object.values(row).some((v) => v.trim().length > 0));

  return { headers, rows };
}

export function parseCsvBuffer(buffer: ArrayBuffer): ParsedCsv {
  return parseCsvText(decodeCsvBuffer(buffer));
}
