import { createHash } from "crypto";
import type { NehnutelnostiContact } from "./nehnutelnosti-schema";

export const NEHNUTELNOSTI_EXPORT_SOURCE = "Universal Import — Nehnutelnosti.sk export";
export const NEHNUTELNOSTI_EXPORT_ROUTE = "nehnutelnosti-export";

export type RevolisLeadDraft = {
  id: string;
  externalKey: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  source: string;
  status: string;
  note: string;
  property_type: string;
  budget: string;
  assigned_agent: string;
  meta: Record<string, unknown>;
};

export type MappedNehnutelnostiContact = {
  contactIndex: number;
  externalKey: string;
  dedupeKeys: string[];
  lead: RevolisLeadDraft;
  warnings: string[];
  skipReason?: "missing_name" | "missing_contact";
};

export function normalizePhoneForDedupe(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("421") && digits.length >= 12) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = digits.slice(1);
  }
  if (digits.length >= 9) return digits.slice(-9);
  return digits;
}

export function buildContactDedupeKeys(email?: string | null, phone?: string | null): string[] {
  const keys: string[] = [];
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  if (normalizedEmail) keys.push(`email:${normalizedEmail}`);

  const normalizedPhone = normalizePhoneForDedupe(phone ?? "");
  if (normalizedPhone.length >= 7) keys.push(`phone:${normalizedPhone}`);

  return keys;
}

export function nehnutelnostiContactExternalKey(
  contact: NehnutelnostiContact,
  contactIndex: number,
): string {
  const email = (contact.email ?? "").toLowerCase();
  const phone = normalizePhoneForDedupe(contact.phone ?? "");
  const name = (contact.name ?? "").toLowerCase();
  const idPart = contact.id ?? String(contactIndex);
  const raw = [idPart, name, email, phone].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function makeNehnutelnostiLeadId(agencyId: string, externalKey: string): string {
  const hash = createHash("sha1").update(`${agencyId}:${externalKey}`).digest("hex").slice(0, 16);
  return `imp_nehn_${hash}`;
}

function mapInquiryType(inquiryType?: string | null): string {
  const value = (inquiryType ?? "").toLowerCase();
  if (/predaj|preda/.test(value)) return "Predaj";
  if (/prenaj|najom|nájom/.test(value)) return "Prenájom";
  if (/kup|kúp/.test(value)) return "Kúpa";
  return "Byt";
}

function mapStatus(status?: string | null): string {
  const value = (status ?? "").toLowerCase();
  if (/ukonc|ukončen|closed|finished/.test(value)) return "Ukončený";
  if (/archiv/.test(value)) return "Archivovaný";
  if (/aktiv|active|nov/.test(value)) return "Nový";
  return (status ?? "").trim() || "Nový";
}

function formatLocation(contact: NehnutelnostiContact): string {
  const parts = [contact.address, contact.city].filter(Boolean);
  return parts.join(", ");
}

function formatBudget(budget?: string | null): string {
  if (!budget) return "";
  const digits = budget.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = Number.parseFloat(digits);
  return Number.isNaN(num) ? budget.trim() : String(Math.round(num));
}

export function mapNehnutelnostiContactToRevolis(
  contact: NehnutelnostiContact,
  agencyId: string,
  contactIndex = 0,
): MappedNehnutelnostiContact {
  const warnings: string[] = [];
  const externalKey = nehnutelnostiContactExternalKey(contact, contactIndex);
  const name = (contact.name ?? "").trim();
  const email = (contact.email ?? "").trim().toLowerCase();
  const phone = (contact.phone ?? "").trim();
  const dedupeKeys = buildContactDedupeKeys(email, phone);

  if (!name) {
    return {
      contactIndex,
      externalKey,
      dedupeKeys,
      lead: buildEmptyLead(agencyId, externalKey),
      warnings,
      skipReason: "missing_name",
    };
  }

  if (!email && !phone) {
    return {
      contactIndex,
      externalKey,
      dedupeKeys,
      lead: buildEmptyLead(agencyId, externalKey),
      warnings,
      skipReason: "missing_contact",
    };
  }

  const noteParts = [
    contact.note?.trim() ?? "",
    contact.createdAt ? `Nehnuteľnosti.sk: vytvorené ${contact.createdAt}` : "",
  ].filter(Boolean);

  const lead: RevolisLeadDraft = {
    id: makeNehnutelnostiLeadId(agencyId, externalKey),
    externalKey,
    name,
    email,
    phone,
    location: formatLocation(contact),
    source: NEHNUTELNOSTI_EXPORT_SOURCE,
    status: mapStatus(contact.status),
    note: noteParts.join("; "),
    property_type: mapInquiryType(contact.inquiryType),
    budget: formatBudget(contact.budget),
    assigned_agent: (contact.agent ?? "").trim() || "Nepriradený",
    meta: {
      nehnutelnosti_id: contact.id,
      nehnutelnosti_inquiry_type: contact.inquiryType,
      nehnutelnosti_created_at: contact.createdAt,
    },
  };

  return { contactIndex, externalKey, dedupeKeys, lead, warnings };
}

function buildEmptyLead(agencyId: string, externalKey: string): RevolisLeadDraft {
  return {
    id: makeNehnutelnostiLeadId(agencyId, externalKey),
    externalKey,
    name: "",
    email: "",
    phone: "",
    location: "",
    source: NEHNUTELNOSTI_EXPORT_SOURCE,
    status: "Nový",
    note: "",
    property_type: "Byt",
    budget: "",
    assigned_agent: "Nepriradený",
    meta: {},
  };
}
