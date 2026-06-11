#!/usr/bin/env npx tsx
/**
 * Import prospects-scored.csv → demo_prospects (service role).
 * Usage: npx tsx apps/crm/scripts/demo-ops/import-prospects.ts [path/to/prospects-scored.csv]
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { domainFromWebUrl, extractEmailDomain } from "../../src/lib/demo-ops/calendly-payload";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function loadCsv(filePath: string): Record<string, string>[] {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = cols[i] ?? "";
    });
    return row;
  });
}

function splitPipe(v: string): string[] {
  return v
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const csvPath =
    process.argv[2] ??
    path.resolve(process.cwd(), "../../data/prospects-scored.csv");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const rows = loadCsv(csvPath);
  const admin = createClient(url, key, { auth: { persistSession: false } });
  let upserted = 0;

  for (const r of rows) {
    if (r.disqualified === "true") continue;
    const outreach = r.outreach_email?.trim() || null;
    const emailDomain =
      extractEmailDomain(outreach ?? "") ?? domainFromWebUrl(r.web) ?? null;

    const record = {
      ico: r.ico,
      nazov: r.nazov ?? "",
      mesto: r.mesto ?? "",
      kraj: r.kraj ?? "",
      icp_score: Number(r.icp_score) || 0,
      web: r.web || null,
      outreach_email: outreach,
      email_domain: emailDomain,
      team_size_estimate: r.team_size_estimate ? Number(r.team_size_estimate) : null,
      portals_detected: splitPipe(r.portals_detected ?? ""),
      crm_signals: splitPipe(r.crm_signals ?? ""),
      konatel: r.konatel || null,
      disqualified: r.disqualified === "true",
      personal_line: r.personal_line || null,
      imported_at: new Date().toISOString(),
    };

    const { error } = await admin.from("demo_prospects").upsert(record, { onConflict: "ico" });
    if (error) {
      console.error(`ico ${r.ico}:`, error.message);
      continue;
    }
    upserted += 1;
  }

  console.log(`Imported/updated ${upserted} prospects from ${csvPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
