/**
 * Triage eval — Smolko gold outcomes (4 converted inquiries).
 *
 *   npx tsx scripts/eval-triage-smolko-outcomes.ts
 *   npx tsx scripts/eval-triage-smolko-outcomes.ts --live
 *
 * Dataset: docs/eval/eval-dataset-smolko-outcomes.md
 * Records: data/eval/smolko-outcomes-gold.jsonl
 * NEIMPORTOVAŤ do leads — eval only.
 */
import { resolve } from "node:path";
import { triageLeadBatches } from "../src/lib/ai/lead-triage-batch";
import {
  formatEvalReportTable,
  loadSmolkoOutcomeRecords,
  toTriageLeadInput,
  type EvalReportRow,
} from "../src/lib/acquire/smolko-outcomes-eval";

const LIVE = process.argv.includes("--live");
const datasetPath =
  process.argv.find((arg) => arg.startsWith("--dataset="))?.slice("--dataset=".length) ??
  resolve(process.cwd(), "../../data/eval/smolko-outcomes-gold.jsonl");

async function main() {
  const records = loadSmolkoOutcomeRecords(datasetPath);
  const inputs = records.map(toTriageLeadInput);

  if (!LIVE) {
    console.log(
      JSON.stringify(
        {
          eval: "smolko-outcomes-triage",
          mode: "dry-run",
          dataset: datasetPath,
          count: records.length,
          inputs,
          hint: "Run with --live to call triageLeadBatches (requires AI keys).",
        },
        null,
        2,
      ),
    );
    return;
  }

  const triage = await triageLeadBatches(inputs);
  const byId = new Map(triage.map((row) => [row.lead_id, row]));

  const report: EvalReportRow[] = records.map((record) => {
    const row = byId.get(record.id);
    return {
      id: record.id,
      name: record.name,
      intent_signal: record.intent_signal,
      outcome: record.outcome,
      ai_priority: row?.priority ?? "MISSING",
      ai_reason: row?.reason ?? "no triage row",
      converted: true,
    };
  });

  console.log(
    JSON.stringify(
      {
        eval: "smolko-outcomes-triage",
        mode: "live",
        dataset: datasetPath,
        report,
        markdown: formatEvalReportTable(report),
        calibration_note:
          "Palenčár (slaby signal, prenajate) — ak ai_priority=Nízka, triage undervalues weak Bazos copy.",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
