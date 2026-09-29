/**
 * DEMAND-BACKFILL EXPERIMENT (DEMAND-D1) — read-only.
 *
 * Runs Demand Contract v1 extraction over historical leads and writes a
 * labeling sheet. It NEVER writes to the database: there is no --apply flag.
 * Production data changes only through ingestion, after the measured accuracy
 * has been accepted.
 *
 *   # 1. extract (needs ANTHROPIC_API_KEY + service role in .env.local)
 *   npx tsx scripts/demand-backfill-experiment.ts extract --agency <uuid> --sample 60
 *   # 2. a human fills `judgement` (correct|wrong) and `truth_value` in labels.csv
 *   # 3. score
 *   npx tsx scripts/demand-backfill-experiment.ts score tmp-demand-backfill/<run>/labels.csv
 *
 * Output goes to apps/crm/tmp-demand-backfill/ (gitignored). The sheet holds
 * redacted inquiry text only: e-mails, phones and the lead's name are masked
 * before the model sees them and before they are written to disk.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

import { config } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { knownFields, isCoreComplete } from "../src/lib/demand/contract";
import { extractDemand } from "../src/lib/demand/extract";
import { inquiryTextFromNote, redactForModel } from "../src/lib/demand/redact";
import { LABEL_COLUMNS, labelRows, scoreLabels } from "../src/lib/demand/backfill-score";

const OUT_ROOT = resolve(process.cwd(), "tmp-demand-backfill");
const MIN_NOTE_CHARS = 40;

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function extract() {
  const agencyId = arg("agency");
  const sample = Number(arg("sample", "60"));
  if (!agencyId) throw new Error("--agency <uuid> is required (one tenant per run)");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("leads")
    .select("id, name, note, source")
    .eq("agency_id", agencyId)
    .not("note", "is", null)
    .order("id")
    .limit(1000);
  if (error) throw new Error(error.message);
  const leads = (data ?? []).filter((l) => (l.note ?? "").length >= MIN_NOTE_CHARS).slice(0, sample);

  const run = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(OUT_ROOT, run);
  mkdirSync(dir, { recursive: true });

  const lines: string[] = [LABEL_COLUMNS.join(",")];
  const results: string[] = [];
  const tally = { leads: 0, ok: 0, no_text: 0, llm_error: 0, invalid_output: 0, with_any: 0, core_complete: 0 };
  for (const l of leads) {
    const inquiry = inquiryTextFromNote(l.note);
    const rec = await extractDemand({ inquiryText: inquiry, leadName: l.name });
    tally.leads++;
    tally[rec.status as "ok" | "no_text" | "llm_error" | "invalid_output"]++;
    if (knownFields(rec.demand).length > 0) tally.with_any++;
    if (isCoreComplete(rec.demand)) tally.core_complete++;
    results.push(JSON.stringify({ lead_id: l.id, source: l.source, status: rec.status, demand: rec.demand }));
    lines.push(...labelRows(l.id, rec.demand, redactForModel(inquiry, l.name)));
  }
  writeFileSync(resolve(dir, "results.jsonl"), results.join("\n") + "\n");
  writeFileSync(resolve(dir, "labels.csv"), lines.join("\n") + "\n");
  writeFileSync(resolve(dir, "summary.json"), JSON.stringify(tally, null, 2) + "\n");
  console.log(JSON.stringify({ run_dir: dir, ...tally }, null, 2));
}

function score() {
  const file = process.argv[3];
  if (!file) throw new Error("usage: score <labels.csv>");
  const { fields, overall } = scoreLabels(readFileSync(file, "utf8"));
  const pct = (v: number | null) => (v === null ? "  n/a" : `${(v * 100).toFixed(0).padStart(4)}%`);
  console.log("field          labeled  extracted  precision  recall  unknown  false+");
  for (const f of [...fields, { field: "OVERALL", ...overall }]) {
    console.log(
      `${String(f.field).padEnd(14)} ${String(f.labeled).padStart(7)}  ${String(f.extracted).padStart(9)}  ` +
        `${pct(f.precision).padStart(9)}  ${pct(f.recall).padStart(6)}  ${pct(f.unknown_rate).padStart(7)}  ${pct(f.false_positive_rate).padStart(6)}`,
    );
  }
}

const cmd = process.argv[2];
(cmd === "extract" ? extract() : cmd === "score" ? Promise.resolve().then(score) : Promise.reject(new Error("usage: extract | score")))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
