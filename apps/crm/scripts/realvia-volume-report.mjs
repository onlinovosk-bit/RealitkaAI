import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = { hours: 168, agencyId: null };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--hours" && argv[i + 1]) {
      args.hours = Number(argv[i + 1]);
      i += 1;
    } else if (token === "--agency-id" && argv[i + 1]) {
      args.agencyId = argv[i + 1];
      i += 1;
    }
  }
  if (!Number.isFinite(args.hours) || args.hours <= 0) {
    throw new Error("--hours must be a positive number");
  }
  return args;
}

async function countRows(queryBuilder) {
  const { count, error } = await queryBuilder.select("*", { head: true, count: "exact" });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  const { hours, agencyId } = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Run this from an environment with CRM production/staging secrets.",
    );
  }

  const sb = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  const to = now.toISOString();

  let baseLogs = sb.from("realvia_webhook_logs").gte("created_at", from).lte("created_at", to);
  let baseProperties = sb
    .from("properties")
    .eq("source_system", "realvia")
    .gte("created_at", from)
    .lte("created_at", to);
  let baseLeads = sb.from("revolis_leads").gte("created_at", from).lte("created_at", to);

  if (agencyId) {
    baseLogs = baseLogs.eq("agency_id", agencyId);
    baseProperties = baseProperties.eq("agency_id", agencyId);
    baseLeads = baseLeads.eq("agency_id", agencyId);
  }

  const [
    totalWebhookLogs,
    advertPayloads,
    deletePayloads,
    unknownPayloads,
    processedLogs,
    failedLogs,
    unresolvedAgencyLogs,
    realviaPropertiesCreated,
    revolisLeadsInWindow,
  ] = await Promise.all([
    countRows(baseLogs),
    countRows(baseLogs.eq("payload_type", "advert")),
    countRows(baseLogs.eq("payload_type", "delete")),
    countRows(baseLogs.eq("payload_type", "unknown")),
    countRows(baseLogs.eq("processed", true)),
    countRows(baseLogs.eq("processed", false)),
    countRows(baseLogs.is("agency_id", null)),
    countRows(baseProperties),
    countRows(baseLeads),
  ]);

  const report = {
    window: { from, to, hours },
    filters: { agencyId: agencyId ?? "all" },
    counts: {
      totalWebhookLogs,
      advertPayloads,
      deletePayloads,
      unknownPayloads,
      processedLogs,
      failedLogs,
      unresolvedAgencyLogs,
      realviaPropertiesCreated,
      revolisLeadsInWindow,
    },
    interpretation: {
      inboundLeadPayloadsFromRealvia: 0,
      note:
        "Realvia webhook contract in this repo ingests adverts/deletes into properties; " +
        "leads are not natively pushed by Realvia payload.",
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error("[realvia-volume-report] ERROR:", error.message);
  process.exitCode = 1;
});
