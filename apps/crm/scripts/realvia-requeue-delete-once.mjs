/**
 * One-shot: re-queue failed Realvia delete jobs after string source_id fix (#251).
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local — does not call PROD cron.
 */
import { config } from "node:process";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const report = { at: new Date().toISOString(), ok: false, requeued: 0, errors: [] };

async function main() {
  if (!url || !key) {
    report.errors.push("Missing Supabase env");
    finish(1);
    return;
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: logs, error } = await sb
    .from("realvia_webhook_logs")
    .select("id")
    .ilike("processing_error", "%Unknown payload%")
    .filter("payload_json->>action", "eq", "delete");

  if (error) {
    report.errors.push(error.message);
    finish(1);
    return;
  }

  for (const row of logs ?? []) {
    const { error: logErr } = await sb
      .from("realvia_webhook_logs")
      .update({ processed: false, processing_error: null })
      .eq("id", row.id);
    if (logErr) {
      report.errors.push(logErr.message);
      continue;
    }

    const { error: qErr } = await sb
      .from("realvia_processing_queue")
      .update({
        status: "pending",
        retry_count: 0,
        error_message: null,
        next_retry_at: null,
        processed_at: null,
      })
      .eq("webhook_log_id", row.id);

    if (qErr) {
      report.errors.push(qErr.message);
      continue;
    }
    report.requeued += 1;
  }

  report.ok = report.errors.length === 0;
  finish(report.ok ? 0 : 1);
}

function finish(code) {
  const out = new URL("../docs/audit/realvia-requeue-delete-latest.json", import.meta.url);
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(code);
}

main();
