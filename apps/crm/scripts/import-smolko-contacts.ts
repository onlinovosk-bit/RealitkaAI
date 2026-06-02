// scripts/import-smolko-contacts.ts
// Jednorazovy runner: import kontaktov Reality Smolko -> public.leads.
// Spustenie (PowerShell):
//   DRY-RUN (nic nezapise):
//     npx tsx scripts/import-smolko-contacts.ts ".\kontakty_smolko_cistene.xlsx" --agency <UUID>
//   OSTRY import:
//     npx tsx scripts/import-smolko-contacts.ts ".\kontakty_smolko_cistene.xlsx" --agency <UUID> --commit
//
// Env (.env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// POZOR: pouzi POVODNY export. NEPOUZIVAJ contacts_clean.xlsx - ma phone poskodeny na float.

import { readFileSync } from "fs";
import { config } from "dotenv";
import { resolve } from "path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { buildLeadRows, IMPORT_SOURCE_TAG, type SourceContact } from "../src/lib/import/contacts-import-core";

// Load env before any runtime usage (prefer cwd, fallback to script-relative path).
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(__dirname, "../.env.local"), override: false });

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const filePath = process.argv[2];
const agencyId = arg("--agency");
const commit = process.argv.includes("--commit");

async function main() {
  if (!filePath || !agencyId) {
    console.error("Pouzitie: tsx scripts/import-smolko-contacts.ts <xlsx> --agency <UUID> [--commit]");
    process.exit(1);
  }

  // 1) Nacitaj xlsx, Telefon ako string (raw:false zabrani vedeckej notacii)
  const wb = XLSX.read(readFileSync(filePath), { type: "buffer" });
  const ws = wb.Sheets["Kontakty"] ?? wb.Sheets[wb.SheetNames[0]];
  const source = XLSX.utils.sheet_to_json<SourceContact>(ws, { raw: false, defval: "" });

  // sanity: odhal poskodene telefony (vedecka notacia) skor nez spravime skodu
  const corrupt = source.filter((r) => /e\+/i.test(String(r["Telefón"] ?? ""))).length;
  if (corrupt > 0) {
    console.error(`CHYBA: ${corrupt} telefonov vo vedeckej notacii - zly zdrojovy subor (float). Pouzi povodny export.`);
    process.exit(1);
  }

  // 2) Transformuj cez zdielane jadro
  const { total, rows, skipped, byAgent, flags } = buildLeadRows(source, agencyId);

  console.log("=== DRY-RUN SUHRN ===");
  console.log(`Vstup: ${total} | Na UPSERT: ${rows.length} | SKIP: ${skipped.length}`);
  console.log(`Flags -> bez mena: ${flags.no_name}, intl tel: ${flags.phone_intl}, neparsovatelny tel: ${flags.phone_unparseable}`);
  console.log("Podla maklera:", byAgent);
  if (skipped.length) console.log("SKIP:", skipped);

  if (!commit) {
    console.log("\nDRY-RUN - nic sa nezapisalo. Ostry import: pridaj --commit");
    return;
  }

  // 3) Ostry upsert cez service role (obide RLS pri serverovom behu)
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("CHYBA: chyba SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY v prostredi (.env.local)");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const BATCH = 100;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await sb.from("leads").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Upsert zlyhal pri davke ${i}-${i + chunk.length}:`, error.message);
      process.exit(1);
    }
    done += chunk.length;
    console.log(`  upsert ${done}/${rows.length}`);
  }
  console.log(`Hotovo. Importovanych/aktualizovanych: ${done} (source=${IMPORT_SOURCE_TAG}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
