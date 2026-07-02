import { createClient } from "@supabase/supabase-js";

const VALID_PRIORITIES = new Set(["Vysoká", "Stredná", "Nízka"]);

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
  };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const { dryRun } = parseArgs();
  const baseUrl = requireEnv("APP_URL").replace(/\/+$/, "");
  const cronSecret = requireEnv("CRON_SECRET");

  if (dryRun) {
    console.log("Dry run successful: required runtime config is present.");
    return;
  }

  const response = await fetch(`${baseUrl}/api/cron/lead-ai-triage`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${cronSecret}`,
    },
  });

  const payload = await response.json();
  assertCondition(response.ok, `Cron route failed (${response.status}): ${JSON.stringify(payload)}`);
  assertCondition(payload?.ok === true, "Cron response does not confirm success.");
  assertCondition(
    Number.isInteger(payload?.processed) && payload.processed >= 0,
    "Cron response has invalid processed count.",
  );
  assertCondition(
    Number.isInteger(payload?.updated) && payload.updated >= 0,
    "Cron response has invalid updated count.",
  );

  const testLeadId = process.env.TRIAGE_TEST_LEAD_ID?.trim();
  if (!testLeadId) {
    console.log(
      `Cron smoke OK. processed=${payload.processed}, updated=${payload.updated}. Set TRIAGE_TEST_LEAD_ID for DB assertions.`,
    );
    return;
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: lead, error } = await supabase
    .from("leads")
    .select("id,ai_priority,ai_reason,ai_triage_at")
    .eq("id", testLeadId)
    .single();

  if (error) {
    throw new Error(`Failed to read lead ${testLeadId}: ${error.message}`);
  }

  assertCondition(Boolean(lead?.ai_triage_at), "Expected ai_triage_at to be set after cron run.");
  assertCondition(
    VALID_PRIORITIES.has(String(lead?.ai_priority ?? "")),
    `ai_priority must be one of: ${Array.from(VALID_PRIORITIES).join(", ")}`,
  );
  assertCondition(String(lead?.ai_reason ?? "").trim().length > 0, "Expected ai_reason to be non-empty.");

  console.log(
    `Cron + DB smoke OK for lead ${lead.id}. priority=${lead.ai_priority}, triaged_at=${lead.ai_triage_at}`,
  );
}

main().catch((error) => {
  console.error(`lead-ai-triage smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
