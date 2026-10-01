/**
 * DEMAND-BACKFILL EXPERIMENT (DEMAND-D1) — read-only.
 *
 * Runs Demand Contract v1 extraction over historical leads and writes a
 * labeling sheet. It NEVER writes to the database: there is no --apply flag.
 * Production data changes only through ingestion, after the measured accuracy
 * has been accepted.
 *
 *   # 1. extract (needs ANTHROPIC_API_KEY; --agency also the service role in .env.local)
 *   npx tsx scripts/demand-backfill-experiment.ts extract --agency <uuid> --sample 100
 *   #    + historical portal e-mails (.eml / .mbox / .txt), same parser as production:
 *   npx tsx scripts/demand-backfill-experiment.ts extract --agency <uuid> --sample 100 --input ~/dopyty
 *   # 2. a human fills, for EVERY row: evidence_present (y|n), gold_value, evidence_span
 *   # 3. score
 *   npx tsx scripts/demand-backfill-experiment.ts score tmp-demand-backfill/<run>/labels.csv
 *
 * Output goes to apps/crm/tmp-demand-backfill/ (gitignored). The sheet holds
 * redacted inquiry text only: e-mails, phones and the lead's name are masked
 * before the model sees them and before they are written to disk. E-mail rows
 * are keyed by a content hash; `sources.csv` (same local dir) maps it back to
 * the file. The same inquiry seen in the DB and in the inbox is measured once.
 *
 * .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

import { config } from "dotenv";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { basename, resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { knownFields, isCoreComplete } from "../src/lib/demand/contract";
import { extractDemand } from "../src/lib/demand/extract";
import { inquiryTextFromNote, redactForModel } from "../src/lib/demand/redact";
import { LABEL_COLUMNS, labelRows, scoreLabels } from "../src/lib/demand/backfill-score";
import { emailInquiry, messagesFromFile } from "../src/lib/demand/backfill-input";
import { normalize } from "../src/lib/demand/verify";

const OUT_ROOT = resolve(process.cwd(), "tmp-demand-backfill");
const MIN_NOTE_CHARS = 40;

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

type Item = { id: string; origin: string; inquiry: string; leadName: string | null; file?: string };

async function itemsFromDb(agencyId: string, sample: number): Promise<Item[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("leads")
    .select("id, name, note, source")
    .eq("agency_id", agencyId)
    .not("note", "is", null)
    .order("id")
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((l) => (l.note ?? "").length >= MIN_NOTE_CHARS)
    .slice(0, sample)
    .map((l) => ({ id: l.id, origin: `db:${l.source ?? "-"}`, inquiry: inquiryTextFromNote(l.note), leadName: l.name }));
}

function itemsFromFiles(dir: string, skipped: Record<string, number>, sources: string[]): Item[] {
  const files = readdirSync(dir).filter((f) => statSync(resolve(dir, f)).isFile()).sort();
  const items: Item[] = [];
  for (const f of files) {
    const msgs = messagesFromFile(f, readFileSync(resolve(dir, f), "utf8"));
    if (msgs.length === 0) skipped.unsupported_file = (skipped.unsupported_file ?? 0) + 1;
    for (const m of msgs) {
      const r = emailInquiry(m);
      if (!r.ok) {
        sources.push([r.id, basename(f), `skipped:${r.reason}`].join(","));
        skipped[r.reason] = (skipped[r.reason] ?? 0) + 1;
        continue;
      }
      items.push({ id: r.id, origin: "email", inquiry: r.inquiryText, leadName: r.leadName, file: basename(f) });
    }
  }
  return items;
}

async function extract() {
  const agencyId = arg("agency");
  const input = arg("input");
  const sample = Number(arg("sample", "100"));
  if (!agencyId && !input) throw new Error("--agency <uuid> and/or --input <dir> is required (one tenant per run)");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");

  const skipped: Record<string, number> = {};
  const sources: string[] = ["id,file,status"];
  const candidates = [
    ...(agencyId ? await itemsFromDb(agencyId, sample) : []),
    ...(input ? itemsFromFiles(resolve(input), skipped, sources) : []),
  ];
  // A portal inquiry that became a lead is also in the inbox: measure it once.
  const seen = new Set<string>();
  const items = candidates.filter((it) => {
    const k = normalize(redactForModel(it.inquiry, it.leadName));
    const reason = !k ? "empty" : seen.has(k) ? "duplicate" : null;
    if (it.file) sources.push([it.id, it.file, reason ? `skipped:${reason}` : "measured"].join(","));
    if (reason) {
      skipped[reason] = (skipped[reason] ?? 0) + 1;
      return false;
    }
    seen.add(k);
    return true;
  });

  const run = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = resolve(OUT_ROOT, run);
  mkdirSync(dir, { recursive: true });

  const lines: string[] = [LABEL_COLUMNS.join(",")];
  const results: string[] = [];
  const tally = {
    items: 0, from_db: 0, from_email: 0, ok: 0, no_text: 0, llm_error: 0, invalid_output: 0,
    with_any: 0, core_complete: 0, skipped,
  };
  for (const it of items) {
    const rec = await extractDemand({ inquiryText: it.inquiry, leadName: it.leadName });
    tally.items++;
    if (it.origin === "email") tally.from_email++;
    else tally.from_db++;
    tally[rec.status as "ok" | "no_text" | "llm_error" | "invalid_output"]++;
    if (knownFields(rec.demand).length > 0) tally.with_any++;
    if (isCoreComplete(rec.demand)) tally.core_complete++;
    results.push(JSON.stringify({ lead_id: it.id, source: it.origin, status: rec.status, demand: rec.demand }));
    lines.push(...labelRows(it.id, rec.demand, redactForModel(it.inquiry, it.leadName)));
  }
  writeFileSync(resolve(dir, "results.jsonl"), results.join("\n") + "\n");
  writeFileSync(resolve(dir, "labels.csv"), lines.join("\n") + "\n");
  if (input) writeFileSync(resolve(dir, "sources.csv"), sources.join("\n") + "\n");
  writeFileSync(resolve(dir, "summary.json"), JSON.stringify(tally, null, 2) + "\n");
  console.log(JSON.stringify({ run_dir: dir, ...tally }, null, 2));
}

function score() {
  const file = process.argv[3];
  if (!file) throw new Error("usage: score <labels.csv>");
  const report = scoreLabels(readFileSync(file, "utf8"));
  const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`);
  const line = (name: string, m: (typeof report)["overall"], extra = "") =>
    console.log(
      [name.padEnd(14), m.labeled, m.correct, m.correct_unknown, m.missed, m.false_value, m.unsupported,
        pct(m.precision), pct(m.recall), pct(m.false_value_rate), extra]
        .map((v) => String(v).padStart(9)).join(" "),
    );
  console.log(["field".padEnd(14), "labeled", "correct", "unk_ok", "missed", "false", "unsupp", "precision", "recall", "false%"]
    .map((v) => String(v).padStart(9)).join(" "));
  for (const [f, m] of Object.entries(report.fields)) line(f, m);
  line("OVERALL", report.overall);
  console.log("\nGATE (precision >= 95 %, false values <= 2 %, unsupported = 0, support >= 10)");
  for (const g of report.gates) line(g.group, g.metrics, `${g.verdict} ${g.reasons.join("; ")}`);
  console.log(`\nVERDICT: ${report.verdict}`);
  process.exitCode = report.verdict === "PASS" ? 0 : 2;
}

const cmd = process.argv[2];
(cmd === "extract" ? extract() : cmd === "score" ? Promise.resolve().then(score) : Promise.reject(new Error("usage: extract | score")))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
