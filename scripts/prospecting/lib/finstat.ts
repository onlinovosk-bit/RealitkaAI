import fs from "node:fs";
import type { FinStatRow } from "./types.ts";
import { classifyEmail } from "./email.ts";

const HEADER_ALIASES: Record<keyof Omit<FinStatRow, "outreach_email" | "outreach_email_flag">, string[]> = {
  ico: ["ico", "ičo", "ic"],
  nazov: ["nazov", "názov", "name", "firma", "company"],
  web: ["web", "website", "url", "www"],
  kraj: ["kraj", "region"],
  mesto: ["mesto", "city", "obec"],
  zamestnanci: ["zamestnanci", "zamestnanec", "employees", "pocet_zamestnancov"],
  konatel: ["konatel", "konateľ", "konatelia", "director", "statutar"],
  email: ["email", "e-mail", "mail"],
  telefon: ["telefon", "telefón", "phone", "tel"],
};

function normHeader(h: string): string {
  return h.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if ((c === "," || c === ";") && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

function mapHeaders(headers: string[]): Partial<Record<keyof FinStatRow, number>> {
  const norm = headers.map(normHeader);
  const map: Partial<Record<keyof FinStatRow, number>> = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [keyof typeof HEADER_ALIASES, string[]][]) {
    const idx = norm.findIndex((h) => aliases.some((a) => normHeader(a) === h || h.includes(normHeader(a))));
    if (idx >= 0) map[key] = idx;
  }
  return map;
}

function parseEmployees(raw: string): number | null {
  const n = parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeWeb(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^www\./i, "")}`;
}

export function parseFinStatCsv(content: string): FinStatRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delim = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = parseCsvLine(lines[0].replace(/;/g, delim === ";" ? ";" : ","));
  const col = mapHeaders(headers);

  const rows: FinStatRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c)) continue;

    const get = (k: keyof typeof HEADER_ALIASES) => {
      const idx = col[k];
      return idx != null ? (cells[idx] ?? "").trim() : "";
    };

    const email = get("email");
    const emailClass = classifyEmail(email);

    rows.push({
      ico: get("ico"),
      nazov: get("nazov"),
      web: normalizeWeb(get("web")),
      kraj: get("kraj"),
      mesto: get("mesto"),
      zamestnanci: parseEmployees(get("zamestnanci")),
      konatel: get("konatel"),
      email,
      telefon: get("telefon"),
      outreach_email: emailClass === "company" ? email : null,
      outreach_email_flag: emailClass,
    });
  }
  return rows;
}

export function loadFinStatCsv(filePath: string): FinStatRow[] {
  const content = fs.readFileSync(filePath, "utf8");
  return parseFinStatCsv(content);
}
