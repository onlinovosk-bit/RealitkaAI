#!/usr/bin/env node
/**
 * measure-prompt-stack.mjs — mechanické meranie promptového STACKU.
 *
 * Dôvod existencie: BASELINE-BENCHMARK-01. Tvrdenie "compiled stack je
 * rýchlejší pri rovnakej kvalite" je nemerateľné, kým rovnaký skript
 * nezmeria old aj compiled variantu. Preto meria SKRIPT, nie agent —
 * agent, ktorý meria vlastnú prácu, je presne tá chyba, ktorá stála AP-025.
 *
 * Meria IBA to, čo sa dá prečítať z artefaktu. Wall-clock, počet reálnych
 * model callov a tokeny skutočne odoslané do modelu tento skript NEVIE
 * a preto ich netvrdí. Tie patria do runtime ledgeru, nie sem.
 *
 * Použitie:
 *   node scripts/ops/measure-prompt-stack.mjs docs/prompts/runner
 *   node scripts/ops/measure-prompt-stack.mjs docs/prompts/runner --json
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename, relative } from "node:path";

const CHARS_PER_TOKEN = 4; // hrubý odhad, nie tokenizer. Pozri poznámku nižšie.
const TOKENS_PER_WORD = 1.3;

function listMarkdown(root) {
  const st = statSync(root);
  if (st.isFile()) return [root];
  return readdirSync(root)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => join(root, f));
}

function measureFile(path) {
  const text = readFileSync(path, "utf8");
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    file: path,
    name: basename(path),
    bytes: Buffer.byteLength(text, "utf8"),
    lines: text.split("\n").length,
    words,
    est_tokens_by_chars: Math.round(text.length / CHARS_PER_TOKEN),
    est_tokens_by_words: Math.round(words * TOKENS_PER_WORD),
    text,
  };
}

/** Vrstvy sa počítajú z textu (S0..Sn), nie z prídavného mena "sedem". */
function measureLayers(files) {
  const stackFile = files.find((f) => /prompt-stack/.test(f.name));
  if (!stackFile) return { found: false };
  const ids = [...new Set(stackFile.text.match(/\bS\d+\b/g) ?? [])].sort(
    (a, b) => Number(a.slice(1)) - Number(b.slice(1))
  );
  // Slovom vyjadrené tvrdenie o počte vrstiev, v celom stacku.
  const words = {
    sedem: 7, seven: 7, osem: 8, eight: 8, šesť: 6, six: 6, deväť: 9, nine: 9,
  };
  const claims = [];
  for (const f of files) {
    for (const [w, n] of Object.entries(words)) {
      const re = new RegExp(`${w}\\s+(?:vrstv|hash|layer)`, "gi");
      const hits = f.text.match(re) ?? [];
      for (const h of hits) claims.push({ file: f.name, claim: h.trim(), claimed_count: n });
    }
  }
  const mismatches = claims.filter((c) => c.claimed_count !== ids.length);
  return { found: true, layer_ids: ids, layer_count: ids.length, claims, mismatches };
}

/** Sériové stage-y: očíslovaný zoznam jednej iterácie v RUNNER.md. */
function measureStages(files) {
  const runner = files.find((f) => /^RUNNER/i.test(f.name));
  if (!runner) return { found: false };
  const stages = [];
  for (const line of runner.text.split("\n")) {
    const m = line.match(/^\s*(\d{1,2})\.\s+([A-ZÁČĎÉÍĽŇÓŠŤÚÝŽ][A-ZÁČĎÉÍĽŇÓŠŤÚÝŽ +\-()0-9]+?)\s{2,}(\d{2})\s/);
    if (m) stages.push({ n: Number(m[1]), stage: m[2].trim(), layer: m[3] });
  }
  return { found: true, serial_stages: stages.length, stages };
}

const QA_STAGE = /WRITE-PROBE|VALIDATION|JUDGE|MERGE GATE|RE-AUDIT|AUDIT|RECONCILE/;

/** Má stack vôbec pole, ktorým by sa dal čas odmerať? */
function measureTimeInstrumentation(files) {
  const patterns = [
    "wall_clock", "wall-clock", "duration", "elapsed", "started_at",
    "finished_at", "latency", "tokens_in", "tokens_out", "model_calls",
  ];
  const hits = [];
  for (const f of files) {
    for (const p of patterns) {
      const c = (f.text.match(new RegExp(p.replace(/[-_]/g, "[-_]"), "gi")) ?? []).length;
      if (c) hits.push({ file: f.name, field: p, count: c });
    }
  }
  return { patterns_searched: patterns.length, hits, instrumented: hits.length > 0 };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const root = args.find((a) => !a.startsWith("--"));
  if (!root) {
    console.error("usage: measure-prompt-stack.mjs <dir|file> [--json]");
    process.exit(2);
  }
  const files = listMarkdown(root).map(measureFile);
  const sum = (k) => files.reduce((a, f) => a + f[k], 0);

  const layers = measureLayers(files);
  const stages = measureStages(files);
  const time = measureTimeInstrumentation(files);

  const report = {
    stack: relative(process.cwd(), root) || root,
    measured_at: new Date().toISOString(),
    method: {
      est_tokens_by_chars: `chars / ${CHARS_PER_TOKEN}`,
      est_tokens_by_words: `words * ${TOKENS_PER_WORD}`,
      note: "ODHAD, nie tokenizer. Dve nezávisle metódy sú tu preto, aby bol vidieť rozptyl.",
    },
    totals: {
      files: files.length,
      lines: sum("lines"),
      bytes: sum("bytes"),
      words: sum("words"),
      est_tokens_by_chars: sum("est_tokens_by_chars"),
      est_tokens_by_words: sum("est_tokens_by_words"),
    },
    layers,
    stages: stages.found
      ? {
          serial_stages: stages.serial_stages,
          qa_stages: stages.stages.filter((s) => QA_STAGE.test(s.stage)).map((s) => s.stage),
          list: stages.stages,
        }
      : stages,
    time_instrumentation: time,
    per_file: files.map(({ text, ...rest }) => rest),
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`STACK: ${report.stack}`);
  console.log(`súbory ${report.totals.files} · riadky ${report.totals.lines} · bajty ${report.totals.bytes}`);
  console.log(
    `odhad tokenov: ${report.totals.est_tokens_by_chars} (chars/4) · ${report.totals.est_tokens_by_words} (words*1.3)`
  );
  if (layers.found) {
    console.log(`vrstvy v texte: ${layers.layer_count} (${layers.layer_ids.join(" ")})`);
    for (const m of layers.mismatches) {
      console.log(`  ! NESÚLAD ${m.file}: "${m.claim}" tvrdí ${m.claimed_count}, v texte je ${layers.layer_count}`);
    }
  }
  if (stages.found) {
    console.log(`sériové stage-y jednej iterácie: ${report.stages.serial_stages}`);
    console.log(`z toho QA/brány: ${report.stages.qa_stages.length} (${report.stages.qa_stages.join(", ")})`);
  }
  console.log(
    `časová instrumentácia: ${time.instrumented ? "ÁNO" : "ŽIADNA"} (hľadaných polí: ${time.patterns_searched})`
  );
  for (const h of time.hits) console.log(`  ${h.file}: ${h.field} x${h.count}`);
  console.log("\nper-file:");
  for (const f of report.per_file) {
    console.log(
      `  ${f.name.padEnd(26)} ${String(f.lines).padStart(4)} r · ${String(f.bytes).padStart(6)} B · ~${f.est_tokens_by_chars} tok`
    );
  }
}

main();
