// src/lib/import/contacts-import-core.ts
// Znovupouzitelne JADRO importu kontaktov -> tabulka `leads`.
// Ciste funkcie bez I/O: testovatelne, pouzitelne runnerom aj neskorsim endpointom.
// Logika overena proti realnemu exportu Reality Smolko (439 riadkov: 439 ok / 0 skip / 0 dup).

import { createHash } from "crypto";

// -- Typy ------------------------------------------------------------
export interface SourceContact {
  Meno?: string | null;
  Priezvisko?: string | null;
  Email?: string | null;
  /** Telefon MUSI prist ako string (nie number) - inak strata '+' a presnosti. */
  "Telefón"?: string | null;
  "Maklér"?: string | null;
}

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  assigned_agent: string;
  agency_id: string;
  source: string;
  status: string;
  score: number;
  ai_followup_count: number;
  location: string;
  budget: string;
  property_type: string;
  rooms: string;
  financing: string;
  timeline: string;
  last_contact: string;
  note: string;
  created_at: string;
}

export interface SkippedRow {
  row: number;
  reason: string;
  email?: string | null;
  phone?: string | null;
}

export interface BuildResult {
  total: number;
  rows: LeadRow[];
  skipped: SkippedRow[];
  byAgent: Record<string, number>;
  flags: { no_name: number; phone_intl: number; phone_unparseable: number };
}

// -- Konstanty -------------------------------------------------------
const SOURCE = "realvia_import_smolko";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// zname E.164 predvolby vyskytujuce sa v datach (zoradene podla dlzky desc pri pouziti)
const COUNTRY_CODES = [
  "421", "420", "49", "48", "43", "41", "44", "39", "36",
  "33", "32", "31", "30", "7", "380", "359", "385",
].sort((a, b) => b.length - a.length);

// -- Cistiace funkcie ------------------------------------------------

/** Konzervativna E.164 normalizacia. NEHADA predvolbu - cudzie cisla ponechava. */
export function normalizePhone(raw: unknown): { phone: string; status: "sk" | "intl" | "empty" | "unparseable" } {
  if (raw == null) return { phone: "", status: "empty" };
  let d = String(raw).replace(/\D/g, "");
  if (!d) return { phone: "", status: "empty" };
  if (d.startsWith("00")) d = d.slice(2);
  for (const c of COUNTRY_CODES) {
    if (d.startsWith(c) && d.length >= c.length + 8) {
      return { phone: "+" + d, status: "intl" };
    }
  }
  if (d.startsWith("0") && d.length === 10) return { phone: "+421" + d.slice(1), status: "sk" };
  if (d.length === 9) return { phone: "+421" + d, status: "sk" };
  return { phone: "", status: "unparseable" }; // NOT NULL -> '' , nie null
}

/** Odfiltruje garbage hodnoty mena ('.', samotne cisla, 1 znak). */
export function cleanName(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (s === "." || s === "" || /^\d+$/.test(s) || s.length <= 1) return "";
  return s;
}

/** Deterministicke id -> idempotentny upsert na PK. */
export function makeLeadId(dedupKey: string): string {
  return "imp_smolko_" + createHash("sha1").update(dedupKey).digest("hex").slice(0, 16);
}

// -- Hlavna transformacia -------------------------------------------

export function buildLeadRows(source: SourceContact[], agencyId: string): BuildResult {
  if (!agencyId) throw new Error("agencyId je povinny (overeny z tabulky agencies)");

  const rows: LeadRow[] = [];
  const skipped: SkippedRow[] = [];
  const seen = new Set<string>();
  const byAgent: Record<string, number> = {};
  const flags = { no_name: 0, phone_intl: 0, phone_unparseable: 0 };
  const now = new Date().toISOString();

  source.forEach((r, i) => {
    const name = `${cleanName(r.Meno)} ${cleanName(r.Priezvisko)}`.trim();
    const emailRaw = r.Email == null ? "" : String(r.Email).trim().toLowerCase();
    const emailOk = !!emailRaw && EMAIL_RE.test(emailRaw);
    const { phone, status } = normalizePhone(r["Telefón"]);
    const agent = r["Maklér"] == null ? "" : String(r["Maklér"]).trim();

    if (!emailOk && (status === "empty" || status === "unparseable")) {
      skipped.push({ row: i + 2, reason: "no valid email/phone", email: r.Email, phone: r["Telefón"] });
      return;
    }

    const dedupKey = emailOk ? emailRaw : "PH:" + phone;
    if (seen.has(dedupKey)) return; // dedup: email primarne, telefon sekundarne; prvy vyhrava
    seen.add(dedupKey);

    const rowFlags: string[] = [];
    if (!name) { rowFlags.push("no_name"); flags.no_name++; }
    if (status === "unparseable") { rowFlags.push("phone_unparseable"); flags.phone_unparseable++; }
    if (status === "intl") { rowFlags.push("phone_intl"); flags.phone_intl++; }
    const note = "Import Realvia 2026" + (rowFlags.length ? " | REVIZIA: " + rowFlags.join("|") : "");

    if (agent) byAgent[agent] = (byAgent[agent] ?? 0) + 1;

    rows.push({
      id: makeLeadId(dedupKey),
      name,
      email: emailOk ? emailRaw : "",
      phone, // '' ak unparseable (stlpec je NOT NULL)
      assigned_agent: agent,
      agency_id: agencyId,
      source: SOURCE,
      status: "Nový",
      score: 0,
      ai_followup_count: 0,
      location: "", budget: "", property_type: "", rooms: "",
      financing: "", timeline: "", last_contact: "",
      note,
      created_at: now,
    });
  });

  return { total: source.length, rows, skipped, byAgent, flags };
}

export const IMPORT_SOURCE_TAG = SOURCE;
