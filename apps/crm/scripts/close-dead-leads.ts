const usage = "Usage: close-dead-leads.ts --agency-id <id> [--dry-run]";
const argumentsList = process.argv.slice(2);
const agencyIndex = argumentsList.indexOf("--agency-id");
const agencyId = agencyIndex >= 0 ? argumentsList[agencyIndex + 1] : undefined;
const dryRun = !argumentsList.includes("--execute");

if (!agencyId) {
  console.error(usage);
  process.exit(1);
}

if (!dryRun) {
  console.error("Execution is intentionally not implemented in S2; use --dry-run only.");
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    dryRun: true,
    agencyId,
    rule: "NO_RECORDED_CONTACT_90D",
    message: "No records were modified. This script only defines the dry-run boundary.",
  })
);