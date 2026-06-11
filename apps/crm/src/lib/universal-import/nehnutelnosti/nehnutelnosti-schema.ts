import { z } from "zod";
import { parseCsvText } from "../csv-parse";

const looseString = z
  .union([z.string(), z.number(), z.boolean()])
  .optional()
  .nullable()
  .transform((v) => (v == null ? null : String(v).trim() || null));

export const NehnutelnostiContactSchema = z
  .object({
    id: looseString,
    name: looseString,
    fullName: looseString,
    clientName: looseString,
    email: looseString,
    phone: looseString,
    mobile: looseString,
    city: looseString,
    address: looseString,
    location: looseString,
    note: looseString,
    notes: looseString,
    inquiryType: looseString,
    type: looseString,
    status: looseString,
    agent: looseString,
    broker: looseString,
    createdAt: looseString,
    created: looseString,
    budget: looseString,
  })
  .passthrough()
  .transform((raw) => ({
    id: raw.id,
    name: raw.name ?? raw.fullName ?? raw.clientName,
    email: raw.email,
    phone: raw.phone ?? raw.mobile,
    city: raw.city,
    address: raw.address ?? raw.location,
    note: raw.note ?? raw.notes,
    inquiryType: raw.inquiryType ?? raw.type,
    status: raw.status,
    agent: raw.agent ?? raw.broker,
    createdAt: raw.createdAt ?? raw.created,
    budget: raw.budget,
    extra: raw,
  }));

export type NehnutelnostiContact = z.infer<typeof NehnutelnostiContactSchema>;

export type NehnutelnostiParseWarning = {
  index: number;
  path: string;
  message: string;
};

export type NehnutelnostiParseResult = {
  contacts: NehnutelnostiContact[];
  warnings: NehnutelnostiParseWarning[];
  format: "csv" | "json";
};

const CSV_COLUMN_ALIASES: Record<keyof Omit<NehnutelnostiContact, "extra">, string[]> = {
  id: ["ID kontaktu", "ID", "Číslo kontaktu", "Ref", "Id"],
  name: ["Meno a priezvisko", "Meno", "Klient", "Kontakt", "Zákazník"],
  email: ["E-mail", "Email", "Mail"],
  phone: ["Telefón", "Mobil", "Tel.", "Mobilné číslo"],
  city: ["Mesto", "Obec", "Lokalita"],
  address: ["Adresa", "Ulica", "Bydlisko"],
  note: ["Poznámka", "Poznámky", "Popis", "Komentár"],
  inquiryType: ["Typ dopytu", "Typ", "Druh dopytu", "Transakcia"],
  status: ["Stav", "Stav dopytu", "Fáza"],
  agent: ["Maklér", "Agent", "Zodpovedný maklér"],
  createdAt: ["Dátum vytvorenia", "Vytvorené", "Created"],
  budget: ["Rozpočet", "Cena", "Budget", "Max. cena"],
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function buildCsvHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const [field, aliases] of Object.entries(CSV_COLUMN_ALIASES)) {
    const normAliases = aliases.map(normalizeHeader);
    const idx = headers.findIndex((h) => normAliases.includes(normalizeHeader(h)));
    if (idx !== -1) map.set(field, headers[idx]);
  }
  return map;
}

function rowToContact(
  row: Record<string, string>,
  headerMap: Map<string, string>,
  index: number,
): { contact: NehnutelnostiContact | null; warnings: NehnutelnostiParseWarning[] } {
  const raw: Record<string, string> = {};
  for (const [field, header] of headerMap.entries()) {
    raw[field] = row[header] ?? "";
  }

  const parsed = NehnutelnostiContactSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      contact: null,
      warnings: [
        {
          index,
          path: "contact",
          message: parsed.error.issues.map((i) => i.message).join("; "),
        },
      ],
    };
  }

  return { contact: parsed.data, warnings: [] };
}

export function parseNehnutelnostiCsvText(text: string): NehnutelnostiParseResult {
  const { headers, rows } = parseCsvText(text);
  const warnings: NehnutelnostiParseWarning[] = [];
  const contacts: NehnutelnostiContact[] = [];

  if (!headers.length) {
    return {
      contacts: [],
      warnings: [{ index: -1, path: "csv", message: "CSV nemá hlavičku." }],
      format: "csv",
    };
  }

  const headerMap = buildCsvHeaderMap(headers);
  if (!headerMap.has("name")) {
    warnings.push({
      index: -1,
      path: "csv.headers",
      message: "Chýba stĺpec s menom kontaktu (Meno a priezvisko).",
    });
  }

  rows.forEach((row, index) => {
    const result = rowToContact(row, headerMap, index);
    warnings.push(...result.warnings);
    if (result.contact) contacts.push(result.contact);
  });

  return { contacts, warnings, format: "csv" };
}

function jsonItemToRaw(item: unknown): Record<string, unknown> {
  if (!item || typeof item !== "object") return {};
  const obj = item as Record<string, unknown>;
  return {
    id: obj.id ?? obj.contactId ?? obj.contact_id,
    name: obj.name ?? obj.fullName ?? obj.full_name ?? obj.clientName ?? obj.client_name,
    email: obj.email ?? obj.e_mail,
    phone: obj.phone ?? obj.mobile ?? obj.telefon,
    city: obj.city ?? obj.mesto,
    address: obj.address ?? obj.adresa ?? obj.location,
    note: obj.note ?? obj.notes ?? obj.poznamka,
    inquiryType: obj.inquiryType ?? obj.inquiry_type ?? obj.type ?? obj.typ,
    status: obj.status ?? obj.stav,
    agent: obj.agent ?? obj.broker ?? obj.makler,
    createdAt: obj.createdAt ?? obj.created_at ?? obj.created,
    budget: obj.budget ?? obj.rozpocet ?? obj.cena,
  };
}

export function parseNehnutelnostiJsonPayload(raw: unknown): NehnutelnostiParseResult {
  const warnings: NehnutelnostiParseWarning[] = [];
  const contacts: NehnutelnostiContact[] = [];

  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.contacts)) items = obj.contacts;
    else if (Array.isArray(obj.kontakty)) items = obj.kontakty;
    else if (obj.name || obj.email || obj.phone) items = [raw];
  }

  items.forEach((item, index) => {
    const parsed = NehnutelnostiContactSchema.safeParse(jsonItemToRaw(item));
    if (!parsed.success) {
      warnings.push({
        index,
        path: "contact",
        message: parsed.error.issues.map((i) => i.message).join("; "),
      });
      return;
    }
    contacts.push(parsed.data);
  });

  return { contacts, warnings, format: "json" };
}

export function parseNehnutelnostiExportText(text: string): NehnutelnostiParseResult {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return parseNehnutelnostiJsonPayload(JSON.parse(trimmed));
    } catch (err) {
      return {
        contacts: [],
        warnings: [
          {
            index: -1,
            path: "json",
            message: err instanceof Error ? err.message : "Neplatný JSON",
          },
        ],
        format: "json",
      };
    }
  }
  return parseNehnutelnostiCsvText(text);
}
