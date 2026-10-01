/**
 * Concatenated prod DDL for Supabase SQL Editor (project ypgajkhqtbriqqmyawyv).
 * Run once after merge #295 + #296 (+ hotfix #297 if agencies contact columns).
 *
 *   Get-Content apps/crm/scripts/prod-sql-20260713-deploy.sql | Set-Clipboard
 *   → Supabase Dashboard → SQL Editor → Run
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "supabase", "migrations");
const FILES = [
  "20260713140000_buyer_intents_tenant_rls.sql",
  "20260713150000_inbound_auto_response.sql",
  "20260713160000_agencies_contact_columns.sql",
];

const parts = FILES.map((f) => {
  const body = readFileSync(join(ROOT, f), "utf8").trim();
  return `-- >>> ${f}\n${body}`;
});

const bundle = `${parts.join("\n\n")}\n`;
const out = join(process.cwd(), "scripts", "prod-sql-20260713-deploy.sql");
writeFileSync(out, bundle, "utf8");
console.log(`Wrote ${out} (${bundle.length} bytes)`);
