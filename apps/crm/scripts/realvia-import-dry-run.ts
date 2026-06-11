// Realvia JSON migration — dry-run CLI (default, nič nezapisuje do DB).
// Použitie:
//   npx tsx apps/crm/scripts/realvia-import-dry-run.ts path/to/fixture.json
//   npx tsx apps/crm/scripts/realvia-import-dry-run.ts path/to/fixture.json --agency <UUID>

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  formatRealviaDryRunReport,
  runRealviaJsonImportFromText,
} from "../src/lib/universal-import/realvia/realvia-import";

const DEFAULT_AGENCY = "00000000-0000-4000-8000-000000000001";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const filePath = process.argv[2];
const agencyId = arg("--agency") ?? DEFAULT_AGENCY;
const commit = process.argv.includes("--commit");

async function main() {
  if (!filePath) {
    console.error("Použitie: npx tsx apps/crm/scripts/realvia-import-dry-run.ts <fixture.json> [--agency <UUID>] [--commit]");
    process.exit(1);
  }

  const abs = resolve(process.cwd(), filePath);
  const text = readFileSync(abs, "utf8");
  const { report } = runRealviaJsonImportFromText(text, {
    agencyId,
    dryRun: !commit,
  });

  console.log(formatRealviaDryRunReport(report));

  if (!commit) {
    console.log("\nDRY-RUN — nič sa nezapisovalo. Ostrý import: pridaj --commit (zatiaľ len report).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
