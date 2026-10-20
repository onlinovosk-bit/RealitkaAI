import { inflateRawSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";

import type { ParsedCsv } from "./csv-parse";

/**
 * XLSX → rovnaký tvar ako CSV ({ headers, rows }), aby zvyšok sprievodcu
 * (detekcia stĺpcov, mapovanie, náhľad, beh importu) nevedel, odkiaľ dáta sú.
 *
 * Prečo vlastný čítač a nie knižnica: `.xlsx` je ZIP s XML. Rozbaliť ZIP vie
 * `node:zlib` (v Node je), XML vie `fast-xml-parser` (už je priamou závislosťou
 * apps/crm). Jediná rozšírená npm knižnica na XLSX (`xlsx`) má na verejnom
 * registri poslednú verziu z roku 2022 s neopravenou prototype-pollution
 * zraniteľnosťou; pridať ju do cesty, kade tečú zákazníkove kontakty, je horšia
 * voľba než 250 riadkov čítača, ktorý robí presne to, čo potrebujeme.
 */

/** Strop na SÚČET rozbalených bajtov. Bez neho je 10 MB zip-bomba DoS na serverless funkciu. */
export const MAX_XLSX_INFLATED_BYTES = 80 * 1024 * 1024;

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

export class XlsxParseError extends Error {}

function readZipDirectory(buf: Buffer): Map<string, ZipEntry> {
  // EOCD je na konci, za ním môže byť komentár (max 65 535 B).
  const minEocd = 22;
  const searchFrom = Math.max(0, buf.length - (minEocd + 0xffff));
  let eocd = -1;
  for (let i = buf.length - minEocd; i >= searchFrom; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new XlsxParseError("Súbor nie je platný .xlsx (chýba ZIP adresár).");

  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (offset === 0xffffffff) {
    throw new XlsxParseError("ZIP64 .xlsx zatiaľ nevieme prečítať — uložte súbor znova ako .xlsx.");
  }

  const entries = new Map<string, ZipEntry>();
  for (let i = 0; i < entryCount; i += 1) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new XlsxParseError("Poškodený ZIP adresár v .xlsx.");
    }
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const uncompressedSize = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
    entries.set(name, { name, method, compressedSize, uncompressedSize, localHeaderOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readEntry(buf: Buffer, entry: ZipEntry, budget: { left: number }): string {
  if (entry.uncompressedSize > budget.left) {
    throw new XlsxParseError("Obsah .xlsx je po rozbalení príliš veľký.");
  }
  const lo = entry.localHeaderOffset;
  if (lo + 30 > buf.length || buf.readUInt32LE(lo) !== LOCAL_SIGNATURE) {
    throw new XlsxParseError(`Poškodená položka ${entry.name} v .xlsx.`);
  }
  // Lokálna hlavička má pri data descriptore nuly vo veľkostiach, preto berieme
  // veľkosti z centrálneho adresára a z lokálnej hlavičky iba dĺžky polí.
  const nameLen = buf.readUInt16LE(lo + 26);
  const extraLen = buf.readUInt16LE(lo + 28);
  const start = lo + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compressedSize);

  let out: Buffer;
  if (entry.method === 0) {
    out = Buffer.from(raw);
  } else if (entry.method === 8) {
    out = inflateRawSync(raw, { maxOutputLength: budget.left });
  } else {
    throw new XlsxParseError(`Nepodporovaná kompresia v .xlsx (metóda ${entry.method}).`);
  }
  budget.left -= out.length;
  if (budget.left < 0) throw new XlsxParseError("Obsah .xlsx je po rozbalení príliš veľký.");
  return out.toString("utf8");
}

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** "AB" → 27 (1-based číslo stĺpca). */
export function columnLetterToIndex(ref: string): number {
  const letters = ref.replace(/[^A-Za-z]/g, "").toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function textOf(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  const obj = node as Record<string, unknown>;
  return typeof obj["#text"] === "string" ? obj["#text"] : "";
}

function readSharedStrings(content: string | undefined): string[] {
  if (!content) return [];
  const doc = xml.parse(content) as Record<string, unknown>;
  const sst = doc.sst as Record<string, unknown> | undefined;
  if (!sst) return [];
  return asArray(sst.si as unknown).map((si) => {
    const node = si as Record<string, unknown>;
    // Jednoduchý reťazec <t>, alebo rich text: viac <r><t>…</t></r> za sebou.
    const direct = textOf(node.t);
    if (direct) return direct;
    const runs = asArray(node.r as unknown)
      .map((r) => textOf((r as Record<string, unknown>).t))
      .join("");
    return runs;
  });
}

/** Vstavané formáty dátumu v OOXML + vlastné (id ≥ 164), ktoré majú y/m/d/h/s mimo úvodzoviek. */
const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function isDateFormatCode(code: string): boolean {
  const withoutLiterals = code.replace(/\[[^\]]*\]/g, "").replace(/"[^"]*"/g, "");
  return /[ymdhs]/i.test(withoutLiterals);
}

function readDateStyles(content: string | undefined): Set<number> {
  const dateStyleIndexes = new Set<number>();
  if (!content) return dateStyleIndexes;
  const doc = xml.parse(content) as Record<string, unknown>;
  const styleSheet = doc.styleSheet as Record<string, unknown> | undefined;
  if (!styleSheet) return dateStyleIndexes;

  const customDateIds = new Set<number>();
  const numFmts = styleSheet.numFmts as Record<string, unknown> | undefined;
  for (const fmt of asArray(numFmts?.numFmt as unknown)) {
    const node = fmt as Record<string, string>;
    const id = Number(node["@_numFmtId"]);
    const code = node["@_formatCode"] ?? "";
    if (Number.isFinite(id) && isDateFormatCode(code)) customDateIds.add(id);
  }

  const cellXfs = styleSheet.cellXfs as Record<string, unknown> | undefined;
  asArray(cellXfs?.xf as unknown).forEach((xf, index) => {
    const id = Number((xf as Record<string, string>)["@_numFmtId"] ?? "0");
    if (BUILTIN_DATE_FORMATS.has(id) || customDateIds.has(id)) dateStyleIndexes.add(index);
  });
  return dateStyleIndexes;
}

/**
 * Excel serial → ISO dátum.
 *
 * Od 1900-03-01 (serial 61) vyššie platí základ 1899-12-30: ten jeden deň navyše
 * presne pohltí Excelov zámerne neexistujúci 1900-02-29. Pre serial 1–59 je ale
 * ten istý základ o deň vedľa (Excel ukazuje serial 1 ako 1900-01-01), a serial
 * 60 je práve ten neexistujúci deň — vraciame ho ako text, lebo skutočný dátum
 * to nie je. Hodnota s desatinnou časťou nesie aj čas.
 */
export function excelSerialToIso(serial: number): string {
  if (!Number.isFinite(serial) || serial < 1) return String(serial);
  if (Math.floor(serial) === 60) return "1900-02-29";
  const shift = serial < 60 ? 1 : 0;
  const ms = Math.round((serial - 25569 + shift) * 86_400_000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(serial);
  const date = d.toISOString().slice(0, 10);
  const hasTime = Math.abs(serial - Math.floor(serial)) > 1e-9;
  return hasTime ? `${date} ${d.toISOString().slice(11, 19)}` : date;
}

function firstSheetPath(workbook: string | undefined, rels: string | undefined): string {
  const fallback = "xl/worksheets/sheet1.xml";
  if (!workbook) return fallback;
  const doc = xml.parse(workbook) as Record<string, unknown>;
  const sheets = (doc.workbook as Record<string, unknown> | undefined)?.sheets as
    | Record<string, unknown>
    | undefined;
  const list = asArray(sheets?.sheet as unknown).map((s) => s as Record<string, string>);
  const visible = list.find((s) => (s["@_state"] ?? "visible") === "visible") ?? list[0];
  const rid = visible?.["@_r:id"];
  if (!rid || !rels) return fallback;

  const relDoc = xml.parse(rels) as Record<string, unknown>;
  const relations = (relDoc.Relationships as Record<string, unknown> | undefined)?.Relationship;
  const match = asArray(relations as unknown)
    .map((r) => r as Record<string, string>)
    .find((r) => r["@_Id"] === rid);
  const target = match?.["@_Target"];
  if (!target) return fallback;
  const normalized = target.replace(/^\/?xl\//, "").replace(/^\//, "");
  return `xl/${normalized}`;
}

export function parseXlsxBuffer(buffer: ArrayBuffer): ParsedCsv {
  const buf = Buffer.from(buffer);
  const entries = readZipDirectory(buf);
  const budget = { left: MAX_XLSX_INFLATED_BYTES };

  const read = (name: string): string | undefined => {
    const entry = entries.get(name);
    return entry ? readEntry(buf, entry, budget) : undefined;
  };

  const sheetPath = firstSheetPath(read("xl/workbook.xml"), read("xl/_rels/workbook.xml.rels"));
  const sheetXml = read(sheetPath) ?? read("xl/worksheets/sheet1.xml");
  if (!sheetXml) throw new XlsxParseError("V .xlsx sa nenašiel žiadny hárok.");

  const shared = readSharedStrings(read("xl/sharedStrings.xml"));
  const dateStyles = readDateStyles(read("xl/styles.xml"));

  const doc = xml.parse(sheetXml) as Record<string, unknown>;
  const sheetData = (doc.worksheet as Record<string, unknown> | undefined)?.sheetData as
    | Record<string, unknown>
    | undefined;
  const rowNodes = asArray(sheetData?.row as unknown).map((r) => r as Record<string, unknown>);

  const cellText = (cell: Record<string, unknown>): string => {
    const type = (cell["@_t"] as string | undefined) ?? "n";
    if (type === "inlineStr") {
      const is = cell.is as Record<string, unknown> | undefined;
      const direct = textOf(is?.t);
      if (direct) return direct;
      return asArray(is?.r as unknown)
        .map((r) => textOf((r as Record<string, unknown>).t))
        .join("");
    }
    const raw = textOf(cell.v);
    if (raw === "") return "";
    if (type === "s") {
      const index = Number(raw);
      return Number.isInteger(index) && index >= 0 && index < shared.length ? shared[index] : "";
    }
    if (type === "b") return raw === "1" ? "TRUE" : "FALSE";
    if (type === "e") return "";
    if (type === "str" || type === "d") return raw;
    // číslo: dátumový formát rozlíšime cez styles.xml, inak necháme tak, ako je
    const styleIndex = Number(cell["@_s"] ?? NaN);
    if (Number.isInteger(styleIndex) && dateStyles.has(styleIndex)) {
      const n = Number(raw);
      if (Number.isFinite(n)) return excelSerialToIso(n);
    }
    return raw;
  };

  /** Riadok ako mapa 1-based index stĺpca → text; prázdne bunky chýbajú. */
  const rowToColumns = (row: Record<string, unknown>): Map<number, string> => {
    const map = new Map<number, string>();
    asArray(row.c as unknown).forEach((c, fallbackIndex) => {
      const cell = c as Record<string, unknown>;
      const ref = cell["@_r"] as string | undefined;
      const index = ref ? columnLetterToIndex(ref) : fallbackIndex + 1;
      const text = cellText(cell).trim();
      if (text !== "") map.set(index, text);
    });
    return map;
  };

  const nonEmpty = rowNodes.map(rowToColumns).filter((m) => m.size > 0);
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headerRow = nonEmpty[0];
  const headerByIndex = new Map<number, string>();
  const headers: string[] = [];
  for (const [index, text] of [...headerRow.entries()].sort((a, b) => a[0] - b[0])) {
    headerByIndex.set(index, text);
    headers.push(text);
  }

  const rows = nonEmpty.slice(1).map((cols) => {
    const record: Record<string, string> = {};
    for (const header of headers) record[header] = "";
    for (const [index, header] of headerByIndex) record[header] = cols.get(index) ?? "";
    return record;
  });

  return { headers, rows };
}

/**
 * `.xlsx` je ZIP, a ZIP vždy začína „PK\x03\x04". Formát rozoznávame z obsahu,
 * nie z toho, čo si používateľ vybral v rozbaľovacom zozname: export z Realvie
 * uložený ako Excel sa predtým poslal CSV parseru a skončil nezrozumiteľnou
 * chybou o hlavičkách.
 */
export function looksLikeZipContainer(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  return view.length === 4 && view[0] === 0x50 && view[1] === 0x4b && view[2] === 0x03 && view[3] === 0x04;
}
